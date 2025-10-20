import { onCall, HttpsError } from "firebase-functions/v2/https";
import { defineString } from "firebase-functions/params";
import { GoogleGenAI, Type } from "@google/genai";
import * as admin from "firebase-admin";

admin.initializeApp();
const db = admin.firestore();

// --- Configuration ---
const geminiApiKey = defineString("API_KEY");
const API_CALL_LIMIT = 200;
const TIME_WINDOW_MS = 5 * 60 * 60 * 1000; // 5 heures
const LIMITS_COLLECTION = "apiCallLimits";

const responseSchema = {
  type: Type.ARRAY,
  items: {
    type: Type.OBJECT,
    properties: {
      question: { type: Type.STRING },
      answer: { type: Type.STRING },
    },
    required: ["question", "answer"],
  },
};

// --- Logique de Limitation de Taux (Rate Limiting) ---
async function checkAndRecordApiCall(identifier: string) {
  const docRef = db.collection(LIMITS_COLLECTION).doc(identifier);
  const now = Date.now();
  const newExpiry = now + TIME_WINDOW_MS;

  await db.runTransaction(async (transaction) => {
    const doc = await transaction.get(docRef);

    if (!doc.exists) {
      transaction.set(docRef, { count: 1, expires: newExpiry });
      return;
    }

    const data = doc.data();
    if (!data) {
      // Si data est undefined, on crée le document
      transaction.set(docRef, { count: 1, expires: newExpiry });
      return;
    }

    if (now >= data.expires) {
      // Le temps est écoulé, on réinitialise
      transaction.update(docRef, { count: 1, expires: newExpiry });
    } else if (data.count >= API_CALL_LIMIT) {
      // Limite atteinte
      const resetsAt = new Date(data.expires).toLocaleTimeString("fr-FR");
      throw new HttpsError(
        "resource-exhausted",
        `Limite d'appels atteinte. Veuillez réessayer après ${resetsAt}.`,
      );
    } else {
      // On incrémente
      transaction.update(docRef, { count: admin.firestore.FieldValue.increment(1) });
    }
  });
}

// --- Récupération des Instructions Système ---
async function getSystemInstruction(isForFile: boolean, numCards: number): Promise<string> {
  const docId = isForFile ? "systemInstructionForFile" : "systemInstructionForTopic";
  try {
    const docSnap = await db.collection("prompt").doc(docId).get();

    if (!docSnap.exists) {
      console.error(`Prompt document not found: ${docId}`);
      throw new HttpsError("not-found", `Configuration du prompt système introuvable.`);
    }

    const data = docSnap.data();
    // D'après la capture d'écran, le nom du champ est le même que l'ID du document.
    const promptTemplate = data?.[docId] as string;

    if (!promptTemplate || typeof promptTemplate !== "string") {
      console.error(`Invalid prompt field in document: ${docId}`);
      throw new HttpsError("internal", `Format du prompt système incorrect.`);
    }

    // Remplace le placeholder pour le nombre de cartes.
    return promptTemplate.replace(/{{numCards}}/g, String(numCards));
  } catch (error) {
    console.error(`Error fetching system instruction '${docId}':`, error);
    if (error instanceof HttpsError) {
      throw error;
    }
    // FIX: Corrected typo from HpsError to HttpsError.
    throw new HttpsError("internal", "Impossible de récupérer le prompt système.");
  }
}


// --- Cloud Function Principale ---
export const generateFlashcards = onCall(async (request) => {
  const ai = new GoogleGenAI({ apiKey: geminiApiKey.value() });

  // Gérer l'identification pour les utilisateurs et les invités
  const userId = request.auth?.uid;
  const guestId = request.data.guestId as string | undefined;

  if (!userId && !guestId) {
    throw new HttpsError("unauthenticated", "Identification requise.");
  }
  const identifier = userId || guestId as string;

  // Valider les données d'entrée
  const { topic, numCards, file } = request.data as {
    topic: string,
    numCards: number,
    file?: { mimeType: string; data: string },
    guestId?: string,
  };

  if ((!topic || typeof topic !== "string" || topic.trim() === "") && !file) {
    throw new HttpsError("invalid-argument", "Un sujet ou un fichier est requis.");
  }
  if (typeof numCards !== "number" || numCards < 1 || numCards > 25) {
    throw new HttpsError("invalid-argument", "Le nombre de cartes doit être entre 1 et 25.");
  }

  // Appliquer la limitation de taux
  await checkAndRecordApiCall(identifier);

  // Récupérer le prompt depuis Firestore
  const systemInstruction = await getSystemInstruction(!!file, numCards);

  // Construire la requête pour Gemini
  const parts: object[] = [];
  if (topic.trim()) {
    parts.push({ text: `Le sujet est : "${topic}".` });
  }
  if (file?.mimeType && file?.data) {
    parts.push({ inlineData: { mimeType: file.mimeType, data: file.data } });
  }

  // Appeler l'API Gemini
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-pro",
      contents: { parts },
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: responseSchema,
        temperature: 0.7,
      },
    });

    const responseText = response.text;
    if (!responseText) {
      throw new HttpsError("internal", "L'IA a retourné une réponse vide.");
    }
    const flashcards = JSON.parse(responseText.trim());
    return { flashcards };
  } catch (error) {
    console.error("Erreur Gemini:", error);
    if (error instanceof HttpsError) throw error; // Relancer les erreurs Https
    throw new HttpsError("internal", "Erreur lors de la génération des flashcards.");
  }
});
