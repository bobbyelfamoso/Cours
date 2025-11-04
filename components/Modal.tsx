import React, { useState, useEffect } from 'react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children }) => {
  useEffect(() => {
    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => {
      window.removeEventListener('keydown', handleEsc);
    };
  }, [onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-75 flex justify-center items-center z-50"
      onClick={onClose}
      aria-modal="true"
      role="dialog"
    >
      <div
        className="bg-white dark:bg-slate-800 rounded-lg shadow-xl border border-slate-200 dark:border-slate-700 w-full max-w-md p-6 mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-xl font-bold mb-4">{title}</h2>
        {children}
      </div>
    </div>
  );
};


interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
}

export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({ isOpen, onClose, onConfirm, title, message, confirmText = "Confirmer" }) => {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title}>
      <p className="text-slate-600 dark:text-slate-300 mb-6">{message}</p>
      <div className="flex justify-end gap-4">
        <button
          onClick={onClose}
          className="py-2 px-4 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 font-semibold rounded-md transition-colors"
        >
          Annuler
        </button>
        <button
          onClick={onConfirm}
          className="py-2 px-4 bg-red-600 hover:bg-red-700 text-white font-bold rounded-md transition-colors"
        >
          {confirmText}
        </button>
      </div>
    </Modal>
  );
};


interface RenameModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (newName: string) => void;
  title: string;
  initialValue: string;
}

export const RenameModal: React.FC<RenameModalProps> = ({ isOpen, onClose, onConfirm, title, initialValue }) => {
  const [name, setName] = useState(initialValue);

  useEffect(() => {
    if (isOpen) {
      setName(initialValue);
    }
  }, [isOpen, initialValue]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      onConfirm(name.trim());
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title}>
      <form onSubmit={handleSubmit}>
        <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-2" htmlFor="rename-input">Nouveau nom</label>
        <input
          id="rename-input"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full px-4 py-3 bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md placeholder-slate-500 focus:ring-2 focus:ring-pink-500 dark:focus:ring-cyan-500 focus:border-pink-500 dark:focus:border-cyan-500 outline-none transition-all mb-6"
          autoFocus
          onFocus={e => e.target.select()}
        />
        <div className="flex justify-end gap-4">
          <button
            type="button"
            onClick={onClose}
            className="py-2 px-4 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 font-semibold rounded-md transition-colors"
          >
            Annuler
          </button>
          <button
            type="submit"
            className="py-2 px-4 bg-pink-600 hover:bg-pink-700 dark:bg-cyan-600 dark:hover:bg-cyan-700 text-white font-bold rounded-md transition-colors"
          >
            Renommer
          </button>
        </div>
      </form>
    </Modal>
  );
};