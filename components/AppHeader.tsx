import React from 'react';
import { User } from 'firebase/auth';

interface AppHeaderProps {
    user: User | null;
    onSignOut: () => void;
}

export const AppHeader: React.FC<AppHeaderProps> = ({ user, onSignOut }) => {
    return (
        <header className="w-full max-w-3xl mx-auto py-4 mb-6 flex justify-between items-center">
            <div>
                <span className="text-sm text-slate-500 dark:text-slate-400">Connecté en tant que:</span>
                <p className="font-semibold text-slate-800 dark:text-slate-200">{user?.email}</p>
            </div>
            <button
                onClick={onSignOut}
                className="py-2 px-4 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-white font-semibold rounded-md transition-colors"
            >
                Se déconnecter
            </button>
        </header>
    );
}