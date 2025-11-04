import React, { useState } from 'react';
import { signIn, signUp } from '../services/authService';

interface AuthViewProps {
  onGuestLogin: () => void;
}

const AuthView: React.FC<AuthViewProps> = ({ onGuestLogin }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError("Veuillez entrer un email et un mot de passe.");
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      if (isLogin) {
        await signIn(email, password);
      } else {
        await signUp(email, password);
      }
      // onAuthStateChanged in App.tsx will handle the state change
    } catch (err) {
      if (err instanceof Error) {
        // Basic error handling, can be improved to be more specific
        setError("L'authentification a échoué. Vérifiez vos identifiants ou réessayez.");
        console.error(err);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center p-4 text-center w-full">
        <h1 className="text-4xl md:text-5xl font-extrabold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-pink-600 to-rose-500 dark:from-cyan-400 dark:to-indigo-500">
            Flashcards IA
        </h1>
        <p className="text-slate-500 dark:text-slate-400 mb-8 max-w-md">
            Créez, étudiez et maîtrisez n'importe quel sujet avec des flashcards générées par l'intelligence artificielle.
        </p>

        <div className="w-full max-w-sm bg-white dark:bg-slate-800 p-8 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-700">
            <h2 className="text-2xl font-bold mb-6">{isLogin ? 'Se Connecter' : 'Créer un Compte'}</h2>
            <form onSubmit={handleSubmit}>
                <div className="mb-4">
                    <label htmlFor="email" className="block text-left text-sm font-medium text-slate-600 dark:text-slate-300 mb-2">Email</label>
                    <input
                        type="email"
                        id="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full px-4 py-3 bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md placeholder-slate-500 focus:ring-2 focus:ring-pink-500 dark:focus:ring-cyan-500 focus:border-pink-500 dark:focus:border-cyan-500 outline-none transition-all"
                        placeholder="vous@exemple.com"
                        required
                    />
                </div>
                <div className="mb-6">
                    <label htmlFor="password"className="block text-left text-sm font-medium text-slate-600 dark:text-slate-300 mb-2">Mot de passe</label>
                    <input
                        type="password"
                        id="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full px-4 py-3 bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md placeholder-slate-500 focus:ring-2 focus:ring-pink-500 dark:focus:ring-cyan-500 focus:border-pink-500 dark:focus:border-cyan-500 outline-none transition-all"
                        placeholder="********"
                        required
                    />
                </div>
                
                {error && <p className="text-red-500 mb-4 text-sm">{error}</p>}

                <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full py-3 px-4 bg-pink-600 hover:bg-pink-700 dark:bg-cyan-600 dark:hover:bg-cyan-700 disabled:bg-slate-400 dark:disabled:bg-slate-600 text-white font-bold rounded-md transition-colors shadow-lg"
                >
                    {isLoading ? 'Chargement...' : (isLogin ? 'Se Connecter' : 'Créer un Compte')}
                </button>
            </form>

            <p className="mt-6 text-sm text-slate-500 dark:text-slate-400">
                {isLogin ? "Vous n'avez pas de compte ?" : "Vous avez déjà un compte ?"}
                <button onClick={() => { setIsLogin(!isLogin); setError(null); }} className="font-semibold text-pink-600 dark:text-cyan-400 hover:text-pink-500 dark:hover:text-cyan-300 ml-1">
                    {isLogin ? 'Créer un compte' : 'Se connecter'}
                </button>
            </p>
        </div>

        <div className="mt-8">
            <button
                onClick={onGuestLogin}
                className="text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 font-semibold transition-colors"
            >
                Continuer en tant qu'invité
            </button>
        </div>
    </div>
  );
};

export default AuthView;