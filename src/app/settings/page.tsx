
// src/app/settings/page.tsx
'use client';

import { useEffect, useState, useCallback } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { SettingsIcon, Edit3, Palette, ShieldCheck, LogOut, AlertTriangle, Moon, Sun, Loader2, Trash2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import type { UserProfile } from '@/contexts/AuthContext';
import { db, storage, auth } from '@/lib/firebase'; // Ensure auth is imported
import { doc, getDoc, deleteDoc, collection, query, where, getDocs, writeBatch } from 'firebase/firestore';
import { deleteObject, ref as storageRef } from 'firebase/storage';
import { sendPasswordResetEmail, deleteUser as deleteAuthUser } from 'firebase/auth'; // Import deleteUser
import { EditProfileDialog } from '@/components/profile/EditProfileDialog';
import { ReauthenticateDialog } from '@/components/auth/ReauthenticateDialog'; // Import ReauthenticateDialog
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import Image from 'next/image';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";


type Theme = 'light' | 'dark';

export default function SettingsPage() {
  const { user: currentUser, firebaseUser, logout, reloadUser } = useAuth();
  const { toast } = useToast();

  const [userProfileData, setUserProfileData] = useState<UserProfile | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [currentTheme, setCurrentTheme] = useState<Theme>('light');
  const [isSendingResetEmail, setIsSendingResetEmail] = useState(false);

  const [isReauthDialogOpen, setIsReauthDialogOpen] = useState(false);
  const [isConfirmDeleteDialogOpen, setIsConfirmDeleteDialogOpen] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);


  useEffect(() => {
    const storedTheme = localStorage.getItem('theme') as Theme | null;
    if (storedTheme) {
      setCurrentTheme(storedTheme);
      document.documentElement.classList.toggle('dark', storedTheme === 'dark');
    } else {
      setCurrentTheme('light');
      document.documentElement.classList.remove('dark');
    }
  }, []);

  const toggleTheme = () => {
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    setCurrentTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    document.documentElement.classList.toggle('dark', newTheme === 'dark');
    toast({
      title: `Theme Changed`,
      description: `Switched to ${newTheme} mode.`,
    });
  };

  const fetchProfile = useCallback(async () => {
    if (currentUser?.uid) {
      setLoadingProfile(true);
      try {
        const profileRef = doc(db, 'profiles', currentUser.uid);
        const profileSnap = await getDoc(profileRef);
        if (profileSnap.exists()) {
          setUserProfileData(profileSnap.data() as UserProfile);
        } else {
          toast({ title: "Profile not found", description: "Could not load your profile data.", variant: "destructive" });
        }
      } catch (error) {
        console.error("Error fetching profile for settings:", error);
        toast({ title: "Error", description: "Failed to load profile data.", variant: "destructive" });
      } finally {
        setLoadingProfile(false);
      }
    } else {
      setLoadingProfile(false);
    }
  }, [currentUser?.uid, toast]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const handleProfileUpdate = async (updatedProfile: UserProfile) => {
    setUserProfileData(updatedProfile);
    await reloadUser();
    toast({ title: "Profile Updated", description: "Your settings page reflects the latest changes." });
  };

  const handleChangePassword = async () => {
    if (!firebaseUser || !firebaseUser.email) {
      toast({ title: "Error", description: "User email not found. Cannot send reset link.", variant: "destructive"});
      return;
    }
    setIsSendingResetEmail(true);
    try {
      await sendPasswordResetEmail(auth, firebaseUser.email);
      toast({ title: "Password Reset Email Sent", description: `A password reset link has been sent to ${firebaseUser.email}. Please check your inbox.`});
    } catch (error: any) {
      console.error("Error sending password reset email:", error);
      toast({ title: "Error", description: error.message || "Failed to send password reset email.", variant: "destructive"});
    } finally {
      setIsSendingResetEmail(false);
    }
  };

  const handleDeleteAccountRequest = () => {
    setIsReauthDialogOpen(true);
  };

  const handleReauthSuccess = () => {
    setIsReauthDialogOpen(false);
    setIsConfirmDeleteDialogOpen(true);
  };

  const handleConfirmDeleteAccount = async () => {
    if (!firebaseUser || !currentUser) {
      toast({ title: "Error", description: "User session not found.", variant: "destructive" });
      return;
    }
    setIsDeletingAccount(true);
    try {
      const userId = currentUser.uid;
      const batch = writeBatch(db);

      const postsQuery = query(collection(db, 'posts'), where('userId', '==', userId));
      const postsSnapshot = await getDocs(postsQuery);
      for (const postDoc of postsSnapshot.docs) {
        const postData = postDoc.data();
        if (postData.imagePath) {
          try {
            const imageFileRef = storageRef(storage, postData.imagePath);
            await deleteObject(imageFileRef);
          } catch (storageError) {
            console.warn(`Could not delete post image ${postData.imagePath}:`, storageError);
          }
        }
        batch.delete(postDoc.ref);
      }

      const notificationsQuery = query(collection(db, 'notifications'), where('recipientId', '==', userId));
      const notificationsSnapshot = await getDocs(notificationsQuery);
      notificationsSnapshot.forEach(doc => batch.delete(doc.ref));

      const followRequestsSentQuery = query(collection(db, 'followRequests'), where('requesterId', '==', userId));
      const followRequestsSentSnapshot = await getDocs(followRequestsSentQuery);
      followRequestsSentSnapshot.forEach(doc => batch.delete(doc.ref));

      const followRequestsReceivedQuery = query(collection(db, 'followRequests'), where('recipientId', '==', userId));
      const followRequestsReceivedSnapshot = await getDocs(followRequestsReceivedQuery);
      followRequestsReceivedSnapshot.forEach(doc => batch.delete(doc.ref));

      const profileRef = doc(db, 'profiles', userId);
      batch.delete(profileRef);

      await batch.commit();

      await deleteAuthUser(firebaseUser);

      toast({ title: "Account Deleted", description: "Your account and associated data have been successfully deleted." });
    } catch (error: any) {
      console.error("Error deleting account:", error);
      toast({ title: "Account Deletion Failed", description: error.message || "Could not delete your account. Please try again.", variant: "destructive" });
      if (error.code === 'auth/requires-recent-login') {
        toast({ title: "Re-authentication Required", description: "Please re-authenticate to complete account deletion.", variant: "destructive", duration: 6000});
        setIsReauthDialogOpen(true);
      }
    } finally {
      setIsDeletingAccount(false);
      setIsConfirmDeleteDialogOpen(false);
    }
  };

  const ProfileInfoSkeleton = () => (
    <div className="flex items-center space-x-4">
      <Skeleton className="h-16 w-16 rounded-full" />
      <div className="space-y-2">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-4 w-24" />
      </div>
    </div>
  );

  return (
    <MainLayout>
      <div>
        <Card className="shadow-lg w-full max-w-3xl mx-auto">
          <CardHeader>
            <div className="flex items-center space-x-3">
              <SettingsIcon className="h-7 w-7 text-primary" />
              <CardTitle className="font-headline text-3xl">Settings</CardTitle>
            </div>
            <CardDescription>Manage your account, profile, and appearance settings.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-8">
            <section>
              <h2 className="text-xl font-semibold text-foreground mb-3">Profile Settings</h2>
              {loadingProfile ? (
                <ProfileInfoSkeleton />
              ) : userProfileData ? (
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between rounded-lg border p-4 bg-muted/30 space-y-3 sm:space-y-0">
                  <div className="flex items-center space-x-4">
                    <Avatar className="h-16 w-16">
                      {userProfileData.photoURL ? (
                        <Image src={userProfileData.photoURL} alt={userProfileData.displayName || 'User'} width={64} height={64} className="rounded-full" data-ai-hint="user avatar" />
                      ) : (
                        <AvatarFallback>{(userProfileData.displayName || 'U').charAt(0).toUpperCase()}</AvatarFallback>
                      )}
                    </Avatar>
                    <div>
                      <p className="text-lg font-medium text-foreground">{userProfileData.displayName}</p>
                      <p className="text-sm text-muted-foreground">@{userProfileData.username || 'username_not_set'}</p>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => setIsEditDialogOpen(true)} className="w-full sm:w-auto mt-2 sm:mt-0">
                    <Edit3 className="mr-2 h-4 w-4" /> Edit Profile
                  </Button>
                </div>
              ) : (
                <p className="text-muted-foreground">Could not load profile information.</p>
              )}
            </section>

            <Separator />

            <section>
              <h2 className="text-xl font-semibold text-foreground mb-3">Appearance</h2>
              <div className="flex items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <Label htmlFor="theme-toggle" className="text-base">Dark Mode</Label>
                  <p className="text-sm text-muted-foreground">
                    Toggle between light and dark themes for the application.
                  </p>
                </div>
                <div className="flex items-center space-x-2">
                  <Sun className={`h-5 w-5 ${currentTheme === 'light' ? 'text-primary' : 'text-muted-foreground'}`} />
                  <Switch
                    id="theme-toggle"
                    checked={currentTheme === 'dark'}
                    onCheckedChange={toggleTheme}
                    aria-label="Toggle dark mode"
                  />
                  <Moon className={`h-5 w-5 ${currentTheme === 'dark' ? 'text-primary' : 'text-muted-foreground'}`} />
                </div>
              </div>
            </section>

            <Separator />

            <section>
              <h2 className="text-xl font-semibold text-foreground mb-3">Account Management</h2>
              <div className="space-y-4">
                <div className="rounded-lg border p-4">
                  <Label className="text-base">Change Password</Label>
                   <Button variant="outline" size="sm" className="mt-3 w-full sm:w-auto" onClick={handleChangePassword} disabled={isSendingResetEmail}>
                    {isSendingResetEmail ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ShieldCheck className="mr-2 h-4 w-4" />}
                    Send Password Reset Email
                  </Button>
                  <p className="text-sm text-muted-foreground mt-1">
                    A link to reset your password will be sent to your registered email address.
                  </p>
                </div>
                <div className="rounded-lg border p-4 border-destructive/50 bg-destructive/5">
                  <Label className="text-base text-destructive flex items-center">
                    <AlertTriangle className="mr-2 h-5 w-5" /> Delete Account
                  </Label>
                   <Button variant="destructive" size="sm" className="mt-3 w-full sm:w-auto" onClick={handleDeleteAccountRequest} disabled={isDeletingAccount}>
                    {isDeletingAccount ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" /> }
                    Delete My Account
                  </Button>
                  <p className="text-sm text-destructive/80 mt-1">
                    This action is permanent and cannot be undone. All your data will be removed.
                  </p>
                </div>
                 <div className="rounded-lg border p-4">
                   <Button variant="outline" onClick={logout} className="w-full sm:w-auto">
                    <LogOut className="mr-2 h-4 w-4" /> Log Out
                  </Button>
                  <p className="text-sm text-muted-foreground mt-1">
                    Securely log out of your Synora account.
                  </p>
                </div>
              </div>
            </section>
          </CardContent>
        </Card>
      </div>

      {userProfileData && (
        <EditProfileDialog
          open={isEditDialogOpen}
          onOpenChange={setIsEditDialogOpen}
          userProfile={userProfileData}
          onProfileUpdate={handleProfileUpdate}
        />
      )}

      <ReauthenticateDialog
        open={isReauthDialogOpen}
        onOpenChange={setIsReauthDialogOpen}
        onSuccess={handleReauthSuccess}
      />

      <AlertDialog open={isConfirmDeleteDialogOpen} onOpenChange={setIsConfirmDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete your account and remove all your data from our servers.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setIsConfirmDeleteDialogOpen(false)} disabled={isDeletingAccount}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDeleteAccount}
              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
              disabled={isDeletingAccount}
            >
              {isDeletingAccount ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
              Yes, Delete My Account
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </MainLayout>
  );
}
