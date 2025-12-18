
// Represents a single flashcard within a deck
export interface Flashcard {
  question: string;
  answer: string;
}

// Represents a flashcard during a study session
export interface StudyFlashcard extends Flashcard {
    id: number; // Unique ID for the session
    score: number;
}

// Represents a deck of flashcards stored in Firestore
export interface Deck {
  id: string; // Document ID from Firestore
  userId: string;
  topic: string;
  cards: Flashcard[];
  createdAt: any; // Can be Timestamp or ServerTimestamp
  folderId: string | null;
  isFavorite: boolean;
}

// Represents a folder to organize decks
export interface Folder {
    id: string;
    userId: string;
    name: string;
    parentId: string | null;
    createdAt: any; // Can be Timestamp or ServerTimestamp
    isFavorite: boolean;
}

export enum AppState {
  LOADING,
  AUTH,
  DECKS,
  SETUP,
  STUDYING,
}
