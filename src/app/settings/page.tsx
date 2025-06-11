
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
import { SettingsIcon, Edit3, Palette, ShieldCheck, LogOut, AlertTriangle, Moon, Sun } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import type { UserProfile } from '@/contexts/AuthContext';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { EditProfileDialog } from '@/components/profile/EditProfileDialog';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import Image from 'next/image';

type Theme = 'light' | 'dark';

export default function SettingsPage() {
  const { user: currentUser, logout, reloadUser } = useAuth();
  const { toast } = useToast();

  const [userProfileData, setUserProfileData] = useState<UserProfile | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [currentTheme, setCurrentTheme] = useState<Theme>('light');

  useEffect(() => {
    // Initialize theme from localStorage or default to light
    const storedTheme = localStorage.getItem('theme') as Theme | null;
    if (storedTheme) {
      setCurrentTheme(storedTheme);
      document.documentElement.classList.toggle('dark', storedTheme === 'dark');
    } else {
      // Default to light if no theme is stored
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
    setUserProfileData(updatedProfile); // Update local state immediately
    await reloadUser(); // Reload user in AuthContext to reflect changes globally
    toast({ title: "Profile Updated", description: "Your settings page reflects the latest changes." });
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
      <div className="container mx-auto max-w-3xl py-8">
        <Card className="shadow-lg">
          <CardHeader>
            <div className="flex items-center space-x-3">
              <SettingsIcon className="h-7 w-7 text-primary" />
              <CardTitle className="font-headline text-3xl">Settings</CardTitle>
            </div>
            <CardDescription>Manage your account, profile, and appearance settings.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-8">
            {/* Profile Settings Section */}
            <section>
              <h2 className="text-xl font-semibold text-foreground mb-3">Profile Settings</h2>
              {loadingProfile ? (
                <ProfileInfoSkeleton />
              ) : userProfileData ? (
                <div className="flex items-center justify-between rounded-lg border p-4 bg-muted/30">
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
                  <Button variant="outline" size="sm" onClick={() => setIsEditDialogOpen(true)}>
                    <Edit3 className="mr-2 h-4 w-4" /> Edit Profile
                  </Button>
                </div>
              ) : (
                <p className="text-muted-foreground">Could not load profile information.</p>
              )}
            </section>

            <Separator />

            {/* Appearance Settings Section */}
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

            {/* Account Management Section */}
            <section>
              <h2 className="text-xl font-semibold text-foreground mb-3">Account Management</h2>
              <div className="space-y-4">
                <div className="rounded-lg border p-4">
                  <Label className="text-base">Change Password</Label>
                  <p className="text-sm text-muted-foreground mt-1">
                    To change your password, please log out and use the "Forgot Password?" link on the login page.
                    This feature is not directly available within active sessions for security reasons.
                  </p>
                </div>
                <div className="rounded-lg border p-4 border-destructive/50 bg-destructive/5">
                  <Label className="text-base text-destructive flex items-center">
                    <AlertTriangle className="mr-2 h-5 w-5" /> Delete Account
                  </Label>
                  <p className="text-sm text-destructive/80 mt-1">
                    Account deletion is a permanent action and cannot be undone. This feature is currently not implemented.
                  </p>
                  <Button variant="destructive" size="sm" className="mt-3" disabled>
                    Request Account Deletion (Disabled)
                  </Button>
                </div>
                 <div className="rounded-lg border p-4">
                   <Button variant="outline" onClick={logout} className="w-full sm:w-auto">
                    <LogOut className="mr-2 h-4 w-4" /> Log Out
                  </Button>
                  <p className="text-sm text-muted-foreground mt-1">
                    Securely log out of your NExCHAT account.
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
    </MainLayout>
  );
}
