
import React from 'react';

interface FlashcardProps {
  question: string;
  answer: string;
  isFlipped: boolean;
  onClick: () => void;
}

const Flashcard: React.FC<FlashcardProps> = ({ question, answer, isFlipped, onClick }) => {
  return (
    <div className="w-full h-80 perspective" onClick={onClick}>
      <div
        className={`relative w-full h-full preserve-3d transition-transform duration-500 ${
          isFlipped ? 'rotate-y-180' : ''
        }`}
      >
        {/* Front of the card */}
        <div className="absolute w-full h-full backface-hidden bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-2xl flex items-center justify-center p-6 cursor-pointer">
          <p className="text-2xl font-semibold text-center text-slate-800 dark:text-slate-100">{question}</p>
        </div>
        
        {/* Back of the card */}
        <div className="absolute w-full h-full backface-hidden bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl shadow-2xl flex items-center justify-center p-6 cursor-pointer rotate-y-180">
          <p className="text-xl text-center text-pink-600 dark:text-cyan-300">{answer}</p>
        </div>
      </div>
    </div>
  );
};

export default Flashcard;