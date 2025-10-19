import {onCall, HttpsError} from "firebase-functions/v2/https";
import {defineString} from "firebase-functions/params";
import {GoogleGenAI, Type} from "@google/genai";

// Define the API key as a parameter. Firebase will prompt for its value
// during deployment and store it securely. This is the modern and
// recommended way to handle secrets.
const geminiApiKey = defineString("API_KEY");

// Define the expected JSON schema for the AI's response. This ensures
// the AI returns data in a consistent and predictable format.
const responseSchema = {
  type: Type.ARRAY,
  items: {
    type: Type.OBJECT,
    properties: {
      question: {
        type: Type.STRING,
        description: "La question claire pour le recto de la flashcard.",
      },
      answer: {
        type: Type.STRING,
        description: "La réponse directe pour le verso de la flashcard.",
      },
    },
    required: ["question", "answer"],
  },
};

export const generateFlashcards = onCall(async (request) => {
  // Initialize the GenAI client inside the function using the securely
  // stored API key parameter.
  const ai = new GoogleGenAI({apiKey: geminiApiKey.value()});

  // A crucial security step for callable functions is to check if the
  // user is authenticated.
  if (!request.auth) {
    throw new HttpsError(
        "unauthenticated",
        "Vous devez être connecté pour utiliser cette fonction.",
    );
  }

  // Validate the input data received from the client application.
  const topic = request.data.topic as string;
  const image = request.data.image as {
    mimeType: string;
    data: string;
  } | undefined;

  const isTopicInvalid = !topic || typeof topic !== "string" ||
    topic.trim() === "";
  if (isTopicInvalid) {
    throw new HttpsError(
        "invalid-argument",
        "Un sujet (topic) valide est requis pour la génération.",
    );
  }

  // Construct the prompt for the Gemini model with clear instructions.
  const prompt =
    `Génère 5 à 10 flashcards sur le sujet suivant : "${topic}". ` +
    "Chaque flashcard doit avoir une \"question\" claire et une " +
    "\"réponse\" concise.";

  // Prepare the content parts for the API request. If an image is
  // provided, it is added to the request payload.
  const contentParts: object[] = [{text: prompt}];
  if (image?.mimeType && image?.data) {
    contentParts.unshift({
      inlineData: {
        mimeType: image.mimeType,
        data: image.data,
      },
    });
  }

  try {
    // Call the Gemini API, forcing a JSON response using the schema.
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: {parts: contentParts},
      config: {
        responseMimeType: "application/json",
        responseSchema: responseSchema,
        temperature: 0.7,
      },
    });

    // Securely get and validate the response text from the AI.
    const responseText = response.text;
    if (!responseText) {
      throw new HttpsError("internal", "L'IA a retourné une réponse vide.");
    }

    // Parse the JSON response from the model.
    const flashcards = JSON.parse(responseText.trim());

    // Return the generated flashcards to the client application.
    return {flashcards};
  } catch (error) {
    console.error("Erreur lors de la génération avec Gemini:", error);
    // Provide a generic but informative error back to the client.
    throw new HttpsError(
        "internal",
        "Une erreur est survenue lors de la génération des flashcards.",
    );
  }
});
