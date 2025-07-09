
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
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { db, storage } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { ref as storageRef, uploadBytesResumable, getDownloadURL, deleteObject } from 'firebase/storage';
import type { PostDocument } from '@/types/post';
import { Spinner } from '@/components/shared/Spinner';
import { UploadCloud } from 'lucide-react';
import Image from 'next/image';
import { moderateContent } from '@/ai/flows/moderate-content';

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
  const [isStory, setIsStory] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth(); // User object from AuthContext now includes isPrivate

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
      if (file.size > 10 * 1024 * 1024) { // 10MB limit
        toast({ title: "File Too Large", description: "Please select a file smaller than 10MB.", variant: "destructive" });
        return;
      }
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
    setIsStory(false);
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

    setLoading(true);
    
    // 1. Moderate caption text
    try {
      const textModerationResult = await moderateContent({
        content: data.caption,
        contentType: 'text',
        ruleset: 'No hate speech, no harassment, no explicit content, no illegal activities.',
      });

      if (!textModerationResult.isSafe) {
        toast({
          title: 'Content Moderation Failed',
          description: `Your post was blocked for the following reason: ${textModerationResult.reason}`,
          variant: 'destructive',
          duration: 7000,
        });
        setLoading(false);
        return;
      }
    } catch (error: any) {
        console.error("Error during text moderation:", error);
        toast({ title: "Moderation Error", description: "Could not check post content. Please try again.", variant: "destructive" });
        setLoading(false);
        return;
    }


    // 2. Upload image (if any) and then moderate it
    let imageUrl: string | null = null;
    let imagePath: string | null = null;
    let fileRef: any = null;

    if (selectedFile) {
        setUploadProgress(0);
        const uniqueFileName = `${Date.now()}-${selectedFile.name}`;
        const filePath = `post_images/${user.uid}/${uniqueFileName}`;
        fileRef = storageRef(storage, filePath);
        imagePath = filePath;
        const uploadTask = uploadBytesResumable(fileRef, selectedFile);

        try {
            await new Promise<void>((resolve, reject) => {
              uploadTask.on(
                'state_changed',
                (snapshot) => setUploadProgress((snapshot.bytesTransferred / snapshot.totalBytes) * 100),
                (error) => reject(error),
                async () => {
                  try {
                    imageUrl = await getDownloadURL(uploadTask.snapshot.ref);
                    resolve();
                  } catch (urlError) {
                    reject(urlError);
                  }
                }
              );
            });

            if (!imageUrl) throw new Error("Image upload completed but failed to get URL.");
            
            // 2a. Moderate the uploaded image URL
            const imageModerationResult = await moderateContent({
                content: imageUrl,
                contentType: 'image',
                ruleset: 'No explicit, violent, or hateful imagery.',
            });

            if (!imageModerationResult.isSafe) {
                toast({
                  title: 'Image Moderation Failed',
                  description: `Your image was blocked: ${imageModerationResult.reason}`,
                  variant: 'destructive',
                  duration: 7000,
                });
                await deleteObject(fileRef); // Clean up the rejected image
                setLoading(false);
                return;
            }

        } catch (error: any) {
            console.error('Upload or image moderation failed:', error);
            toast({
              title: 'Image Upload Failed',
              description: error.message || 'Could not upload or moderate image. Please try again.',
              variant: 'destructive',
            });
            setLoading(false);
            setUploadProgress(null);
            return;
        }
    }

    // 3. If all moderation passes, create the post
    try {
      const postData: PostDocument = {
        userId: user.uid,
        userDisplayName: user.displayName || 'Anonymous',
        userAvatarUrl: user.photoURL || null,
        caption: data.caption,
        imageUrl,
        imagePath,
        videoUrl: null,
        likesCount: 0,
        likedBy: [],
        commentsCount: 0,
        createdAt: serverTimestamp(),
        dataAiHint: selectedFile ? 'user uploaded content' : undefined,
        isStory,
        authorIsPrivate: user.isPrivate || false,
      };

      await addDoc(collection(db, 'posts'), postData);

      toast({
        title: isStory ? 'Story Created!' : 'Post Created!',
        description: isStory ? 'Your story has been shared.' : 'Your post has been successfully published.',
      });
      resetFormStates();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error creating post document:', error);
      toast({
        title: 'Error Creating Post',
        description: 'Could not save the post after upload. Please try again.',
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
            <Button type="submit" disabled={loading || (selectedFile !== null && uploadProgress !== null && uploadProgress < 100)} className="bg-primary hover:bg-primary/90 text-primary-foreground">
              {loading && <Spinner className="mr-2 h-4 w-4" />}
              {loading ? (selectedFile && uploadProgress !== null ? 'Uploading...' : 'Sharing...') : (isStory ? 'Share Story' : 'Post')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
