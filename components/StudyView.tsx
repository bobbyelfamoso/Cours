import React, { useState, useEffect, useMemo } from 'react';
import { Deck, StudyFlashcard } from '../types';
import Flashcard from './Flashcard';
import { CheckIcon, XIcon, ArrowLeftIcon } from './Icons';

interface StudyViewProps {
  deck: Deck;
  onFinish: () => void;
}

const COMPLETION_SCORE = 3;

const StudyView: React.FC<StudyViewProps> = ({ deck, onFinish }) => {
  const [flashcards, setFlashcards] = useState<StudyFlashcard[]>(() => 
    deck.cards.map((card, index) => ({
      ...card,
      id: index, // Simple unique ID for the session
      score: 0,
    }))
  );
  const [currentCardIndex, setCurrentCardIndex] = useState<number | null>(null);
  const [isFlipped, setIsFlipped] = useState(false);

  const studyDeck = useMemo(() => {
    return flashcards
      .map((card, index) => ({ ...card, originalIndex: index }))
      .filter(card => card.score < COMPLETION_SCORE);
  }, [flashcards]);

  const masteredCount = useMemo(() => {
    return flashcards.filter(card => card.score >= COMPLETION_SCORE).length;
  }, [flashcards]);

  useEffect(() => {
    if (studyDeck.length > 0) {
      const randomIndex = Math.floor(Math.random() * studyDeck.length);
      setCurrentCardIndex(studyDeck[randomIndex].originalIndex);
    } else {
      setCurrentCardIndex(null);
    }
  }, [flashcards]);

  const handleAnswer = (isCorrect: boolean) => {
    if (currentCardIndex === null) return;
    
    setIsFlipped(false);

    // Use a timeout to allow the flip animation to start before the card content changes
    setTimeout(() => {
        setFlashcards(prev => prev.map((card, index) => {
          if (index === currentCardIndex) {
            return {
              ...card,
              score: isCorrect ? Math.min(COMPLETION_SCORE, card.score + 1) : 0
            };
          }
          return card;
        }));
    }, 250); 
  };

  if (currentCardIndex === null) {
    return (
      <div className="text-center p-8 bg-slate-800 rounded-lg shadow-xl border border-slate-700">
        <h2 className="text-3xl font-bold text-green-400 mb-4">Félicitations !</h2>
        <p className="text-slate-300 mb-6">Vous avez maîtrisé toutes les cartes pour le sujet : "{deck.topic}".</p>
        <button
          onClick={onFinish}
          className="flex items-center justify-center gap-2 mx-auto px-6 py-3 bg-indigo-600 rounded-md hover:bg-indigo-700 transition-colors"
        >
          <ArrowLeftIcon className="w-5 h-5" />
          Terminer la session
        </button>
      </div>
    );
  }

  const currentCard = flashcards[currentCardIndex];
  const progressPercentage = (masteredCount / flashcards.length) * 100;

  return (
    <div className="w-full">
        <button onClick={onFinish} className="flex items-center gap-2 text-slate-400 hover:text-slate-200 transition-colors mb-4">
            <ArrowLeftIcon className="w-5 h-5" />
            Retour
        </button>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-center mb-4">{deck.topic}</h2>
        <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium text-cyan-300">Progression</span>
            <span className="text-sm font-medium text-slate-400">{masteredCount} / {flashcards.length} Maîtrisées</span>
        </div>
        <div className="w-full bg-slate-700 rounded-full h-2.5">
          <div className="bg-cyan-500 h-2.5 rounded-full" style={{ width: `${progressPercentage}%` }}></div>
        </div>
      </div>
    
      <Flashcard
        question={currentCard.question}
        answer={currentCard.answer}
        isFlipped={isFlipped}
        onClick={() => setIsFlipped(!isFlipped)}
      />

      <div className={`mt-6 transition-opacity duration-300 ${isFlipped ? 'opacity-100' : 'opacity-0 invisible'}`}>
        <p className="text-center text-slate-400 mb-4">Avez-vous bien répondu ?</p>
        <div className="flex justify-center gap-4">
          <button
            onClick={() => handleAnswer(false)}
            className="flex items-center justify-center gap-2 w-40 py-3 px-4 bg-red-600 hover:bg-red-700 text-white font-bold rounded-md transition-colors shadow-lg"
          >
            <XIcon className="w-6 h-6" />
            Incorrect
          </button>
          <button
            onClick={() => handleAnswer(true)}
            className="flex items-center justify-center gap-2 w-40 py-3 px-4 bg-green-600 hover:bg-green-700 text-white font-bold rounded-md transition-colors shadow-lg"
          >
            <CheckIcon className="w-6 h-6" />
            Correct
          </button>
        </div>
      </div>
    </div>
  );
};

export default StudyView;