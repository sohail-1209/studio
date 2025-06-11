// src/contexts/AuthContext.tsx
'use client';

import type { User as FirebaseUser } from 'firebase/auth';
import { createContext, useEffect, useState, ReactNode } from 'react';
import { auth, db } from '@/lib/firebase';
import { onAuthStateChanged, signOut as firebaseSignOut } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { useRouter } from 'next/navigation';

export interface UserProfile {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  // Add other profile fields here
  bio?: string;
  username?: string;
}

interface AuthContextType {
  user: UserProfile | null;
  firebaseUser: FirebaseUser | null;
  loading: boolean;
  logout: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      try {
        if (fbUser) {
          setFirebaseUser(fbUser);
          // Fetch user profile from Firestore
          const userRef = doc(db, 'profiles', fbUser.uid); // Changed 'users' to 'profiles'
          const userSnap = await getDoc(userRef);
          if (userSnap.exists()) {
            setUser(userSnap.data() as UserProfile);
          } else {
            // Create a basic profile if it doesn't exist
            const derivedDisplayName = fbUser.displayName || fbUser.email?.split('@')[0] || 'Anonymous';
            const derivedPhotoURL = fbUser.photoURL || `https://placehold.co/100x100.png?text=${derivedDisplayName.charAt(0).toUpperCase()}`;
            const derivedUsername = (fbUser.email?.split('@')[0] || derivedDisplayName).toLowerCase().replace(/\s+/g, '') || 'user' + fbUser.uid.substring(0,5);
            
            const newUserProfile: UserProfile = {
              uid: fbUser.uid,
              email: fbUser.email,
              displayName: derivedDisplayName,
              photoURL: derivedPhotoURL,
              username: derivedUsername,
              bio: '', // Default bio
            };
            await setDoc(userRef, newUserProfile);
            setUser(newUserProfile);
          }
        } else {
          setFirebaseUser(null);
          setUser(null);
        }
      } catch (error) {
        console.error("Error in onAuthStateChanged handler (AuthContext):", error);
        // If an error occurs (e.g., Firestore issue), ensure user is logged out
        setFirebaseUser(null);
        setUser(null);
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const logout = async () => {
    try {
      await firebaseSignOut(auth);
      // onAuthStateChanged will handle setting user/firebaseUser to null.
      // setLoading(true) might be appropriate here if there's a noticeable delay before onAuthStateChanged fires
      // However, for simplicity and reliance on onAuthStateChanged, we can omit direct state changes here.
      router.push('/login'); // Ensure redirection to login page
    } catch (error) {
      console.error('Error during logout:', error);
      // Fallback: ensure local state is cleared if signOut itself or subsequent onAuthStateChanged fails.
      setFirebaseUser(null);
      setUser(null);
      setLoading(false); // Ensure loading state is false
      router.push('/login');
    }
  };
  
  return (
    <AuthContext.Provider value={{ user, firebaseUser, loading, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
