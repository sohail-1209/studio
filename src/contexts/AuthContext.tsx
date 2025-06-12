
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
  coverPhotoURL?: string;
  followersCount?: number;
  followingCount?: number;
  isPrivate?: boolean; // Added for public/private account feature
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

  console.log("AuthContext: PROVIDER RENDERING. Current loading state:", loading, "User:", user?.uid, "FBUser:", firebaseUser?.uid);

  const fetchUserProfile = useCallback(async (fbUser: FirebaseUser): Promise<UserProfile | null> => {
    console.log(`AuthContext: fetchUserProfile called for UID: ${fbUser.uid}`);
    const userRef = doc(db, 'profiles', fbUser.uid);
    try {
      const userSnap = await getDoc(userRef);
      if (userSnap.exists()) {
        console.log(`AuthContext: Profile FOUND in Firestore for UID: ${fbUser.uid}`);
        const profileData = userSnap.data() as UserProfile;
        // Ensure isPrivate defaults to false if not set
        return { ...profileData, isPrivate: profileData.isPrivate || false };
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
          isPrivate: false, // Default to public
        };
        await setDoc(userRef, newUserProfile);
        console.log(`AuthContext: CREATED and returning new profile for UID: ${fbUser.uid}`);
        return newUserProfile;
      }
    } catch (error) {
      console.error("AuthContext: ERROR fetching/creating user profile from Firestore:", error);
      return null;
    }
  }, []);


  useEffect(() => {
    console.log("AuthContext: useEffect for onAuthStateChanged ATTACHING.");
    const unsubscribe = onAuthStateChanged(auth, async (currentFbUser) => {
      console.log(`AuthContext: onAuthStateChanged FIRED. Firebase user: ${currentFbUser ? currentFbUser.uid : 'null'}.`);
      if (currentFbUser) {
        console.log(`AuthContext: Firebase user DETECTED (UID: ${currentFbUser.uid}). Fetching profile...`);
        setFirebaseUser(currentFbUser); // Set FirebaseUser first
        const profile = await fetchUserProfile(currentFbUser);
        if (profile) {
          setUser(profile);
          console.log(`AuthContext: Profile set for user: ${profile.uid}`);
        } else {
          setUser(null); // Explicitly set to null if profile fetch fails
          console.warn(`AuthContext: Profile fetch failed for UID: ${currentFbUser.uid}. User state set to null.`);
        }
      } else {
        console.log("AuthContext: No Firebase user detected (null). Clearing user states.");
        setFirebaseUser(null);
        setUser(null);
      }
      setLoading(false);
      console.log(`AuthContext: Auth state processing COMPLETE. Loading: false. User: ${user?.uid}, FBUser: ${firebaseUser?.uid}`);
    });

    return () => {
      console.log("AuthContext: useEffect for onAuthStateChanged DETACHING.");
      unsubscribe();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchUserProfile]);

  const logout = async () => {
    console.log("AuthContext: logout function CALLED.");
    setLoading(true); // Indicate loading during logout
    try {
      await firebaseSignOut(auth);
      console.log("AuthContext: Firebase signOut successful. States will be cleared by onAuthStateChanged.");
      // onAuthStateChanged will handle clearing firebaseUser and user states and setting loading to false.
      router.push('/login'); 
    } catch (error) {
      console.error('Error during logout (AuthContext):', error);
      setFirebaseUser(null); // Fallback state clearing
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
        const refreshedFbUser = auth.currentUser; // Re-fetch after reload
        console.log(`AuthContext: Firebase user reloaded. Refreshed auth user: ${refreshedFbUser ? refreshedFbUser.uid : 'null'}`);
        if (refreshedFbUser) {
          setFirebaseUser(refreshedFbUser);
          const profile = await fetchUserProfile(refreshedFbUser);
           if (profile) {
            setUser(profile);
             console.log(`AuthContext: Profile reloaded and set for user: ${profile.uid}`);
          } else {
            setUser(null);
             console.warn(`AuthContext: Profile fetch failed after reload for UID: ${refreshedFbUser.uid}. User state set to null.`);
          }
        } else {
          // This case means user is no longer valid after reload
          setFirebaseUser(null);
          setUser(null);
          console.warn("AuthContext: No valid Firebase user after reload. User logged out.");
        }
      } catch (error) {
        console.error("Error reloading user (AuthContext):", error);
        if ((error as any).code === 'auth/user-token-expired' || (error as any).code === 'auth/user-disabled') {
          console.warn("AuthContext: User token expired or user disabled during reload. Logging out.");
          await logout(); // This will eventually set loading to false
          return; // Return early as logout handles loading
        }
      } finally {
        setLoading(false); // Ensure loading is set to false if not handled by logout
        console.log("AuthContext: reloadUser finished, loading set to false.");
      }
    } else {
       console.log("AuthContext: reloadUser called but no current auth user. Skipping reload.");
       setLoading(false); // If no user, no reload process to load for.
    }
  }, [fetchUserProfile, logout]);
  
  return (
    <AuthContext.Provider value={{ user, firebaseUser, loading, logout, reloadUser }}>
      {children}
    </AuthContext.Provider>
  );
};
