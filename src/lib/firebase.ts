
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getAnalytics, isSupported } from "firebase/analytics";

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyAhZUuorc5eNTM-Ui1biqfzJ4lPJD1RXgY",
  authDomain: "nexchat-1209.firebaseapp.com",
  projectId: "nexchat-1209",
  storageBucket: "nexchat-1209.firebasestorage.app",
  messagingSenderId: "250710574899",
  appId: "1:250710574899:web:8ccb02f7c7c084444fa046",
  measurementId: "G-F25ETFXBFX"
};

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

// Initialize Analytics and export it
// Check if Analytics is supported in the current environment
let analytics;
if (typeof window !== 'undefined') {
  isSupported().then((supported) => {
    if (supported) {
      analytics = getAnalytics(app);
    }
  });
}

export { app, auth, db, storage, analytics };
