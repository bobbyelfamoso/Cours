import { collection, addDoc, query, where, getDocs, serverTimestamp, doc, deleteDoc, Timestamp, writeBatch, getDoc, updateDoc, getCountFromServer } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { Flashcard, Deck, Folder } from '../types';

const DECKS_COLLECTION = 'decks1';
const FOLDERS_COLLECTION = 'folders1';
const FOLDER_LIMIT = 50;
const DECK_LIMIT_PER_FOLDER = 75;

// --- Fonctions de comptage ---

async function countUserFolders(userId: string): Promise<number> {
    const q = query(collection(db, FOLDERS_COLLECTION), where("userId", "==", userId));
    const snapshot = await getCountFromServer(q);
    return snapshot.data().count;
}

async function countDecksInFolder(userId: string, folderId: string | null): Promise<number> {
    const q = query(collection(db, DECKS_COLLECTION), where("userId", "==", userId), where("folderId", "==", folderId));
    const snapshot = await getCountFromServer(q);
    return snapshot.data().count;
}


// Save a new deck to Firestore for the current user
export async function saveDeck(topic: string, cards: Flashcard[], folderId: string | null): Promise<Deck> {
  const user = auth.currentUser;
  if (!user) throw new Error('User not authenticated');

  const deckCount = await countDecksInFolder(user.uid, folderId);
  if (deckCount >= DECK_LIMIT_PER_FOLDER) {
      throw new Error(`Limite de ${DECK_LIMIT_PER_FOLDER} paquets atteinte dans ce dossier.`);
  }

  const deckData = {
    userId: user.uid,
    topic,
    cards,
    createdAt: serverTimestamp(),
    folderId,
    isFavorite: false,
  };

  const docRef = await addDoc(collection(db, DECKS_COLLECTION), deckData);
  
  return {
      ...deckData,
      id: docRef.id,
      createdAt: Timestamp.now()
  } as Deck;
}

// Create a new folder
export async function createFolder(name: string, parentId: string | null): Promise<Folder> {
    const user = auth.currentUser;
    if (!user) throw new Error('User not authenticated');

    const folderCount = await countUserFolders(user.uid);
    if (folderCount >= FOLDER_LIMIT) {
        throw new Error(`Limite de ${FOLDER_LIMIT} dossiers atteinte. Impossible d'en créer un nouveau.`);
    }

    const folderData = {
        userId: user.uid,
        name,
        parentId,
        createdAt: serverTimestamp(),
        isFavorite: false,
    };

    const docRef = await addDoc(collection(db, FOLDERS_COLLECTION), folderData);

    return {
        ...folderData,
        id: docRef.id,
        createdAt: Timestamp.now()
    } as Folder;
}

// Get all folders and decks within a specific folder (or root)
export async function getFolderContents(folderId: string | null): Promise<{ folders: Folder[], decks: Deck[] }> {
    const user = auth.currentUser;
    if (!user) return { folders: [], decks: [] };

    // Get subfolders without server-side sorting
    const folderQuery = query(
        collection(db, FOLDERS_COLLECTION),
        where('userId', '==', user.uid),
        where('parentId', '==', folderId)
    );
    const folderSnapshot = await getDocs(folderQuery);
    let folders = folderSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Folder[];

    // Get decks in the folder without server-side sorting
    const deckQuery = query(
        collection(db, DECKS_COLLECTION),
        where('userId', '==', user.uid),
        where('folderId', '==', folderId)
    );
    const deckSnapshot = await getDocs(deckQuery);
    let decks = deckSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Deck[];
    
    // Perform sorting on the client-side
    folders.sort((a, b) => {
        if (a.isFavorite !== b.isFavorite) {
            return a.isFavorite ? -1 : 1;
        }
        return a.name.localeCompare(b.name);
    });

    decks.sort((a, b) => {
        if (a.isFavorite !== b.isFavorite) {
            return a.isFavorite ? -1 : 1;
        }
        return a.topic.localeCompare(b.topic);
    });

    return { folders, decks };
}

// Get breadcrumb path for a folder
export async function getPath(folderId: string | null): Promise<Folder[]> {
    if (!folderId) return [];
    let path: Folder[] = [];
    let currentId: string | null = folderId;
    while (currentId) {
        const docRef = doc(db, FOLDERS_COLLECTION, currentId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            const folder = { id: docSnap.id, ...docSnap.data() } as Folder;
            path.unshift(folder);
            currentId = folder.parentId;
        } else {
            break;
        }
    }
    return path;
}


// Delete a deck
export async function deleteDeck(deckId: string): Promise<void> {
    const deckRef = doc(db, DECKS_COLLECTION, deckId);
    await deleteDoc(deckRef);
}

// Delete a folder (only if it's empty)
export async function deleteFolder(folderId: string): Promise<void> {
    const { folders, decks } = await getFolderContents(folderId);
    if (folders.length > 0 || decks.length > 0) {
        throw new Error("Le dossier n'est pas vide.");
    }
    const folderRef = doc(db, FOLDERS_COLLECTION, folderId);
    await deleteDoc(folderRef);
}

// Rename a folder or deck
export async function renameItem(id: string, newName: string, type: 'folder' | 'deck'): Promise<void> {
    const collectionName = type === 'folder' ? FOLDERS_COLLECTION : DECKS_COLLECTION;
    const fieldName = type === 'folder' ? 'name' : 'topic';
    const itemRef = doc(db, collectionName, id);
    await updateDoc(itemRef, { [fieldName]: newName });
}

// Toggle favorite status for a folder or deck
export async function toggleFavorite(id: string, currentStatus: boolean, type: 'folder' | 'deck'): Promise<void> {
    const collectionName = type === 'folder' ? FOLDERS_COLLECTION : DECKS_COLLECTION;
    const itemRef = doc(db, collectionName, id);
    await updateDoc(itemRef, { isFavorite: !currentStatus });
}