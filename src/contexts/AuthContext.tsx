
// src/contexts/AuthContext.tsx
'use client';

import type { User as FirebaseUser } from 'firebase/auth';
import { createContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { auth, db } from '@/lib/firebase';
import { onAuthStateChanged, signOut as firebaseSignOut, reload } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { useRouter } from 'next/navigation';

export interface UserProfile {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  bio?: string;
  username?: string;
  // Ensure all fields used in profile page are here
  coverPhotoURL?: string;
  followersCount?: number;
  followingCount?: number;
}

interface AuthContextType {
  user: UserProfile | null;
  firebaseUser: FirebaseUser | null;
  loading: boolean;
  logout: () => Promise<void>;
  reloadUser: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const fetchUserProfile = useCallback(async (fbUser: FirebaseUser) => {
    const userRef = doc(db, 'profiles', fbUser.uid);
    try {
      const userSnap = await getDoc(userRef);
      if (userSnap.exists()) {
        setUser(userSnap.data() as UserProfile);
      } else {
        // Create a default profile if one doesn't exist
        const derivedDisplayName = fbUser.displayName || fbUser.email?.split('@')[0] || 'Anonymous';
        const derivedPhotoURL = fbUser.photoURL || `https://placehold.co/100x100.png?text=${derivedDisplayName.charAt(0).toUpperCase()}`;
        // Ensure username is valid for Firestore paths if used, and reasonably unique
        const baseUsername = (fbUser.email?.split('@')[0] || derivedDisplayName).toLowerCase().replace(/[^a-z0-9_.]/g, '').substring(0, 15);
        const derivedUsername = baseUsername || 'user' + fbUser.uid.substring(0,5);
        
        const newUserProfile: UserProfile = {
          uid: fbUser.uid,
          email: fbUser.email,
          displayName: derivedDisplayName,
          photoURL: derivedPhotoURL,
          username: derivedUsername,
          bio: '',
          followersCount: 0, // Initialize counts
          followingCount: 0,
        };
        await setDoc(userRef, newUserProfile);
        setUser(newUserProfile);
      }
    } catch (error) {
      console.error("AuthContext: Error fetching/creating user profile from Firestore:", error);
      setUser(null); // Handle error by clearing user profile
    }
  }, []);


  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      setLoading(true);
      if (fbUser) {
        setFirebaseUser(fbUser); // Set Firebase Auth user state
        // Fetch/update Firestore profile based on the latest Firebase Auth user state
        await fetchUserProfile(fbUser);
      } else {
        setFirebaseUser(null);
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [fetchUserProfile]);

  const logout = async () => {
    try {
      await firebaseSignOut(auth);
      // onAuthStateChanged will handle clearing firebaseUser and user states
      router.push('/login'); 
    } catch (error) {
      console.error('Error during logout (AuthContext):', error);
      // Fallback ensure states are cleared
      setFirebaseUser(null);
      setUser(null);
      setLoading(false); 
      router.push('/login');
    }
  };

  const reloadUser = useCallback(async () => {
    const currentAuthUser = auth.currentUser;
    if (currentAuthUser) {
      setLoading(true);
      try {
        await reload(currentAuthUser);
        const refreshedFbUser = auth.currentUser;
        if (refreshedFbUser) {
          setFirebaseUser(refreshedFbUser);
          await fetchUserProfile(refreshedFbUser); // Re-fetch Firestore profile with new auth data
        } else {
          // This case should ideally be handled by onAuthStateChanged if user becomes null
          setFirebaseUser(null);
          setUser(null);
        }
      } catch (error) {
        console.error("Error reloading user (AuthContext):", error);
        if ((error as any).code === 'auth/user-token-expired' || (error as any).code === 'auth/user-disabled') {
          await logout();
        }
      } finally {
        setLoading(false);
      }
    }
  }, [fetchUserProfile]); // Added fetchUserProfile
  
  return (
    <AuthContext.Provider value={{ user, firebaseUser, loading, logout, reloadUser }}>
      {children}
    </AuthContext.Provider>
  );
};
