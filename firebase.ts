import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getFunctions } from "firebase/functions";

// =================================================================================
// CONFIGURATION FIREBASE
// Ces valeurs sont spécifiques à votre projet Firebase.
// =================================================================================
const firebaseConfig = {
  apiKey: "***********************************",
  authDomain: "site-flash-card-b59c4.firebaseapp.com",
  projectId: "site-flash-card-b59c4",
  storageBucket: "site-flash-card-b59c4.firebasestorage.app",
  messagingSenderId: "790096569383",
  appId: "1:790096569383:web:15d4b44b69cc7b61f8da02",
  measurementId: "G-KP687YWB89"
};


// Vérification pour s'assurer que la configuration par défaut n'est pas utilisée.
// Note: Cette vérification simple est pour le développement. En production, les clés sont souvent gérées différemment.
if (firebaseConfig.apiKey.startsWith("AIzaSy")) {
  const warningMessage = "Attention : Vous utilisez les clés de configuration Firebase de l'exemple. Assurez-vous de les remplacer par celles de votre propre projet Firebase pour que l'application fonctionne correctement.";
  console.warn(warningMessage);
}


// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialise les services Firebase et les exporte pour les utiliser dans l'application
export const auth = getAuth(app);
export const db = getFirestore(app);
export const functions = getFunctions(app); // Initialise et exporte le service Functions
