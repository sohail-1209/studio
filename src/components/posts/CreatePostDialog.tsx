// src/components/posts/CreatePostDialog.tsx
'use client';

import { useState, ChangeEvent } from 'react';
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
import { Switch } from '@/components/ui/switch'; // Added Switch
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { db, storage } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { ref as storageRef, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import type { PostDocument } from '@/types/post';
import { Spinner } from '@/components/shared/Spinner';
import { UploadCloud } from 'lucide-react';
import Image from 'next/image';

const postSchema = z.object({
  caption: z.string().min(1, { message: 'Caption cannot be empty' }).max(1000, {message: 'Caption too long'}),
  // isStory field will be handled outside react-hook-form for simplicity with the Switch
});

type PostFormInputs = z.infer<typeof postSchema>;

interface CreatePostDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreatePostDialog({ open, onOpenChange }: CreatePostDialogProps) {
  const [loading, setLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [isStory, setIsStory] = useState(false); // State for the story switch
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

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setSelectedFile(null);
      setPreviewUrl(null);
    }
  };

  const resetFormStates = () => {
    reset();
    setSelectedFile(null);
    setPreviewUrl(null);
    setUploadProgress(null);
    setIsStory(false); // Reset story switch
  };

  const handleDialogClose = (isOpen: boolean) => {
    if (!isOpen) {
      resetFormStates();
    }
    onOpenChange(isOpen);
  };

  const onSubmit: SubmitHandler<PostFormInputs> = async (data) => {
    if (!user) {
      toast({
        title: 'Authentication Error',
        description: 'You must be logged in to create a post.',
        variant: 'destructive',
      });
      return;
    }

    // If it's a story, an image might be preferred or required by your product logic.
    // For now, we allow stories with or without images, similar to posts.
    // if (isStory && !selectedFile) {
    //   toast({ title: "Story requires an image", description: "Please select an image for your story.", variant: "destructive"});
    //   return;
    // }

    setLoading(true);
    setUploadProgress(0);

    try {
      let imageUrl: string | null = null;

      if (selectedFile) {
        const uniqueFileName = `${Date.now()}-${selectedFile.name}`;
        const fileRef = storageRef(storage, `post_images/${user.uid}/${uniqueFileName}`);
        const uploadTask = uploadBytesResumable(fileRef, selectedFile);

        await new Promise<void>((resolve, reject) => {
          uploadTask.on(
            'state_changed',
            (snapshot) => {
              const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
              setUploadProgress(progress);
            },
            (error) => {
              console.error('Upload failed:', error);
              toast({
                title: 'Image Upload Failed',
                description: error.message || 'Could not upload image. Please try again.',
                variant: 'destructive',
              });
              setLoading(false);
              setUploadProgress(null);
              reject(error);
            },
            async () => {
              imageUrl = await getDownloadURL(uploadTask.snapshot.ref);
              resolve();
            }
          );
        });
        if (!imageUrl && selectedFile) { // Ensure imageUrl is set if a file was supposed to be uploaded
          throw new Error("Image upload completed but failed to get URL.");
        }
      }
      
      setUploadProgress(selectedFile ? 100 : null); // Only show 100% if a file was processed

      const postData: PostDocument = {
        userId: user.uid,
        userDisplayName: user.displayName || 'Anonymous',
        userAvatarUrl: user.photoURL || null,
        caption: data.caption,
        imageUrl: imageUrl,
        videoUrl: null,
        likesCount: 0,
        likedBy: [], 
        commentsCount: 0,
        createdAt: serverTimestamp(),
        dataAiHint: selectedFile ? 'user uploaded content' : undefined,
        isStory: isStory, // Add the isStory flag
      };

      await addDoc(collection(db, 'posts'), postData);

      toast({
        title: isStory ? 'Story Created!' : 'Post Created!',
        description: isStory ? 'Your story has been shared.' : 'Your post has been successfully published.',
      });
      resetFormStates();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error creating post/story:', error);
      toast({
        title: isStory ? 'Error Creating Story' : 'Error Creating Post',
        description: error.message || 'Could not create content. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
      setUploadProgress(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleDialogClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create a new post</DialogTitle>
          <DialogDescription>
            Share your thoughts, and optionally an image, with the world. You can also share it as a story.
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
              rows={3}
              disabled={loading}
            />
            {errors.caption && (
              <p className="text-sm text-destructive">{errors.caption.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="post-image">Image (Optional)</Label>
            <div className="flex items-center justify-center w-full">
                <Label
                    htmlFor="post-image-input"
                    className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer bg-muted/50 hover:bg-muted/80 border-input"
                >
                    {previewUrl ? (
                        <div className="relative w-full h-full">
                           <Image 
                             src={previewUrl} 
                             alt="Preview" 
                             fill 
                             style={{objectFit: 'contain'}} 
                             className="rounded-md" 
                           />
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center pt-5 pb-6">
                            <UploadCloud className="w-8 h-8 mb-2 text-muted-foreground" />
                            <p className="mb-1 text-sm text-muted-foreground">
                                <span className="font-semibold">Click to upload</span> or drag and drop
                            </p>
                            <p className="text-xs text-muted-foreground">PNG, JPG, GIF up to 10MB</p>
                        </div>
                    )}
                    <Input id="post-image-input" type="file" className="hidden" onChange={handleFileChange} accept="image/png, image/jpeg, image/gif" disabled={loading} />
                </Label>
            </div>
            {selectedFile && <p className="text-xs text-muted-foreground">Selected: {selectedFile.name}</p>}
          </div>
          
          {uploadProgress !== null && loading && selectedFile && (
            <div className="space-y-1">
              <Label className="text-xs">Upload progress: {Math.round(uploadProgress)}%</Label>
              <div className="w-full bg-muted rounded-full h-2.5">
                <div className="bg-primary h-2.5 rounded-full" style={{ width: `${uploadProgress}%` }}></div>
              </div>
            </div>
          )}

          <div className="flex items-center space-x-2">
            <Switch
              id="isStorySwitch"
              checked={isStory}
              onCheckedChange={setIsStory}
              disabled={loading}
            />
            <Label htmlFor="isStorySwitch" className="cursor-pointer">Share as a Story (visible for 24h)</Label>
          </div>


          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline" onClick={() => handleDialogClose(false)} disabled={loading}>
                Cancel
              </Button>
            </DialogClose>
            <Button type="submit" disabled={loading || (selectedFile && uploadProgress !== null && uploadProgress < 100)} className="bg-primary hover:bg-primary/90 text-primary-foreground">
              {loading && <Spinner className="mr-2 h-4 w-4" />}
              {loading ? (selectedFile && uploadProgress !== null ? 'Uploading...' : 'Sharing...') : (isStory ? 'Share Story' : 'Post')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
