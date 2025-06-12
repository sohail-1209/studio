
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

// Your web app's Firebase configuration
// IMPORTANT: This configuration has been updated based on console error logs.
// You MUST verify that nexchat-drm3y is your intended project and
// update messagingSenderId, appId, and potentially other fields with the
// correct values from the Firebase console for project nexchat-drm3y.
const firebaseConfig = {
  apiKey: "AIzaSyDsw6ox_fmME37xw9qQhmv6MJW53CD7O68", // Updated from console error
  authDomain: "nexchat-drm3y.firebaseapp.com",     // Updated to match new projectId
  projectId: "nexchat-drm3y",                       // Updated from console error
  storageBucket: "nexchat-drm3y.appspot.com", // Adjusted for new projectId (common pattern, verify)
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID_FOR_NEXCHAT_DRM3Y", // FIXME: Update this
  appId: "YOUR_APP_ID_FOR_NEXCHAT_DRM3Y",                         // FIXME: Update this
  measurementId: "YOUR_MEASUREMENT_ID_FOR_NEXCHAT_DRM3Y"          // FIXME: Update this (optional)
};

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

export { app, auth, db, storage };
