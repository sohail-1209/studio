
// src/components/profile/EditProfileDialog.tsx
'use client';

import { useState, useEffect, ChangeEvent } from 'react';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
  DialogClose,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { db, storage, auth } from '@/lib/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { updateProfile as updateAuthProfile } from 'firebase/auth';
import { ref as storageRef, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import type { UserProfile } from '@/contexts/AuthContext';
import { Spinner } from '@/components/shared/Spinner';
import Image from 'next/image';
import { UploadCloud } from 'lucide-react';

const profileSchema = z.object({
  displayName: z.string().min(1, "Display name cannot be empty").max(50, "Display name too long"),
  bio: z.string().max(160, "Bio too long").optional(),
  username: z.string().min(3, "Username must be at least 3 characters").max(30, "Username too long").regex(/^[a-zA-Z0-9_.]+$/, "Username can only contain letters, numbers, underscores, and periods.").optional(),
});

type ProfileFormInputs = z.infer<typeof profileSchema>;

interface EditProfileDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userProfile: UserProfile;
  onProfileUpdate: (updatedProfile: UserProfile) => void;
}

export function EditProfileDialog({ open, onOpenChange, userProfile, onProfileUpdate }: EditProfileDialogProps) {
  const [loading, setLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(userProfile.photoURL);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);

  const { toast } = useToast();
  const { firebaseUser: currentAuthUser, reloadUser } = useAuth();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ProfileFormInputs>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      displayName: userProfile.displayName || '',
      bio: userProfile.bio || '',
      username: userProfile.username || '',
    },
  });

  useEffect(() => {
    if (open && userProfile) {
      reset({
        displayName: userProfile.displayName || '',
        bio: userProfile.bio || '',
        username: userProfile.username || '',
      });
      setPreviewUrl(userProfile.photoURL);
      setSelectedFile(null);
      setUploadProgress(null);
    }
  }, [userProfile, open, reset]);

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        toast({ title: "File Too Large", description: "Please select an image smaller than 5MB.", variant: "destructive" });
        return;
      }
      if (!file.type.startsWith('image/')) {
        toast({ title: "Invalid File Type", description: "Please select an image file (PNG, JPG, GIF).", variant: "destructive" });
        return;
      }
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const resetDialogStates = () => {
    reset({
      displayName: userProfile.displayName || '',
      bio: userProfile.bio || '',
      username: userProfile.username || '',
    });
    setSelectedFile(null);
    setPreviewUrl(userProfile.photoURL);
    setUploadProgress(null);
  };

  const onSubmit: SubmitHandler<ProfileFormInputs> = async (data) => {
    if (!currentAuthUser || currentAuthUser.uid !== userProfile.uid) {
      toast({ title: "Authorization Error", description: "You can only edit your own profile.", variant: "destructive" });
      return;
    }
    setLoading(true);
    setUploadProgress(null); // Reset progress at the beginning of submission

    try {
      const updates: Partial<UserProfile> = {
        displayName: data.displayName,
        bio: data.bio || '',
        username: data.username || '',
      };

      let newPhotoURL: string | null = userProfile.photoURL;

      if (selectedFile) {
        setUploadProgress(0); // Start progress indication
        const fileExtension = selectedFile.name.split('.').pop() || 'jpg';
        const fileName = `profile_pic.${fileExtension}`;
        const profilePicRef = storageRef(storage, `profile_pictures/${userProfile.uid}/${fileName}`);
        
        const uploadTask = uploadBytesResumable(profilePicRef, selectedFile);

        newPhotoURL = await new Promise<string>((resolve, reject) => {
          uploadTask.on(
            'state_changed',
            (snapshot) => {
              const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
              setUploadProgress(progress);
            },
            (error) => {
              console.error('Upload failed:', error);
              reject(error);
            },
            async () => {
              try {
                const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
                resolve(downloadURL);
              } catch (urlError) {
                reject(urlError);
              }
            }
          );
        });
        updates.photoURL = newPhotoURL;
      }
      
      const profileDocRef = doc(db, 'profiles', userProfile.uid);
      await updateDoc(profileDocRef, updates);

      const authProfileUpdates: { displayName?: string; photoURL?: string | null } = {};
      if (updates.displayName && currentAuthUser.displayName !== updates.displayName) {
        authProfileUpdates.displayName = updates.displayName;
      }
      if (newPhotoURL !== userProfile.photoURL && newPhotoURL !== undefined) { // Check if photoURL actually changed
         authProfileUpdates.photoURL = newPhotoURL;
      }

      if (Object.keys(authProfileUpdates).length > 0) {
        await updateAuthProfile(currentAuthUser, authProfileUpdates);
        // Consider calling reloadUser() if onAuthStateChanged doesn't pick up changes fast enough
        // or if more immediate consistency is required across the app for the Auth object itself.
        // For now, onAuthStateChanged in AuthContext should handle updating the Firestore-backed profile.
      }
      
      toast({ title: "Profile Updated", description: "Your profile has been successfully updated." });
      onProfileUpdate({ ...userProfile, ...updates }); 
      onOpenChange(false);
    } catch (error: any) {
      console.error("Error updating profile:", error);
      toast({ title: "Update Failed", description: error.message || "Could not update profile.", variant: "destructive" });
    } finally {
      setLoading(false);
      // Only clear uploadProgress if it was a successful upload or if dialog is closed.
      // If error during upload, user might want to see the failed progress.
      // The useEffect for 'open' or handleDialogClose will handle resetting progress display on close.
    }
  };
  
  const handleDialogClose = (isOpen: boolean) => {
    if (!isOpen) {
      resetDialogStates();
    }
    onOpenChange(isOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleDialogClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit your profile</DialogTitle>
          <DialogDescription>
            Make changes to your profile information and photo.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-4">
          
          <div className="space-y-2">
            <Label htmlFor="profile-picture-input-actual">Profile Picture</Label>
            <div className="flex items-center space-x-4">
              <div className="relative h-24 w-24 rounded-full overflow-hidden border border-muted bg-muted flex items-center justify-center">
                {previewUrl ? (
                  <Image src={previewUrl} alt="Profile preview" fill style={{objectFit: 'cover'}} data-ai-hint="profile avatar" />
                ) : (
                  <UploadCloud className="h-10 w-10 text-muted-foreground" />
                )}
              </div>
              <Button type="button" variant="outline" size="sm" onClick={() => document.getElementById('profile-picture-input-actual')?.click()} disabled={loading}>
                Change Photo
              </Button>
            </div>
            <Input
              id="profile-picture-input-actual"
              type="file"
              className="hidden"
              accept="image/png, image/jpeg, image/gif"
              onChange={handleFileChange}
              disabled={loading}
            />
            {uploadProgress !== null && uploadProgress >= 0 && loading && (
              <div className="space-y-1 pt-2">
                <Label className="text-xs">Upload progress: {Math.round(uploadProgress)}%</Label>
                <div className="w-full bg-muted rounded-full h-1.5">
                  <div className="bg-primary h-1.5 rounded-full" style={{ width: `${uploadProgress}%` }}></div>
                </div>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="displayName">Display Name</Label>
            <Input
              id="displayName"
              {...register('displayName')}
              className={errors.displayName ? 'border-destructive' : ''}
              disabled={loading}
            />
            {errors.displayName && <p className="text-sm text-destructive">{errors.displayName.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="username">Username</Label>
            <Input
              id="username"
              {...register('username')}
              className={errors.username ? 'border-destructive' : ''}
              disabled={loading}
              placeholder="e.g., cool_user_123"
            />
            {errors.username && <p className="text-sm text-destructive">{errors.username.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="bio">Bio</Label>
            <Textarea
              id="bio"
              placeholder="Tell us a little about yourself..."
              {...register('bio')}
              className={errors.bio ? 'border-destructive' : ''}
              rows={3}
              disabled={loading}
            />
            {errors.bio && <p className="text-sm text-destructive">{errors.bio.message}</p>}
          </div>

          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline" disabled={loading}>
                Cancel
              </Button>
            </DialogClose>
            <Button type="submit" disabled={loading || (selectedFile !== null && uploadProgress !== null && uploadProgress < 100)} className="bg-primary hover:bg-primary/90 text-primary-foreground">
              {loading ? <Spinner className="mr-2 h-4 w-4" /> : null}
              Save Changes
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
