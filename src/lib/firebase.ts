
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAhZUuorc5eNTM-Ui1biqfzJ4lPJD1RXgY",
  authDomain: "nexchat-1209.firebaseapp.com",
  projectId: "nexchat-1209",
  storageBucket: "nexchat-1209.firebasestorage.app", // Ensured .firebasestorage.app
  messagingSenderId: "250710574899",
  appId: "1:250710574899:web:8ccb02f7c7c084444fa046",
  measurementId: "G-F25ETFXBFX"
};

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

export { app, auth, db, storage };

