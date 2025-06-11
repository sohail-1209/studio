// src/components/posts/CommentInput.tsx
'use client';

import { useState } from 'react';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { db } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp, doc, updateDoc, increment } from 'firebase/firestore';
import type { CommentDocument } from '@/types/post';
import { Spinner } from '@/components/shared/Spinner';
import { Send } from 'lucide-react';

const commentSchema = z.object({
  text: z.string().min(1, { message: "Comment cannot be empty" }).max(500, { message: "Comment too long" }),
});

type CommentFormInputs = z.infer<typeof commentSchema>;

interface CommentInputProps {
  postId: string;
  onCommentPosted?: () => void; // Optional callback after comment is posted
}

export function CommentInput({ postId, onCommentPosted }: CommentInputProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CommentFormInputs>({
    resolver: zodResolver(commentSchema),
  });

  const onSubmit: SubmitHandler<CommentFormInputs> = async (data) => {
    if (!user) {
      toast({ title: "Authentication Error", description: "Please log in to comment.", variant: "destructive" });
      return;
    }
    if (!postId) {
      toast({ title: "Error", description: "Post ID is missing.", variant: "destructive" });
      return;
    }

    setIsSubmitting(true);
    try {
      const commentData: CommentDocument = {
        userId: user.uid,
        userDisplayName: user.displayName || 'Anonymous',
        userAvatarUrl: user.photoURL || null,
        text: data.text,
        createdAt: serverTimestamp(),
      };

      // console.log("Attempting to post comment with data:", commentData);
      // console.log("User UID:", user.uid);
      // console.log("Post ID:", postId);

      const postRef = doc(db, 'posts', postId);
      const commentsCollectionRef = collection(postRef, 'comments');
      
      await addDoc(commentsCollectionRef, commentData);
      await updateDoc(postRef, {
        commentsCount: increment(1),
      });
      
      reset();
      toast({ title: "Comment Posted!", description: "Your comment has been added." });
      onCommentPosted?.(); // Call callback if provided
    } catch (error: any) {
      console.error("Error posting comment:", error);
      console.error("Firebase error code:", error.code); // More detailed logging
      console.error("Firebase error details:", error.details); // More detailed logging
      toast({ title: "Error Posting Comment", description: error.message || "Could not post comment. Check console for details.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex items-start space-x-3 py-3">
      <Textarea
        placeholder="Write a comment..."
        {...register('text')}
        className={`flex-1 resize-none ${errors.text ? 'border-destructive' : ''}`}
        rows={1}
        disabled={isSubmitting || !user}
      />
      <Button type="submit" size="icon" disabled={isSubmitting || !user} className="h-auto p-2.5">
        {isSubmitting ? <Spinner size={18} /> : <Send size={18} />}
        <span className="sr-only">Post Comment</span>
      </Button>
      {errors.text && <p className="text-sm text-destructive mt-1 w-full col-span-2">{errors.text.message}</p>}
    </form>
  );
}
