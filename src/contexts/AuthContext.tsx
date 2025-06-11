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
      if (fbUser) {
        setFirebaseUser(fbUser);
        // Fetch user profile from Firestore
        const userRef = doc(db, 'users', fbUser.uid);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
          setUser(userSnap.data() as UserProfile);
        } else {
          // Create a basic profile if it doesn't exist
          const newUserProfile: UserProfile = {
            uid: fbUser.uid,
            email: fbUser.email,
            displayName: fbUser.displayName || fbUser.email?.split('@')[0] || 'Anonymous',
            photoURL: fbUser.photoURL || `https://placehold.co/100x100.png?text=${(fbUser.displayName || fbUser.email || 'A').charAt(0).toUpperCase()}`,
            username: fbUser.displayName || fbUser.email?.split('@')[0] || 'anonymous'
          };
          await setDoc(userRef, newUserProfile);
          setUser(newUserProfile);
        }
      } else {
        setFirebaseUser(null);
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const logout = async () => {
    setLoading(true);
    await firebaseSignOut(auth);
    setUser(null);
    setFirebaseUser(null);
    setLoading(false);
    router.push('/login');
  };
  
  return (
    <AuthContext.Provider value={{ user, firebaseUser, loading, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
