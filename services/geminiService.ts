import { httpsCallable } from 'firebase/functions';
import { functions } from '../firebase';
import { GeneratedFlashcard } from '../types';

// Obtient une référence à la fonction appelable (callable function) déployée sur Firebase.
// Le typage spécifie les données envoyées (<{...}>) et les données attendues en retour (<{...}>).
const generateFlashcardsCallable = httpsCallable<
    { topic: string, image?: { mimeType: string; data: string } }, 
    { flashcards: GeneratedFlashcard[] }
>(functions, 'generateFlashcards');

/**
 * Appelle la Cloud Function backend pour générer des flashcards.
 * @param topic Le sujet pour la génération des flashcards.
 * @param image L'image optionnelle à utiliser comme contexte.
 * @returns Une promesse qui se résout avec un tableau de flashcards générées.
 */
export async function generateFlashcards(topic: string, image?: { mimeType: string; data: string }): Promise<GeneratedFlashcard[]> {
    try {
        console.log("Appel de la Cloud Function Firebase avec le sujet :", topic);
        // Appelle la fonction backend avec les données nécessaires.
        const result = await generateFlashcardsCallable({ topic, image });
        
        // La fonction renvoie un objet `data` qui contient notre payload `flashcards`.
        // Il est bon de vérifier si la propriété attendue existe.
        if (result.data && Array.isArray(result.data.flashcards)) {
            return result.data.flashcards;
        } else {
            // Gérer le cas où la réponse du backend n'est pas dans le format attendu.
            throw new Error("La réponse du backend est invalide ou ne contient pas de flashcards.");
        }

    } catch (error: any) {
        console.error("Erreur lors de l'appel de la Cloud Function 'generateFlashcards':", error);
        
        // Améliorer les messages d'erreur pour l'utilisateur
        let errorMessage = "Une erreur est survenue lors de la communication avec le backend.";
        if (error.code === 'unauthenticated') {
            errorMessage = "Vous devez être connecté pour générer des flashcards.";
        } else if (error.code === 'invalid-argument') {
            errorMessage = "Le sujet fourni est invalide. Veuillez réessayer.";
        } else if (error.message) {
            errorMessage = error.message;
        }

        throw new Error(errorMessage);
    }
}
