// src/components/posts/CreatePostDialog.tsx
'use client';

import { useState } from 'react';
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
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { db } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import type { PostDocument } from '@/types/post';
import { Spinner } from '@/components/shared/Spinner';

const postSchema = z.object({
  caption: z.string().min(1, { message: 'Caption cannot be empty' }).max(1000, {message: 'Caption too long'}),
});

type PostFormInputs = z.infer<typeof postSchema>;

interface CreatePostDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreatePostDialog({ open, onOpenChange }: CreatePostDialogProps) {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<PostFormInputs>({
    resolver: zodResolver(postSchema),
  });

  const onSubmit: SubmitHandler<PostFormInputs> = async (data) => {
    if (!user) {
      toast({
        title: 'Authentication Error',
        description: 'You must be logged in to create a post.',
        variant: 'destructive',
      });
      return;
    }
    setLoading(true);
    try {
      const postData: PostDocument = {
        userId: user.uid,
        userDisplayName: user.displayName,
        userAvatarUrl: user.photoURL,
        caption: data.caption,
        imageUrl: null, // Placeholder for future image upload
        videoUrl: null, // Placeholder for future video upload
        likesCount: 0,
        commentsCount: 0,
        createdAt: serverTimestamp(),
      };

      await addDoc(collection(db, 'posts'), postData);

      toast({
        title: 'Post Created!',
        description: 'Your post has been successfully published.',
      });
      reset();
      onOpenChange(false);
    } catch (error: any) {
      console.error("Error creating post:", error);
      toast({
        title: 'Error Creating Post',
        description: error.message || 'Could not create post. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Create a new post</DialogTitle>
          <DialogDescription>
            Share your thoughts with the world. Click post when you&apos;re ready.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="caption">Caption</Label>
            <Textarea
              id="caption"
              placeholder="What's on your mind?"
              {...register('caption')}
              className={errors.caption ? 'border-destructive' : ''}
              rows={5}
            />
            {errors.caption && (
              <p className="text-sm text-destructive">{errors.caption.message}</p>
            )}
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
            </DialogClose>
            <Button type="submit" disabled={loading} className="bg-primary hover:bg-primary/90 text-primary-foreground">
              {loading ? <Spinner className="mr-2 h-4 w-4" /> : null}
              Post
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
