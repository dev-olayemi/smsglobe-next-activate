import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDDWTZuAWy4R7YtaaF256fP0UN1W5RgQjs",
  authDomain: "deemax-3223e.firebaseapp.com",
  projectId: "deemax-3223e",
  storageBucket: "deemax-3223e.firebasestorage.app",
  messagingSenderId: "1014783991061",
  appId: "1:1014783991061:web:f56670f29bb8c933915d1c",
  measurementId: "G-ERDNKJGP2D"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize services
export const firebaseAuth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();

// Configure Google provider
googleProvider.setCustomParameters({
  prompt: 'select_account'
});

export default app;
