
import React, { useState, useEffect, useCallback } from 'react';
import { Deck, Folder } from '../types';
import { getFolderContents, createFolder, getPath, deleteDeck, deleteFolder, renameItem, toggleFavorite } from '../services/firestoreService';
import { getGuestDecks, deleteGuestDeck } from '../services/localStorageService';
import { FolderIcon, PlusIcon, StarIcon, MoreHorizontalIcon, TrashIcon } from './Icons';
import { ConfirmationModal, RenameModal } from './Modal';

interface DecksViewProps {
  onStartSetup: (folderId: string | null) => void;
  onStartStudy: (deck: Deck) => void;
  isGuest: boolean;
}

const DecksView: React.FC<DecksViewProps> = ({ onStartSetup, onStartStudy, isGuest }) => {
    const [folders, setFolders] = useState<Folder[]>([]);
    const [decks, setDecks] = useState<Deck[]>([]);
    const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
    const [path, setPath] = useState<Folder[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [showNewFolderInput, setShowNewFolderInput] = useState(false);
    const [newFolderName, setNewFolderName] = useState("");
    
    const [modalState, setModalState] = useState<{
        type: 'delete' | 'rename' | null;
        item?: { id: string; name: string; type: 'folder' | 'deck' };
    }>({ type: null });

    const loadContents = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        if (isGuest) {
            setDecks(getGuestDecks());
            setFolders([]);
            setPath([]);
            setIsLoading(false);
            return;
        }
        try {
            const [{ folders, decks }, path] = await Promise.all([
                getFolderContents(currentFolderId),
                getPath(currentFolderId)
            ]);
            setFolders(folders);
            setDecks(decks);
            setPath(path);
        } catch (err) {
            console.error(err);
            if (err instanceof Error && (err.message.includes('firestore/failed-precondition') || err.message.includes('needs an index'))) {
                setError("Configuration de la base de données requise. Ouvrez la console du navigateur (F12), trouvez l'erreur Firestore et cliquez sur le lien pour créer l'index manquant.");
            } else {
                setError("Impossible de charger les données.");
            }
        } finally {
            setIsLoading(false);
        }
    }, [currentFolderId, isGuest]);

    useEffect(() => {
        loadContents();
    }, [loadContents]);

    const handleCreateFolder = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newFolderName.trim()) return;
        try {
            await createFolder(newFolderName, currentFolderId);
            setNewFolderName("");
            setShowNewFolderInput(false);
            loadContents();
        } catch (error) {
            console.error("Error creating folder:", error);
            setError(error instanceof Error ? error.message : "Impossible de créer le dossier.");
        }
    };

    const openDeleteModal = (item: { id: string; name: string; type: 'folder' | 'deck' }) => {
        setModalState({ type: 'delete', item });
    };

    const confirmDelete = async () => {
        if (!modalState.item) return;
        const { id, type } = modalState.item;
        
        try {
            if (isGuest) {
                if (type === 'deck') {
                    deleteGuestDeck(id);
                }
            } else {
                if (type === 'deck') {
                    await deleteDeck(id);
                } else {
                    await deleteFolder(id);
                }
            }
            loadContents();
        } catch (error) {
            console.error(`Error deleting ${type}:`, error);
            setError(error instanceof Error ? error.message : `Impossible de supprimer l'élément.`);
        } finally {
            closeModal();
        }
    };

    const openRenameModal = (item: { id: string; name: string; type: 'folder' | 'deck' }) => {
        setModalState({ type: 'rename', item });
    };

    const confirmRename = async (newName: string) => {
        if (!modalState.item) return;
        const { id, type, name: currentName } = modalState.item;

        if (newName && newName.trim() !== "" && newName !== currentName) {
            try {
                await renameItem(id, newName, type);
                loadContents();
            } catch (error) {
                console.error("Error renaming:", error);
                setError("Impossible de renommer l'élément.");
            }
        }
        closeModal();
    };
    
    const closeModal = () => {
        setModalState({ type: null });
    };
    
    const handleToggleFavorite = async (id: string, currentStatus: boolean, type: 'folder' | 'deck') => {
        try {
            await toggleFavorite(id, currentStatus, type);
            loadContents();
        } catch (error) {
            console.error("Error toggling favorite:", error);
            setError("Impossible de changer le statut de favori.");
        }
    };

    const renderBreadcrumbs = () => (
        <nav className="flex items-center text-sm text-slate-400 mb-4">
            <button onClick={() => setCurrentFolderId(null)} className="hover:text-cyan-400">Accueil</button>
            {path.map(folder => (
                <React.Fragment key={folder.id}>
                    <span className="mx-2">/</span>
                    <button onClick={() => setCurrentFolderId(folder.id)} className="hover:text-cyan-400">{folder.name}</button>
                </React.Fragment>
            ))}
        </nav>
    );
    
    const currentFolderName = path.length > 0 ? path[path.length - 1].name : "Mes Paquets";

    if (isGuest) {
        return (
            <div className="w-full">
                 <div className="flex justify-between items-center mb-6">
                    <h1 className="text-3xl font-bold">Mes Paquets (Invité)</h1>
                    <button
                        onClick={() => onStartSetup(null)}
                        className="flex items-center justify-center gap-2 py-2 px-4 bg-cyan-600 hover:bg-cyan-700 text-white font-bold rounded-md transition-colors shadow-lg"
                    >
                        <PlusIcon className="w-5 h-5" />
                        Nouveau Paquet
                    </button>
                </div>

                {isLoading && <div className="text-center p-8">Chargement...</div>}

                {!isLoading && decks.length === 0 && (
                    <div className="text-center p-8 border-2 border-dashed border-slate-700 rounded-lg">
                        <p className="text-slate-400">Vous n'avez aucun paquet sauvegardé localement.</p>
                        <p className="text-slate-500 text-sm mt-2">Créez un nouveau paquet pour commencer.</p>
                    </div>
                )}
            
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {decks.map(deck => (
                        <div key={deck.id} className="group relative bg-slate-800 p-4 rounded-lg border border-slate-700 hover:border-cyan-500 transition-all flex flex-col justify-between">
                            <div>
                                <h3 className="font-bold text-xl mb-2">{deck.topic}</h3>
                                <p className="text-sm text-slate-400">{deck.cards.length} cartes</p>
                            </div>
                            <div className="mt-4 flex justify-between items-center">
                                <button onClick={() => onStartStudy(deck)} className="py-2 px-5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-md transition-colors text-sm">
                                    Étudier
                                </button>
                                <button onClick={() => openDeleteModal({ id: deck.id, name: deck.topic, type: 'deck' })} className="p-1 text-slate-500 hover:text-red-400 transition-colors">
                                     <TrashIcon className="w-5 h-5"/>
                                </button>
                            </div>
                        </div>
                    ))}
                </div>

                 <ConfirmationModal
                    isOpen={modalState.type === 'delete'}
                    onClose={closeModal}
                    onConfirm={confirmDelete}
                    title="Supprimer le paquet"
                    message={`Êtes-vous sûr de vouloir supprimer "${modalState.item?.name}" ? Cette action est irréversible.`}
                    confirmText="Supprimer"
                />
            </div>
        )
    }

    return (
        <div className="w-full">
            {error && <div className="p-4 mb-4 text-sm text-red-200 bg-red-900/50 rounded-lg border border-red-800" role="alert">{error}</div>}

            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold">{currentFolderName}</h1>
                <div className="flex gap-2">
                     {!showNewFolderInput ? (
                        <button onClick={() => setShowNewFolderInput(true)} className="flex items-center gap-2 py-2 px-4 bg-slate-700 hover:bg-slate-600 font-semibold rounded-md transition-colors">
                           <FolderIcon className="w-5 h-5" /> Dossier
                        </button>
                    ) : (
                        <form onSubmit={handleCreateFolder} className="flex gap-2">
                            <input
                                type="text"
                                value={newFolderName}
                                onChange={(e) => setNewFolderName(e.target.value)}
                                placeholder="Nom du dossier"
                                className="px-4 py-2 bg-slate-800 border border-slate-600 rounded-md focus:ring-2 focus:ring-cyan-500 outline-none"
                                autoFocus
                                onBlur={() => { if(!newFolderName) setShowNewFolderInput(false); }}
                            />
                            <button type="submit" className="py-2 px-4 bg-cyan-600 hover:bg-cyan-700 rounded-md">Créer</button>
                        </form>
                    )}
                    <button
                        onClick={() => onStartSetup(currentFolderId)}
                        className="flex items-center justify-center gap-2 py-2 px-4 bg-cyan-600 hover:bg-cyan-700 text-white font-bold rounded-md transition-colors shadow-lg"
                    >
                        <PlusIcon className="w-5 h-5" />
                        Nouveau Paquet
                    </button>
                </div>
            </div>

            {renderBreadcrumbs()}

            {isLoading && <div className="text-center p-8">Chargement du contenu...</div>}

            {!isLoading && !error && folders.length === 0 && decks.length === 0 && (
                <div className="text-center p-8 border-2 border-dashed border-slate-700 rounded-lg">
                    <p className="text-slate-400">Ce dossier est vide.</p>
                    <p className="text-slate-500 text-sm mt-2">Créez un nouveau paquet ou un dossier pour commencer.</p>
                </div>
            )}
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {folders.map(folder => (
                    <div key={folder.id} className="group relative bg-slate-800 p-4 rounded-lg border border-slate-700 hover:border-cyan-500 transition-all flex items-center gap-4 cursor-pointer" onClick={() => setCurrentFolderId(folder.id)}>
                        <FolderIcon className="w-8 h-8 text-cyan-400" />
                        <div className="flex-grow">
                            <p className="font-semibold text-lg">{folder.name}</p>
                        </div>
                        <ItemActions item={folder} type="folder" onToggleFavorite={handleToggleFavorite} onRename={() => openRenameModal({ id: folder.id, name: folder.name, type: 'folder' })} onDelete={() => openDeleteModal({ id: folder.id, name: folder.name, type: 'folder' })} />
                    </div>
                ))}
                {decks.map(deck => (
                    <div key={deck.id} className="group relative bg-slate-800 p-4 rounded-lg border border-slate-700 hover:border-cyan-500 transition-all flex flex-col justify-between">
                        <div>
                            <h3 className="font-bold text-xl mb-2">{deck.topic}</h3>
                            <p className="text-sm text-slate-400">{deck.cards.length} cartes</p>
                        </div>
                         <div className="mt-4 flex justify-between items-center">
                            <button onClick={() => onStartStudy(deck)} className="py-2 px-5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-md transition-colors text-sm">
                                Étudier
                            </button>
                             <ItemActions item={deck} type="deck" onToggleFavorite={handleToggleFavorite} onRename={() => openRenameModal({ id: deck.id, name: deck.topic, type: 'deck' })} onDelete={() => openDeleteModal({ id: deck.id, name: deck.topic, type: 'deck' })} />
                        </div>
                    </div>
                ))}
            </div>

             <ConfirmationModal
                isOpen={modalState.type === 'delete'}
                onClose={closeModal}
                onConfirm={confirmDelete}
                title={`Supprimer ${modalState.item?.type === 'folder' ? 'le dossier' : 'le paquet'}`}
                message={`Êtes-vous sûr de vouloir supprimer "${modalState.item?.name}" ? ${modalState.item?.type === 'folder' ? 'Le dossier doit être vide.' : ''} Cette action est irréversible.`}
                confirmText="Supprimer"
            />
            
            <RenameModal
                isOpen={modalState.type === 'rename'}
                onClose={closeModal}
                onConfirm={confirmRename}
                title={`Renommer ${modalState.item?.type === 'folder' ? 'le dossier' : 'le paquet'}`}
                initialValue={modalState.item?.name || ''}
            />
        </div>
    );
};

// Subcomponent for item actions (favorite, rename, delete)
const ItemActions = ({ item, type, onToggleFavorite, onRename, onDelete }: {
    item: Folder | Deck;
    type: 'folder' | 'deck';
    onToggleFavorite: (id: string, currentStatus: boolean, type: 'folder' | 'deck') => void;
    onRename: () => void;
    onDelete: () => void;
}) => {
    const [menuOpen, setMenuOpen] = useState(false);
    
    return (
         <div onClick={e => e.stopPropagation()} className="flex items-center">
            <button onClick={() => onToggleFavorite(item.id, item.isFavorite, type)} className={`p-1 transition-colors ${item.isFavorite ? 'text-yellow-400' : 'text-slate-500 hover:text-yellow-400'}`}>
                <StarIcon solid={item.isFavorite} className="w-5 h-5"/>
            </button>
            <div className="relative inline-block">
                <button onClick={() => setMenuOpen(!menuOpen)} className="p-1 text-slate-500 hover:text-slate-200">
                     <MoreHorizontalIcon className="w-5 h-5"/>
                </button>
                {menuOpen && (
                    <div className="absolute right-0 mt-2 w-40 bg-slate-900 border border-slate-700 rounded-md shadow-lg z-10" onMouseLeave={() => setMenuOpen(false)}>
                        <button onClick={() => { onRename(); setMenuOpen(false); }} className="block w-full text-left px-4 py-2 text-sm text-slate-300 hover:bg-slate-800">Renommer</button>
                        <button onClick={() => { onDelete(); setMenuOpen(false); }} className="block w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-slate-800">Supprimer</button>
                    </div>
                )}
            </div>
         </div>
    )
}


export default DecksView;