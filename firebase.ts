
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getFunctions } from "firebase/functions";

const firebaseConfig = {
  apiKey: "AIzaSyDrwi9Hdox_52039OXnf2YGXXrrw_dZOic",
  authDomain: "site-flash-card-b59c4.firebaseapp.com",
  projectId: "site-flash-card-b59c4",
  storageBucket: "site-flash-card-b59c4.firebasestorage.app",
  messagingSenderId: "790096569383",
  appId: "1:790096569383:web:15d4b44b69cc7b61f8da02",
  measurementId: "G-KP687YWB89"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const functions = getFunctions(app);
