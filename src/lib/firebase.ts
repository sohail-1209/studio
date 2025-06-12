
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

// Your web app's Firebase configuration
// Updated to reflect the project details indicated by console errors (nexchat-drm3y)
const firebaseConfig = {
  apiKey: "AIzaSyDsw6ox_fmME37xw9qQhmv6MJW53CD7O68", // From console errors
  authDomain: "nexchat-drm3y.firebaseapp.com",    // Derived from projectId
  projectId: "nexchat-drm3y",                     // From console errors
  storageBucket: "nexchat-drm3y.appspot.com", // Common pattern, verify this in your Firebase console for nexchat-drm3y
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID_FOR_NEXCHAT_DRM3Y", // Update this from Firebase console
  appId: "YOUR_APP_ID_FOR_NEXCHAT_DRM3Y",                         // Update this from Firebase console
  measurementId: "YOUR_MEASUREMENT_ID_FOR_NEXCHAT_DRM3Y"          // Update this from Firebase console
};

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

export { app, auth, db, storage };
