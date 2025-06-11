
// src/types/notification.ts
import type { Timestamp, FieldValue } from 'firebase/firestore';

export interface NotificationDocument {
  recipientId: string; 
  actorId: string;     
  actorDisplayName: string | null;
  actorAvatarUrl: string | null;
  type: 'like' | 'comment' | 'follow_request' | 'follow_accept'; 
  postId?: string;        // Optional: ID of the related post (for likes/comments)
  postContentPreview?: string; 
  commentText?: string; 
  followRequestId?: string; // Optional: ID of the related follow request
  createdAt: FieldValue; 
  isRead: boolean;       
}

export interface Notification extends Omit<NotificationDocument, 'createdAt'> {
  id: string;          
  createdAt: Date;     
}
