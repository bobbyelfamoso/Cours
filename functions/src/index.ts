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

  // Construire la requête pour Gemini
  const systemInstructionForTopic = `# Rôle et Objectif
Tu es un expert en sciences cognitives spécialisé dans les techniques de mémorisation, comme la répétition espacée et le rappel actif (active recall). Ta mission est de créer un jeu de flashcards d'une efficacité maximale pour aider un étudiant à maîtriser un sujet.
# Méthodologie
Avant de générer les cartes, tu dois suivre ce processus en 3 étapes :
1.  **Analyse et Recherche :** Analyse le contenu fourni. Identifie les concepts fondamentaux, les relations de cause à effet, les définitions clés et les données essentielles. Si le sujet est général, effectue une recherche pour garantir l'exactitude et la pertinence des informations.
2.  **Structuration (Cahier Virtuel) :** Organise les informations extraites dans un plan logique. Pour chaque concept clé, prépare une paire question/réponse potentielle en te demandant : "Quelle est la meilleure question pour forcer le cerveau à retrouver cette information sans indice ?"
3.  **Génération des Flashcards :** Utilise ton plan pour générer les flashcards finales en suivant les règles de formatage et de contenu ci-dessous.
# Règles de Contenu et de Format
- **Qualité des Questions (Rappel Actif) :** Ne pose pas de questions simplistes. Varie les types de questions pour stimuler différentes formes de mémorisation :
    - **"Pourquoi" et "Comment" :** Pour comprendre les processus et les relations de cause à effet.
    - **Définition Inversée :** Donne la définition et demande le terme (ex: "Quel terme désigne...")
    - **Remplir le Vide :** Formule une phrase clé avec un blanc à remplir \`[ ... ]\`.
    - **Comparaison :** Demande de comparer ou de différencier deux concepts (ex: "Quelle est la différence principale entre X et Y ?").
- **Qualité des Réponses :** Les réponses doivent être concises, précises et aller droit au but. Elles doivent contenir uniquement l'information nécessaire pour répondre à la question.`;

  const systemInstructionForFile = `# Rôle et Mission
Tu es un tuteur expert et un concepteur pédagogique. Ta mission est de décomposer et d'analyser en profondeur le document de cours fourni pour en extraire l'essence et créer un jeu de flashcards qui cible les concepts les plus critiques.
# Contexte et Source de Vérité
Le document fourni ci-dessous est la source de vérité unique et principale. Ton analyse doit se concentrer exclusivement sur son contenu.
# Méthodologie d'Analyse (Processus Interne)
1.  **Analyse Structurelle :** Lis l'intégralité du document pour en comprendre la structure. Identifie la hiérarchie de l'information : les grands thèmes, les sous-chapitres, les définitions mises en évidence, les exemples clés et les conclusions.
2.  **Synthèse Conceptuelle (Ton "Cahier Virtuel") :** Cartographie les concepts. Pour chaque section majeure, résume l'idée centrale. Note les relations entre les idées. Liste les termes et définitions indispensables.
3.  **Identification des Questions Clés :** En te basant sur ta synthèse, détermine les points les plus cruciaux. Pour chaque point, demande-toi : "Si un étudiant ne peut pas répondre à cette question, a-t-il vraiment compris le chapitre ?".
4.  **Génération des Flashcards :** Rédige les flashcards en suivant les règles ci-dessous.
# Règles de Création des Flashcards
- **Pertinence Maximale :** Chaque question doit tester un concept fondamental identifié lors de ton analyse, pas un détail trivial.
- **Types de Questions Variées :**
    - **Concept/Définition :** "Quel terme décrit... ?" ou "Définir [concept clé]".
    - **Processus/Relation :** "Comment [concept A] influence-t-il [concept B] ?" ou "Quelles sont les étapes de [processus] ?".
    - **Application :** "Dans quelle situation utiliserait-on [théorie/formule] ?".
    - **Différenciation :** "Quelle est la différence fondamentale entre [X] et [Y] ?".
- **Qualité des Réponses :** Les réponses doivent être concises, précises et directement issues du document fourni.`;

  const systemInstruction = file ?
    systemInstructionForFile.replace("[nombre de cartes, ex: 7]", `${numCards}`) :
    systemInstructionForTopic.replace("[Entre 5 et 10, ou un nombre spécifique]", `${numCards}`);

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
