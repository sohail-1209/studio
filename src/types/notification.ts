
// src/types/notification.ts
import type { Timestamp, FieldValue } from 'firebase/firestore';

export interface NotificationDocument {
  recipientId: string;
  actorId: string;
  actorDisplayName: string | null;
  actorAvatarUrl: string | null;
  type: 'like' | 'comment' | 'follow_request' | 'follow_accept' | 'message';
  postId?: string; // For like, comment
  postContentPreview?: string; // For like, comment
  commentText?: string; // For comment
  followRequestId?: string; // For follow_request
  originalFollowRequestId?: string; // For follow_accept
  chatId?: string; // For message
  messagePreview?: string; // For message
  createdAt: FieldValue;
  isRead: boolean;
  actionTaken?: 'accepted' | 'declined' | null; // For follow_request
}

export interface Notification extends Omit<NotificationDocument, 'createdAt'> {
  id: string;
  createdAt: Date;
  actionTaken?: 'accepted' | 'declined' | null;
}
