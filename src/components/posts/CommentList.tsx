// src/components/posts/CommentList.tsx
'use client';

import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { collection, query, orderBy, onSnapshot, Timestamp } from 'firebase/firestore';
import type { Comment } from '@/types/post';
import { CommentItem } from './CommentItem';
import { Skeleton } from '@/components/ui/skeleton';
import { MessageCircle } from 'lucide-react';

interface CommentListProps {
  postId: string;
}

export function CommentList({ postId }: CommentListProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loadingComments, setLoadingComments] = useState(true);

  useEffect(() => {
    if (!postId) {
      setLoadingComments(false);
      return;
    }

    const commentsCollectionRef = collection(db, 'posts', postId, 'comments');
    const q = query(commentsCollectionRef, orderBy('createdAt', 'asc'));

    setLoadingComments(true);
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const fetchedComments = snapshot.docs.map((doc) => {
          const data = doc.data();
          return {
            id: doc.id,
            ...data,
            createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : new Date(),
          } as Comment;
        });
        setComments(fetchedComments);
        setLoadingComments(false);
      },
      (error) => {
        console.error(`Error fetching comments for post ${postId}:`, error);
        setLoadingComments(false);
        // Optionally show a toast error
      }
    );

    return () => unsubscribe();
  }, [postId]);

  if (loadingComments) {
    return (
      <div className="space-y-3 py-3">
        {[...Array(2)].map((_, i) => (
          <div key={i} className="flex space-x-3">
            <Skeleton className="h-8 w-8 rounded-full" />
            <div className="flex-1 space-y-1">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-3 w-full" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (comments.length === 0) {
    return (
      <div className="py-6 text-center text-muted-foreground">
        <MessageCircle className="mx-auto h-8 w-8 mb-2" />
        <p className="text-sm">No comments yet. Be the first to comment!</p>
      </div>
    );
  }

  return (
    <div className="divide-y">
      {comments.map((comment) => (
        <CommentItem key={comment.id} comment={comment} />
      ))}
    </div>
  );
}
