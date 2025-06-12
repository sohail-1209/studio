
// Import the functions you need from the SDKs you need
import { initializeApp, type FirebaseApp } from "firebase/app";
// Type import for Analytics is fine, actual function import will be dynamic
import type { Analytics } from "firebase/analytics";
import { getAuth, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { getStorage, type Storage } from 'firebase/storage';

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAhZUuorc5eNTM-Ui1biqfzJ4lPJD1RXgY",
  authDomain: "nexchat-1209.firebaseapp.com",
  projectId: "nexchat-1209",
  storageBucket: "nexchat-1209.firebasestorage.app",
  messagingSenderId: "250710574899",
  appId: "1:250710574899:web:8ccb02f7c7c084444fa046",
  measurementId: "G-F25ETFXBFX"
};

// Initialize Firebase core services
const app: FirebaseApp = initializeApp(firebaseConfig);
const auth: Auth = getAuth(app);
const db: Firestore = getFirestore(app);
const storage: Storage = getStorage(app);

let analyticsInstance: Analytics | null = null;

/**
 * Initializes and returns the Firebase Analytics instance.
 * This function should only be called on the client-side.
 * Returns null if on the server or if Analytics initialization fails.
 */
export async function initializeFirebaseAnalytics(): Promise<Analytics | null> {
  if (typeof window !== 'undefined' && firebaseConfig.measurementId) {
    if (!analyticsInstance) {
      try {
        // Dynamically import 'getAnalytics' only when this function is called on the client
        const { getAnalytics } = await import("firebase/analytics");
        analyticsInstance = getAnalytics(app);
        // console.log("Firebase Analytics initialized successfully."); // Optional: for debugging
      } catch (error) {
        console.error("Error initializing Firebase Analytics on demand:", error);
        analyticsInstance = null; // Ensure it's null on failure
      }
    }
    return analyticsInstance;
  }
  return null;
}

// Export core services
export { app, auth, db, storage };
// Note: 'analytics' is no longer directly exported.
// Code that needs analytics would call initializeFirebaseAnalytics(),
// typically within a useEffect hook in a client component.
