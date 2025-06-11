
// src/types/notification.ts
import type { Timestamp, FieldValue } from 'firebase/firestore';

export interface NotificationDocument {
  recipientId: string;
  actorId: string;
  actorDisplayName: string | null;
  actorAvatarUrl: string | null;
  type: 'like' | 'comment' | 'follow_request' | 'follow_accept';
  postId?: string;
  postContentPreview?: string;
  commentText?: string;
  followRequestId?: string; // ID of the FollowRequest document
  createdAt: FieldValue;
  isRead: boolean;
  actionTaken?: 'accepted' | 'declined' | null; // For follow_request notifications
  originalFollowRequestId?: string; // Not typically needed for 'follow_request' itself, but for 'follow_accept'
}

export interface Notification extends Omit<NotificationDocument, 'createdAt'> {
  id: string;
  createdAt: Date;
  actionTaken?: 'accepted' | 'declined' | null;
}
