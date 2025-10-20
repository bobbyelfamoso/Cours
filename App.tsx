import React, { useState, useEffect } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth } from './firebase';
import { AppState, Deck } from './types';
import AuthView from './components/AuthView';
import DecksView from './components/DecksView';
import SetupView from './components/SetupView';
import StudyView from './components/StudyView';
import { AppHeader } from './components/AppHeader';
import { signOutUser } from './services/authService';

const App: React.FC = () => {
  const [appState, setAppState] = useState<AppState>(AppState.LOADING);
  const [user, setUser] = useState<User | null>(null);
  const [isGuest, setIsGuest] = useState(false);
  const [currentDeck, setCurrentDeck] = useState<Deck | null>(null);
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUser(user);
        setIsGuest(false);
        setAppState(AppState.DECKS);
      } else {
        setUser(null);
        // Don't reset guest status here, allow guest session to persist
        if (!isGuest) {
          setAppState(AppState.AUTH);
        }
      }
    });

    return () => unsubscribe();
  }, [isGuest]);

  const handleGuestLogin = () => {
    setIsGuest(true);
    setAppState(AppState.DECKS);
  };

  const handleSignOut = async () => {
    try {
      await signOutUser();
      setIsGuest(false);
      setUser(null);
      setAppState(AppState.AUTH);
    } catch (error) {
      console.error("Error signing out: ", error);
    }
  };

  const handleStartSetup = (folderId: string | null) => {
    setCurrentFolderId(folderId);
    setAppState(AppState.SETUP);
  };

  const handleStartStudy = (deck: Deck) => {
    setCurrentDeck(deck);
    setAppState(AppState.STUDYING);
  };

  const handleFinishStudy = () => {
    setCurrentDeck(null);
    setAppState(AppState.DECKS);
  };
  
  const handleFinishSetup = () => {
      setAppState(AppState.DECKS);
  };

  const renderContent = () => {
    switch (appState) {
      case AppState.LOADING:
        return <div className="text-center">Chargement de l'application...</div>;
      case AppState.AUTH:
        return <AuthView onGuestLogin={handleGuestLogin} />;
      case AppState.DECKS:
        return (
          <>
            {(user || isGuest) && <AppHeader user={user} onSignOut={handleSignOut} />}
            <DecksView
              onStartSetup={handleStartSetup}
              onStartStudy={handleStartStudy}
              isGuest={isGuest}
            />
          </>
        );
      case AppState.SETUP:
        return <SetupView onBack={handleFinishSetup} isGuest={isGuest} folderId={currentFolderId} />;
      case AppState.STUDYING:
        if (!currentDeck) {
          // Should not happen, but as a fallback
          setAppState(AppState.DECKS);
          return null;
        }
        return <StudyView deck={currentDeck} onFinish={handleFinishStudy} />;
      default:
        return <AuthView onGuestLogin={handleGuestLogin} />;
    }
  };

  return (
    <div className="bg-slate-900 text-slate-100 min-h-screen flex flex-col items-center justify-start p-4 sm:p-6 md:p-8">
      <main className="w-full max-w-4xl mx-auto flex flex-col items-center">
        {renderContent()}
      </main>
      <footer className="w-full max-w-4xl mx-auto text-center mt-8 py-4 border-t border-slate-800">
          <p className="text-sm text-slate-500">Créé avec React, Firebase, et Gemini AI.</p>
      </footer>
    </div>
  );
};

export default App;
