// src/components/posts/CommentItem.tsx
'use client';

import type { Comment } from '@/types/post';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { formatDistanceToNow } from 'date-fns';
import Image from 'next/image';

interface CommentItemProps {
  comment: Comment;
}

export function CommentItem({ comment }: CommentItemProps) {
  return (
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
          <span className="text-xs text-muted-foreground">
            {formatDistanceToNow(comment.createdAt, { addSuffix: true })}
          </span>
        </div>
        <p className="mt-1 text-sm text-foreground whitespace-pre-wrap">{comment.text}</p>
      </div>
    </div>
  );
}
