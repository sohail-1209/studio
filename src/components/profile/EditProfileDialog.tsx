// src/components/profile/EditProfileDialog.tsx
'use client';

import { useState, useEffect } from 'react';
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
import { db, auth } from '@/lib/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { updateProfile as updateAuthProfile } from 'firebase/auth';
import type { UserProfile } from '@/contexts/AuthContext';
import { Spinner } from '@/components/shared/Spinner';

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
  const { toast } = useToast();
  const { firebaseUser: currentAuthUser } = useAuth(); // Get the Firebase Auth user object

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
    if (userProfile && open) {
      reset({
        displayName: userProfile.displayName || '',
        bio: userProfile.bio || '',
        username: userProfile.username || '',
      });
    }
  }, [userProfile, open, reset]);

  const onSubmit: SubmitHandler<ProfileFormInputs> = async (data) => {
    if (!currentAuthUser || currentAuthUser.uid !== userProfile.uid) {
      toast({ title: "Authorization Error", description: "You can only edit your own profile.", variant: "destructive" });
      return;
    }
    setLoading(true);

    try {
      const profileRef = doc(db, 'profiles', userProfile.uid);
      const updates: Partial<UserProfile> = {
        displayName: data.displayName,
        bio: data.bio || '', // Ensure bio is not undefined
        username: data.username || '', // Ensure username is not undefined
      };

      // Update Firestore document
      await updateDoc(profileRef, updates);

      // Update Firebase Auth profile (only displayName, photoURL needs separate handling)
      if (currentAuthUser.displayName !== data.displayName) {
        await updateAuthProfile(currentAuthUser, { displayName: data.displayName });
      }
      
      toast({ title: "Profile Updated", description: "Your profile has been successfully updated." });
      onProfileUpdate({ ...userProfile, ...updates }); // Update local state in parent
      onOpenChange(false); // Close dialog
    } catch (error: any) {
      console.error("Error updating profile:", error);
      toast({ title: "Update Failed", description: error.message || "Could not update profile.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit your profile</DialogTitle>
          <DialogDescription>
            Make changes to your profile information.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-4">
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
            <Button type="submit" disabled={loading} className="bg-primary hover:bg-primary/90 text-primary-foreground">
              {loading ? <Spinner className="mr-2 h-4 w-4" /> : null}
              Save Changes
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
