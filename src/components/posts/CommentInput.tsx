
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
import type { NotificationDocument } from '@/types/notification'; // Import notification type
import { Spinner } from '@/components/shared/Spinner';
import { Send } from 'lucide-react';
import { moderateContent } from '@/ai/flows/moderate-content';

const commentSchema = z.object({
  text: z.string().min(1, { message: "Comment cannot be empty" }).max(500, { message: "Comment too long" }),
});

type CommentFormInputs = z.infer<typeof commentSchema>;

interface CommentInputProps {
  postId: string;
  postOwnerId: string; // ID of the user who owns the post
  postContentPreview?: string; // A short preview of the post content
  onCommentPosted?: () => void; // Optional callback after comment is posted
}

export function CommentInput({ postId, postOwnerId, postContentPreview, onCommentPosted }: CommentInputProps) {
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
    if (!postId || !postOwnerId) {
      toast({ title: "Error", description: "Post information is missing.", variant: "destructive" });
      return;
    }

    setIsSubmitting(true);
    try {
      const moderationResult = await moderateContent({
        content: data.text,
        contentType: 'text',
        ruleset: 'No hate speech, no harassment, no explicit content, no illegal activities.',
      });

      if (!moderationResult.isSafe) {
        toast({
          title: 'Content Moderation Failed',
          description: `Your comment was blocked for the following reason: ${moderationResult.reason}`,
          variant: 'destructive',
          duration: 7000,
        });
        setIsSubmitting(false);
        return;
      }

      const commentData: CommentDocument = {
        userId: user.uid,
        userDisplayName: user.displayName || 'Anonymous',
        userAvatarUrl: user.photoURL || null,
        text: data.text,
        createdAt: serverTimestamp(),
      };

      const postRef = doc(db, 'posts', postId);
      const commentsCollectionRef = collection(postRef, 'comments');

      await addDoc(commentsCollectionRef, commentData);
      await updateDoc(postRef, {
        commentsCount: increment(1),
      });

      // Create notification if commenter is not the post owner
      if (user.uid !== postOwnerId) {
        const notificationsColRef = collection(db, 'notifications');
        const commentTextPreview = data.text.substring(0, 70) + (data.text.length > 70 ? '...' : '');
        const notificationData: Omit<NotificationDocument, 'createdAt' | 'id'> = {
          recipientId: postOwnerId,
          actorId: user.uid,
          actorDisplayName: user.displayName || 'Someone',
          actorAvatarUrl: user.photoURL || null,
          type: 'comment',
          postId: postId,
          postContentPreview: postContentPreview || 'your post',
          commentText: commentTextPreview,
          isRead: false,
        };
        await addDoc(notificationsColRef, { ...notificationData, createdAt: serverTimestamp() });
      }

      reset();
      toast({ title: "Comment Posted!", description: "Your comment has been added." });
      onCommentPosted?.();
    } catch (error: any) {
      console.error("Error posting comment or creating notification:", error);
      toast({ title: "Error Posting Comment", description: error.message || "Could not post comment.", variant: "destructive" });
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
