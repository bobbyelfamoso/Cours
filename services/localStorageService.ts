import { Deck, Flashcard } from '../types';

const GUEST_DECKS_KEY = 'guestDecks';
const GUEST_DECK_LIMIT = 75;

/**
 * Récupère les paquets de l'invité depuis le localStorage.
 * @returns Un tableau de paquets.
 */
export function getGuestDecks(): Deck[] {
    try {
        const storedDecks = localStorage.getItem(GUEST_DECKS_KEY);
        if (storedDecks) {
            // Analyse le JSON et convertit les chaînes de date en objets Date
            const decks = (JSON.parse(storedDecks) as Deck[]).map(deck => ({
                ...deck,
                createdAt: deck.createdAt ? new Date(deck.createdAt) : new Date()
            }));
            // Trie par date de création, du plus récent au plus ancien
            return decks.sort((a, b) => (b.createdAt.getTime()) - (a.createdAt.getTime()));
        }
        return [];
    } catch (error) {
        console.error("Erreur lors de la récupération des paquets invités depuis localStorage", error);
        return [];
    }
}

/**
 * Sauvegarde un nouveau paquet pour l'invité dans le localStorage.
 * @param topic Le sujet du paquet.
 * @param cards Les flashcards du paquet.
 * @returns Le nouveau paquet créé.
 */
export function saveGuestDeck(topic: string, cards: Flashcard[]): Deck {
    const existingDecks = getGuestDecks();

    if (existingDecks.length >= GUEST_DECK_LIMIT) {
        throw new Error(`Limite de ${GUEST_DECK_LIMIT} paquets atteinte pour le mode invité.`);
    }

    const newDeck: Deck = {
        id: `guest_${Date.now()}`, // ID unique simple
        userId: 'guest',
        topic,
        cards,
        createdAt: new Date(), // Utilise un objet Date JS
        folderId: null,
        isFavorite: false,
    };

    const updatedDecks = [...existingDecks, newDeck];

    try {
        localStorage.setItem(GUEST_DECKS_KEY, JSON.stringify(updatedDecks));
        return newDeck;
    } catch (error) {
        console.error("Erreur lors de la sauvegarde du paquet invité dans localStorage", error);
        throw new Error("Impossible de sauvegarder le paquet invité.");
    }
}

/**
 * Supprime un paquet de l'invité du localStorage.
 * @param deckId L'ID du paquet à supprimer.
 */
export function deleteGuestDeck(deckId: string): void {
    const existingDecks = getGuestDecks();
    const updatedDecks = existingDecks.filter(deck => deck.id !== deckId);

    try {
        localStorage.setItem(GUEST_DECKS_KEY, JSON.stringify(updatedDecks));
    } catch (error) {
        console.error("Erreur lors de la suppression du paquet invité depuis localStorage", error);
        throw new Error("Impossible de supprimer le paquet invité.");
    }
}