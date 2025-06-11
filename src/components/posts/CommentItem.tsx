// src/components/posts/CommentItem.tsx
'use client';

import type { Comment } from '@/types/post';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { formatDistanceToNow } from 'date-fns';
import Image from 'next/image';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { db } from '@/lib/firebase';
import { doc, deleteDoc, updateDoc, increment } from 'firebase/firestore';
import { Trash2, Loader2 } from 'lucide-react';
import { useState } from 'react';
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

interface CommentItemProps {
  comment: Comment;
  postId: string;
  onCommentDeleted?: (commentId: string) => void; // Callback to update parent
}

export function CommentItem({ comment, postId, onCommentDeleted }: CommentItemProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const isCommentOwner = user?.uid === comment.userId;

  const handleDeleteRequest = () => {
    setIsDeleteDialogOpen(true);
  };

  const confirmDeleteComment = async () => {
    if (!isCommentOwner) {
      toast({ title: "Error", description: "You can only delete your own comments.", variant: "destructive" });
      setIsDeleteDialogOpen(false);
      return;
    }
    setIsDeleting(true);
    try {
      const commentRef = doc(db, 'posts', postId, 'comments', comment.id);
      await deleteDoc(commentRef);

      const postRef = doc(db, 'posts', postId);
      await updateDoc(postRef, {
        commentsCount: increment(-1),
      });

      toast({ title: "Comment Deleted", description: "Your comment has been removed." });
      onCommentDeleted?.(comment.id); // Notify parent if needed
    } catch (error: any) {
      console.error("Error deleting comment:", error);
      toast({ title: "Deletion Failed", description: error.message || "Could not delete comment.", variant: "destructive" });
    } finally {
      setIsDeleting(false);
      setIsDeleteDialogOpen(false);
    }
  };

  return (
    <>
      <div className="flex space-x-3 py-3">
        <Avatar className="h-8 w-8">
          {comment.userAvatarUrl ? (
            <Image src={comment.userAvatarUrl} alt={comment.userDisplayName || 'User'} width={32} height={32} className="rounded-full" data-ai-hint="user avatar" />
          ) : (
            <AvatarFallback>{(comment.userDisplayName || 'U').charAt(0).toUpperCase()}</AvatarFallback>
          )}
        </Avatar>
        <div className="flex-1">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-foreground">{comment.userDisplayName || 'Anonymous User'}</span>
            <div className="flex items-center space-x-2">
              <span className="text-xs text-muted-foreground">
                {formatDistanceToNow(comment.createdAt, { addSuffix: true })}
              </span>
              {isCommentOwner && (
                <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-destructive" onClick={handleDeleteRequest} disabled={isDeleting}>
                  {isDeleting ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
                  <span className="sr-only">Delete comment</span>
                </Button>
              )}
            </div>
          </div>
          <p className="mt-1 text-sm text-foreground whitespace-pre-wrap">{comment.text}</p>
        </div>
      </div>
      {isCommentOwner && (
        <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete your comment.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={confirmDeleteComment} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground" disabled={isDeleting}>
                {isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
                Delete Comment
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </>
  );
}
