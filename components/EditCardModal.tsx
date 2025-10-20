import React, { useState, useEffect } from 'react';
import { GeneratedFlashcard } from '../types';
import { TrashIcon } from './Icons';

interface EditCardModalProps {
  card: GeneratedFlashcard;
  onSave: (updatedCard: GeneratedFlashcard) => void;
  onDelete: () => void;
  onCancel: () => void;
}

const EditCardModal: React.FC<EditCardModalProps> = ({ card, onSave, onDelete, onCancel }) => {
  const [question, setQuestion] = useState(card.question);
  const [answer, setAnswer] = useState(card.answer);

  useEffect(() => {
    setQuestion(card.question);
    setAnswer(card.answer);
  }, [card]);

  const handleSave = () => {
    if (question.trim() && answer.trim()) {
      onSave({ question, answer });
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
      <div className="bg-slate-800 border border-slate-700 rounded-xl shadow-2xl w-full max-w-2xl p-8 transform transition-all">
        <h2 className="text-2xl font-bold text-cyan-300 mb-6 text-left">Modifier la Flashcard</h2>
        
        <div className="mb-4">
          <label htmlFor="edit-question" className="block text-left text-sm font-medium text-slate-300 mb-2">
            Question (Recto)
          </label>
          <textarea
            id="edit-question"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            className="w-full h-32 px-4 py-3 bg-slate-700 border border-slate-600 rounded-md placeholder-slate-500 focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none transition-all"
            spellCheck="true"
          />
        </div>

        <div className="mb-8">
          <label htmlFor="edit-answer" className="block text-left text-sm font-medium text-slate-300 mb-2">
            Réponse (Verso)
          </label>
          <textarea
            id="edit-answer"
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            className="w-full h-32 px-4 py-3 bg-slate-700 border border-slate-600 rounded-md placeholder-slate-500 focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none transition-all"
            spellCheck="true"
          />
        </div>

        <div className="flex flex-col sm:flex-row-reverse items-center gap-4">
            <button
                onClick={handleSave}
                disabled={!question.trim() || !answer.trim()}
                className="w-full sm:w-auto py-3 px-6 bg-cyan-600 hover:bg-cyan-700 disabled:bg-slate-600 disabled:cursor-not-allowed text-white font-bold rounded-md transition-colors shadow-lg"
            >
                Enregistrer
            </button>
            <button
                onClick={onCancel}
                className="w-full sm:w-auto py-3 px-6 bg-slate-600 hover:bg-slate-500 text-white font-bold rounded-md transition-colors"
            >
                Annuler
            </button>
            <div className="sm:mr-auto">
                 <button
                    onClick={onDelete}
                    className="w-full sm:w-auto flex items-center justify-center gap-2 py-3 px-4 text-red-400 hover:text-red-500 font-medium rounded-md transition-colors"
                    aria-label="Supprimer la carte"
                >
                    <TrashIcon className="w-5 h-5" />
                    Supprimer
                </button>
            </div>
        </div>

      </div>
    </div>
  );
};

export default EditCardModal;
