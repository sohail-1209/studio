// src/types/notification.ts
import type { Timestamp, FieldValue } from 'firebase/firestore';

export interface NotificationDocument {
  recipientId: string; // UID of the user receiving the notification
  actorId: string;     // UID of the user who performed theaction
  actorDisplayName: string | null;
  actorAvatarUrl: string | null;
  type: 'like' | 'comment'; // Type of notification
  postId: string;        // ID of the related post
  postContentPreview?: string; // e.g., start of caption, or "an image"
  commentText?: string; // Only for comment type, a snippet of the comment
  createdAt: FieldValue; // serverTimestamp
  isRead: boolean;       // To track if the notification has been seen
}

export interface Notification extends Omit<NotificationDocument, 'createdAt'> {
  id: string;          // Firestore document ID
  createdAt: Date;     // Converted for display
}
