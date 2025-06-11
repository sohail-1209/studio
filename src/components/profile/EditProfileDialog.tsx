
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
  const [selectedAvatarFile, setSelectedAvatarFile] = useState<File | null>(null);
  const [avatarPreviewUrl, setAvatarPreviewUrl] = useState<string | null>(userProfile.photoURL);
  const [avatarUploadProgress, setAvatarUploadProgress] = useState<number | null>(null);

  const [selectedCoverFile, setSelectedCoverFile] = useState<File | null>(null);
  const [coverPreviewUrl, setCoverPreviewUrl] = useState<string | null>(userProfile.coverPhotoURL);
  const [coverUploadProgress, setCoverUploadProgress] = useState<number | null>(null);


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
      setAvatarPreviewUrl(userProfile.photoURL);
      setSelectedAvatarFile(null);
      setAvatarUploadProgress(null);
      setCoverPreviewUrl(userProfile.coverPhotoURL);
      setSelectedCoverFile(null);
      setCoverUploadProgress(null);
    }
  }, [userProfile, open, reset]);

  const handleAvatarFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        toast({ title: "Avatar File Too Large", description: "Please select an image smaller than 5MB.", variant: "destructive" });
        return;
      }
      if (!file.type.startsWith('image/')) {
        toast({ title: "Invalid Avatar File Type", description: "Please select an image file (PNG, JPG, GIF).", variant: "destructive" });
        return;
      }
      setSelectedAvatarFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCoverFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) { // 10MB limit for cover
        toast({ title: "Cover Photo Too Large", description: "Please select an image smaller than 10MB.", variant: "destructive" });
        return;
      }
      if (!file.type.startsWith('image/')) {
        toast({ title: "Invalid Cover Photo File Type", description: "Please select an image file (PNG, JPG, GIF).", variant: "destructive" });
        return;
      }
      setSelectedCoverFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setCoverPreviewUrl(reader.result as string);
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
    setSelectedAvatarFile(null);
    setAvatarPreviewUrl(userProfile.photoURL);
    setAvatarUploadProgress(null);
    setSelectedCoverFile(null);
    setCoverPreviewUrl(userProfile.coverPhotoURL);
    setCoverUploadProgress(null);
  };

  const onSubmit: SubmitHandler<ProfileFormInputs> = async (data) => {
    if (!currentAuthUser || currentAuthUser.uid !== userProfile.uid) {
      toast({ title: "Authorization Error", description: "You can only edit your own profile.", variant: "destructive" });
      return;
    }
    setLoading(true);
    setAvatarUploadProgress(null);
    setCoverUploadProgress(null);

    try {
      const updates: Partial<UserProfile> = {
        displayName: data.displayName,
        bio: data.bio || '',
        username: data.username || '',
      };

      let newPhotoURL: string | null = userProfile.photoURL;
      let newCoverPhotoURL: string | null = userProfile.coverPhotoURL;

      if (selectedAvatarFile) {
        setAvatarUploadProgress(0); 
        const fileExtension = selectedAvatarFile.name.split('.').pop() || 'jpg';
        const fileName = `profile_pic.${fileExtension}?t=${Date.now()}`; // Add timestamp to bust cache
        const avatarPicRef = storageRef(storage, `profile_pictures/${userProfile.uid}/${fileName}`);
        
        const uploadTask = uploadBytesResumable(avatarPicRef, selectedAvatarFile);
        newPhotoURL = await new Promise<string>((resolve, reject) => {
          uploadTask.on('state_changed',
            (snapshot) => setAvatarUploadProgress((snapshot.bytesTransferred / snapshot.totalBytes) * 100),
            (error) => { console.error('Avatar upload failed:', error); reject(error); },
            async () => {
              try { resolve(await getDownloadURL(uploadTask.snapshot.ref)); } catch (urlError) { reject(urlError); }
            }
          );
        });
        updates.photoURL = newPhotoURL;
      }

      if (selectedCoverFile) {
        setCoverUploadProgress(0);
        const fileExtension = selectedCoverFile.name.split('.').pop() || 'jpg';
        const fileName = `cover_photo.${fileExtension}?t=${Date.now()}`; // Add timestamp
        const coverPicRef = storageRef(storage, `cover_pictures/${userProfile.uid}/${fileName}`);

        const uploadTask = uploadBytesResumable(coverPicRef, selectedCoverFile);
        newCoverPhotoURL = await new Promise<string>((resolve, reject) => {
          uploadTask.on('state_changed',
            (snapshot) => setCoverUploadProgress((snapshot.bytesTransferred / snapshot.totalBytes) * 100),
            (error) => { console.error('Cover photo upload failed:', error); reject(error); },
            async () => {
              try { resolve(await getDownloadURL(uploadTask.snapshot.ref)); } catch (urlError) { reject(urlError); }
            }
          );
        });
        updates.coverPhotoURL = newCoverPhotoURL;
      }
      
      const profileDocRef = doc(db, 'profiles', userProfile.uid);
      await updateDoc(profileDocRef, updates);

      const authProfileUpdates: { displayName?: string; photoURL?: string | null } = {};
      if (updates.displayName && currentAuthUser.displayName !== updates.displayName) {
        authProfileUpdates.displayName = updates.displayName;
      }
      if (newPhotoURL !== userProfile.photoURL && newPhotoURL !== undefined) { 
         authProfileUpdates.photoURL = newPhotoURL;
      }

      if (Object.keys(authProfileUpdates).length > 0) {
        await updateAuthProfile(currentAuthUser, authProfileUpdates);
      }
      
      toast({ title: "Profile Updated", description: "Your profile has been successfully updated." });
      onProfileUpdate({ ...userProfile, ...updates }); 
      onOpenChange(false); 
      await reloadUser(); // Reload user to get fresh data including new URLs
    } catch (error: any) {
      console.error("Error updating profile:", error);
      toast({ title: "Update Failed", description: error.message || "Could not update profile.", variant: "destructive" });
    } finally {
      setLoading(false);
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
      <DialogContent className="sm:max-w-lg"> 
        <DialogHeader>
          <DialogTitle>Edit your profile</DialogTitle>
          <DialogDescription>
            Make changes to your profile information, avatar, and cover photo.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 py-4 max-h-[70vh] overflow-y-auto pr-2">
          
          <div className="space-y-2">
            <Label htmlFor="profile-picture-input-actual">Profile Picture</Label>
            <div className="flex items-center space-x-4">
              <div className="relative h-24 w-24 rounded-full overflow-hidden border border-muted bg-muted flex items-center justify-center">
                {avatarPreviewUrl ? (
                  <Image src={avatarPreviewUrl} alt="Profile preview" fill style={{objectFit: 'cover'}} data-ai-hint="profile avatar" />
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
              onChange={handleAvatarFileChange}
              disabled={loading}
            />
            {avatarUploadProgress !== null && avatarUploadProgress >= 0 && loading && selectedAvatarFile && (
              <div className="space-y-1 pt-1">
                <Label className="text-xs text-muted-foreground">Avatar Upload: {Math.round(avatarUploadProgress)}%</Label>
                <div className="w-full bg-muted rounded-full h-1.5">
                  <div className="bg-primary h-1.5 rounded-full" style={{ width: `${avatarUploadProgress}%` }}></div>
                </div>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="cover-photo-input-actual">Cover Photo</Label>
            <div className="w-full aspect-video rounded-md overflow-hidden border border-muted bg-muted flex items-center justify-center relative">
                {coverPreviewUrl ? (
                  <Image src={coverPreviewUrl} alt="Cover photo preview" fill style={{objectFit: 'cover'}} data-ai-hint="profile cover background" />
                ) : (
                  <UploadCloud className="h-12 w-12 text-muted-foreground" />
                )}
            </div>
             <Button type="button" variant="outline" size="sm" className="mt-2 w-full sm:w-auto" onClick={() => document.getElementById('cover-photo-input-actual')?.click()} disabled={loading}>
                Change Cover Photo
              </Button>
            <Input
              id="cover-photo-input-actual"
              type="file"
              className="hidden"
              accept="image/png, image/jpeg, image/gif"
              onChange={handleCoverFileChange}
              disabled={loading}
            />
            {coverUploadProgress !== null && coverUploadProgress >= 0 && loading && selectedCoverFile &&(
              <div className="space-y-1 pt-1">
                <Label className="text-xs text-muted-foreground">Cover Upload: {Math.round(coverUploadProgress)}%</Label>
                <div className="w-full bg-muted rounded-full h-1.5">
                  <div className="bg-primary h-1.5 rounded-full" style={{ width: `${coverUploadProgress}%` }}></div>
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

          <DialogFooter className="pt-4">
            <DialogClose asChild>
              <Button type="button" variant="outline" disabled={loading}>
                Cancel
              </Button>
            </DialogClose>
            <Button 
              type="submit" 
              disabled={loading || 
                        (selectedAvatarFile !== null && avatarUploadProgress !== null && avatarUploadProgress < 100) ||
                        (selectedCoverFile !== null && coverUploadProgress !== null && coverUploadProgress < 100)
                       } 
              className="bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              {loading ? <Spinner className="mr-2 h-4 w-4" /> : null}
              Save Changes
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

