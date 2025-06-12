
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

  console.log("AuthContext: PROVIDER RENDERING. Initial loading state:", loading);

  const fetchUserProfile = useCallback(async (fbUser: FirebaseUser) => {
    console.log(`AuthContext: fetchUserProfile called for UID: ${fbUser.uid}`);
    const userRef = doc(db, 'profiles', fbUser.uid);
    try {
      const userSnap = await getDoc(userRef);
      if (userSnap.exists()) {
        console.log(`AuthContext: Profile FOUND in Firestore for UID: ${fbUser.uid}`);
        setUser(userSnap.data() as UserProfile);
      } else {
        console.warn(`AuthContext: Profile NOT FOUND for UID: ${fbUser.uid}. Creating new profile.`);
        const derivedDisplayName = fbUser.displayName || fbUser.email?.split('@')[0] || 'Anonymous';
        const derivedPhotoURL = fbUser.photoURL || `https://placehold.co/100x100.png?text=${derivedDisplayName.charAt(0).toUpperCase()}`;
        const baseUsername = (fbUser.email?.split('@')[0] || derivedDisplayName).toLowerCase().replace(/[^a-z0-9_.]/g, '').substring(0, 15);
        const derivedUsername = baseUsername || 'user' + fbUser.uid.substring(0,5);
        
        const newUserProfile: UserProfile = {
          uid: fbUser.uid,
          email: fbUser.email,
          displayName: derivedDisplayName,
          photoURL: derivedPhotoURL,
          username: derivedUsername,
          bio: '',
          followersCount: 0,
          followingCount: 0,
        };
        await setDoc(userRef, newUserProfile);
        setUser(newUserProfile);
        console.log(`AuthContext: CREATED and set new profile for UID: ${fbUser.uid}`);
      }
    } catch (error) {
      console.error("AuthContext: ERROR fetching/creating user profile from Firestore:", error);
      setUser(null);
    }
  }, []);


  useEffect(() => {
    console.log("AuthContext: useEffect for onAuthStateChanged ATTACHING.");
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      console.log(`AuthContext: onAuthStateChanged FIRED. Firebase user: ${fbUser ? fbUser.uid : 'null'}. Current loading: ${loading}`);
      setLoading(true); // Explicitly set loading true at the start of processing
      if (fbUser) {
        console.log(`AuthContext: Firebase user DETECTED (UID: ${fbUser.uid}). Fetching profile...`);
        setFirebaseUser(fbUser);
        await fetchUserProfile(fbUser);
      } else {
        console.log("AuthContext: No Firebase user detected (null). Clearing user states.");
        setFirebaseUser(null);
        setUser(null);
      }
      console.log(`AuthContext: Auth state processing COMPLETE. Setting loading to false. User state:`, user, `FirebaseUser state:`, firebaseUser);
      setLoading(false);
    });

    return () => {
      console.log("AuthContext: useEffect for onAuthStateChanged DETACHING.");
      unsubscribe();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchUserProfile]); // Removed user and firebaseUser from deps to avoid potential loops if fetchUserProfile causes their update.

  const logout = async () => {
    console.log("AuthContext: logout function CALLED.");
    try {
      await firebaseSignOut(auth);
      console.log("AuthContext: Firebase signOut successful. Redirecting to /login.");
      // onAuthStateChanged will handle clearing firebaseUser and user states.
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
    console.log(`AuthContext: reloadUser function CALLED. Current auth user: ${currentAuthUser ? currentAuthUser.uid : 'null'}`);
    if (currentAuthUser) {
      setLoading(true);
      try {
        await reload(currentAuthUser);
        const refreshedFbUser = auth.currentUser;
        console.log(`AuthContext: Firebase user reloaded. Refreshed auth user: ${refreshedFbUser ? refreshedFbUser.uid : 'null'}`);
        if (refreshedFbUser) {
          setFirebaseUser(refreshedFbUser);
          await fetchUserProfile(refreshedFbUser);
        } else {
          setFirebaseUser(null);
          setUser(null);
        }
      } catch (error) {
        console.error("Error reloading user (AuthContext):", error);
        if ((error as any).code === 'auth/user-token-expired' || (error as any).code === 'auth/user-disabled') {
          console.warn("AuthContext: User token expired or user disabled during reload. Logging out.");
          await logout();
        }
      } finally {
        setLoading(false);
        console.log("AuthContext: reloadUser finished, loading set to false.");
      }
    }
  }, [fetchUserProfile, logout]);
  
  return (
    <AuthContext.Provider value={{ user, firebaseUser, loading, logout, reloadUser }}>
      {children}
    </AuthContext.Provider>
  );
};
