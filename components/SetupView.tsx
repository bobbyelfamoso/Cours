
import React, { useState } from 'react';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../firebase';
import { saveDeck } from '../services/firestoreService';
import { saveGuestDeck } from '../services/localStorageService';
import { GeneratedFlashcard } from '../types';
import { ArrowLeftIcon, PlusIcon, RefreshIcon, UploadIcon, PencilIcon } from './Icons';
import EditCardModal from './EditCardModal';

interface SetupViewProps {
  onBack: () => void;
  isGuest: boolean;
  folderId: string | null;
}

const TOPIC_MAX_LENGTH = 250;

const SetupView: React.FC<SetupViewProps> = ({ onBack, isGuest, folderId }) => {
    const [topic, setTopic] = useState('');
    const [numCards, setNumCards] = useState(10);
    const [file, setFile] = useState<File | null>(null);
    const [fileName, setFileName] = useState<string | null>(null);

    const [generatedCards, setGeneratedCards] = useState<GeneratedFlashcard[] | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);

    const [editingCardIndex, setEditingCardIndex] = useState<number | null>(null);
    
    const getGuestId = (): string => {
        let guestId = localStorage.getItem('guestId');
        if (!guestId) {
            guestId = `guest_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
            localStorage.setItem('guestId', guestId);
        }
        return guestId;
    };

    const fileToBase64 = (file: File): Promise<string> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => {
                const base64 = (reader.result as string).split(',')[1];
                resolve(base64);
            };
            reader.onerror = (error) => reject(error);
        });
    };

    const handleGenerate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!topic.trim() && !file) {
            setError('Veuillez entrer un sujet ou téléverser un fichier.');
            return;
        }

        setIsLoading(true);
        setError(null);
        setGeneratedCards(null);

        try {
            const generateFlashcards = httpsCallable(functions, 'generateFlashcards');
            
            // Append the number of cards to the topic to make the instruction more explicit.
            const effectiveTopic = topic.trim()
                ? `${topic.trim()}\n\nNombre de cartes demandées : ${numCards}.`
                : topic;

            const params: { topic: string, numCards: number, file?: { mimeType: string, data: string }, guestId?: string } = {
                topic: effectiveTopic,
                numCards,
            };

            if (isGuest) {
                params.guestId = getGuestId();
            }

            if (file) {
                params.file = {
                    mimeType: file.type,
                    data: await fileToBase64(file),
                };
            }
            
            const result = await generateFlashcards(params) as { data: { flashcards: GeneratedFlashcard[] } };
            
            if (result.data.flashcards && result.data.flashcards.length > 0) {
                const limitedCards = result.data.flashcards.slice(0, 25);
                setGeneratedCards(limitedCards);
                if(!topic.trim() && file) {
                    setTopic(`Notes de ${file.name}`);
                }
            } else {
                setError("L'IA n'a retourné aucune carte. Essayez de reformuler votre sujet.");
            }
        } catch (err) {
            console.error(err);
            const firebaseError = err as { code?: string, message?: string };
            setError(firebaseError.message || "Une erreur est survenue lors de la génération des cartes.");
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (selectedFile) {
            if (selectedFile.size > 4 * 1024 * 1024) { // 4MB limit
                setError("La taille du fichier ne doit pas dépasser 4 Mo.");
                return;
            }
            setFile(selectedFile);
            setFileName(selectedFile.name);
        }
    };
    
    const removeFile = () => {
        setFile(null);
        setFileName(null);
        const fileInput = document.getElementById('file-upload') as HTMLInputElement;
        if (fileInput) fileInput.value = '';
    };

    const handleSaveDeck = async () => {
        if (!generatedCards || generatedCards.length === 0 || !topic.trim()) {
            setError("Impossible de sauvegarder un paquet vide ou sans sujet.");
            return;
        }

        setIsSaving(true);
        setError(null);

        try {
            if (isGuest) {
                saveGuestDeck(topic, generatedCards);
            } else {
                await saveDeck(topic, generatedCards, folderId);
            }
            onBack();
        } catch (err) {
            console.error(err);
            setError(err instanceof Error ? err.message : "Une erreur est survenue lors de la sauvegarde.");
            setIsSaving(false);
        }
    };

    const handleUpdateCard = (updatedCard: GeneratedFlashcard) => {
        if (editingCardIndex !== null && generatedCards) {
            const newCards = [...generatedCards];
            newCards[editingCardIndex] = updatedCard;
            setGeneratedCards(newCards);
        }
        setEditingCardIndex(null);
    };

    const handleDeleteCard = () => {
        if (editingCardIndex !== null && generatedCards) {
            const newCards = generatedCards.filter((_, index) => index !== editingCardIndex);
            setGeneratedCards(newCards);
        }
        setEditingCardIndex(null);
    };

    const handleAddNewCard = () => {
        if (generatedCards && generatedCards.length >= 25) {
            setError("La limite de 25 cartes par paquet est atteinte.");
            return;
        }
        setError(null); // Clear previous errors if any
        const newCard: GeneratedFlashcard = { question: 'Nouvelle Question', answer: 'Nouvelle Réponse' };
        const newCards = [...(generatedCards || []), newCard];
        setGeneratedCards(newCards);
        setEditingCardIndex(newCards.length - 1);
    };
    
    const resetSetup = () => {
        setGeneratedCards(null);
        setTopic('');
        setFile(null);
        setFileName(null);
        setError(null);
    };


    if (isLoading) {
        return (
            <div className="text-center p-8 bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full">
                <h2 className="text-2xl font-bold text-pink-500 dark:text-cyan-400 mb-4 animate-pulse">Génération en cours...</h2>
                <p className="text-slate-600 dark:text-slate-300">Votre tuteur IA prépare vos flashcards. Cela peut prendre un moment.</p>
            </div>
        );
    }
    
    if (generatedCards) {
        return (
            <div className="w-full animate-fade-in">
                <div className="flex justify-between items-center mb-6 flex-wrap gap-4">
                    <h2 className="text-3xl font-bold text-slate-900 dark:text-slate-100">Vérifiez vos Flashcards</h2>
                    <div className="flex gap-2">
                        <button onClick={resetSetup} className="flex items-center gap-2 py-2 px-4 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 font-semibold rounded-md transition-colors">
                            <ArrowLeftIcon className="w-5 h-5" />
                            Recommencer
                        </button>
                        <button onClick={handleSaveDeck} disabled={isSaving} className="py-2 px-4 bg-pink-600 hover:bg-pink-700 dark:bg-cyan-600 dark:hover:bg-cyan-700 disabled:bg-slate-400 dark:disabled:bg-slate-600 text-white font-bold rounded-md transition-colors shadow-lg">
                            {isSaving ? 'Sauvegarde...' : `Sauvegarder le Paquet (${generatedCards.length})`}
                        </button>
                    </div>
                </div>
                 <div className="mb-4">
                    <div className="flex justify-between items-baseline mb-2">
                        <label htmlFor="deck-topic" className="block text-sm font-medium text-slate-600 dark:text-slate-300">Sujet du paquet</label>
                        <span className={`text-sm font-mono ${topic.length >= TOPIC_MAX_LENGTH ? 'text-red-500' : 'text-slate-500 dark:text-slate-500'}`}>
                            {topic.length}/{TOPIC_MAX_LENGTH}
                        </span>
                    </div>
                    <input
                        id="deck-topic"
                        type="text"
                        value={topic}
                        onChange={(e) => setTopic(e.target.value)}
                        maxLength={TOPIC_MAX_LENGTH}
                        className="w-full px-4 py-3 bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md placeholder-slate-500 focus:ring-2 focus:ring-pink-500 dark:focus:ring-cyan-500 focus:border-pink-500 dark:focus:border-cyan-500 outline-none transition-all"
                        placeholder="Ex: Capitales du Monde"
                    />
                </div>
                {error && <p className="text-red-500 mb-4 text-sm">{error}</p>}
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {generatedCards.map((card, index) => (
                        <div key={index} className="group relative bg-white dark:bg-slate-800 p-4 rounded-lg border border-slate-200 dark:border-slate-700 flex flex-col justify-between min-h-[150px]">
                            <div>
                                <p className="font-semibold text-slate-800 dark:text-slate-200 mb-2">{card.question}</p>
                                <p className="text-sm text-pink-600 dark:text-cyan-300">{card.answer}</p>
                            </div>
                            <button onClick={() => setEditingCardIndex(index)} className="absolute top-2 right-2 p-2 bg-slate-100/50 dark:bg-slate-900/50 rounded-full text-slate-500 dark:text-slate-400 opacity-0 group-hover:opacity-100 hover:text-slate-900 dark:hover:text-white transition-opacity">
                                <PencilIcon className="w-4 h-4" />
                            </button>
                        </div>
                    ))}
                    <button 
                        onClick={handleAddNewCard} 
                        disabled={generatedCards.length >= 25}
                        className="flex flex-col items-center justify-center p-4 rounded-lg border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-pink-500 dark:hover:border-cyan-500 hover:bg-slate-100/50 dark:hover:bg-slate-800/50 transition-colors text-slate-500 dark:text-slate-400 hover:text-pink-500 dark:hover:text-cyan-400 min-h-[150px] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:border-slate-300 dark:disabled:hover:border-slate-700 disabled:hover:bg-transparent"
                    >
                        <PlusIcon className="w-8 h-8 mb-2" />
                        <span className="font-semibold">Ajouter une carte</span>
                         {generatedCards.length >= 25 && <span className="text-xs text-slate-500 mt-1">(Limite atteinte)</span>}
                    </button>
                </div>
                
                {editingCardIndex !== null && (
                    <EditCardModal
                        card={generatedCards[editingCardIndex]}
                        onSave={handleUpdateCard}
                        onDelete={handleDeleteCard}
                        onCancel={() => setEditingCardIndex(null)}
                    />
                )}
            </div>
        )
    }

    return (
        <div className="w-full max-w-2xl">
            <button onClick={onBack} className="flex items-center gap-2 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition-colors mb-6">
                <ArrowLeftIcon className="w-5 h-5" />
                Retour
            </button>
            <div className="bg-white dark:bg-slate-800 p-8 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-700">
                <h2 className="text-3xl font-bold mb-2">Créer un Paquet de Flashcards</h2>
                <p className="text-slate-500 dark:text-slate-400 mb-6">Décrivez un sujet ou téléversez un document, et laissez l'IA faire le reste.</p>

                <form onSubmit={handleGenerate}>
                    <div className="mb-6">
                        <div className="flex justify-between items-baseline mb-2">
                            <label htmlFor="topic" className="block text-sm font-medium text-slate-600 dark:text-slate-300">
                                Sujet
                            </label>
                             <span className={`text-sm font-mono ${topic.length >= TOPIC_MAX_LENGTH ? 'text-red-500' : 'text-slate-500 dark:text-slate-500'}`}>
                                {topic.length}/{TOPIC_MAX_LENGTH}
                            </span>
                        </div>
                        <textarea
                            id="topic"
                            value={topic}
                            onChange={(e) => setTopic(e.target.value)}
                            maxLength={TOPIC_MAX_LENGTH}
                            className="w-full h-24 px-4 py-3 bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md placeholder-slate-500 focus:ring-2 focus:ring-pink-500 dark:focus:ring-cyan-500 focus:border-pink-500 dark:focus:border-cyan-500 outline-none transition-all"
                            placeholder="Ex: La photosynthèse pour un débutant, les principaux événements de la Révolution française, ou les verbes irréguliers en anglais..."
                        />
                    </div>
                    
                    <div className="text-center text-slate-500 mb-6 font-semibold">OU</div>

                     <div className="mb-6">
                        <label htmlFor="file-upload" className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-2">
                           Téléverser un fichier (PDF, TXT, etc.)
                        </label>
                        <label className={`flex justify-center w-full h-32 px-4 transition bg-slate-100 dark:bg-slate-700 border-2 border-dashed rounded-md appearance-none cursor-pointer hover:border-pink-400 dark:hover:border-cyan-400 focus:outline-none ${file ? 'border-pink-500 dark:border-cyan-500' : 'border-slate-300 dark:border-slate-600'}`}>
                           <span className="flex items-center space-x-2">
                                <UploadIcon className="w-6 h-6 text-slate-500 dark:text-slate-400" />
                                <span className="font-medium text-slate-500 dark:text-slate-400">
                                    {fileName ? fileName : 'Glissez-déposez ou cliquez pour téléverser'}
                                </span>
                           </span>
                           <input id="file-upload" type="file" name="file_upload" className="hidden" onChange={handleFileChange} accept=".pdf,.txt,.md,.docx,.pptx"/>
                        </label>
                        {fileName && <button type="button" onClick={removeFile} className="text-xs text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 mt-2">Retirer le fichier</button>}
                    </div>

                    <div className="mb-8">
                        <label htmlFor="num-cards" className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-2">
                            Nombre de cartes à générer : <span className="font-bold text-pink-600 dark:text-cyan-400">{numCards}</span>
                        </label>
                        <input
                            type="range"
                            id="num-cards"
                            min="1"
                            max="25"
                            value={numCards}
                            onChange={(e) => setNumCards(Number(e.target.value))}
                            className="w-full h-2 bg-slate-200 dark:bg-slate-600 rounded-lg appearance-none cursor-pointer range-thumb"
                        />
                    </div>
                    
                    {error && <p className="text-red-500 mb-4 text-sm">{error}</p>}

                    <button
                        type="submit"
                        disabled={isLoading || (!topic.trim() && !file)}
                        className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-pink-600 hover:bg-pink-700 dark:bg-cyan-600 dark:hover:bg-cyan-700 disabled:bg-slate-400 dark:disabled:bg-slate-600 disabled:cursor-not-allowed text-white font-bold rounded-md transition-colors shadow-lg"
                    >
                        <RefreshIcon className={`w-6 h-6 ${isLoading ? 'animate-spin' : ''}`} />
                        {isLoading ? 'Génération...' : 'Générer les Flashcards'}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default SetupView;