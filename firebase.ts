import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getFunctions } from "firebase/functions";

// =================================================================================
// CONFIGURATION FIREBASE
// IMPORTANT : Remplacez les valeurs ci-dessous par votre propre configuration Firebase.
// Ne committez JAMAIS vos clés secrètes sur un dépôt public comme GitHub !
// =================================================================================
const firebaseConfig = {
  apiKey: "AIzaSyDrwi9Hdox_52039OXnf2YGXXrrw_dZOic",
  authDomain: "site-flash-card-b59c4.firebaseapp.com",
  projectId: "site-flash-card-b59c4",
  storageBucket: "site-flash-card-b59c4.firebasestorage.app",
  messagingSenderId: "790096569383",
  appId: "1:790096569383:web:15d4b44b69cc7b61f8da02",
  measurementId: "G-KP687YWB89"// Optionnel
};


// Vérification pour s'assurer que la configuration par défaut n'est pas utilisée.
if (firebaseConfig.apiKey.startsWith("VOTRE_")) {
  const errorMessage = "ERREUR CRITIQUE : La configuration Firebase n'est pas définie. Veuillez remplacer les valeurs dans firebase.ts par celles de votre projet. L'application ne fonctionnera pas sans cela.";
  console.error(errorMessage);
  // Pour une meilleure expérience utilisateur, vous pourriez afficher ce message dans l'interface utilisateur.
}


// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialise les services Firebase et les exporte pour les utiliser dans l'application
export const auth = getAuth(app);
export const db = getFirestore(app);
export const functions = getFunctions(app); // Initialise et exporte le service Functions