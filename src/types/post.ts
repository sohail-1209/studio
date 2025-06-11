// src/types/post.ts
import type { Timestamp, FieldValue } from 'firebase/firestore';

export interface PostDocument {
  userId: string;
  userDisplayName: string | null;
  userAvatarUrl: string | null;
  caption: string;
  imageUrl?: string | null;
  videoUrl?: string | null;
  likesCount: number;
  commentsCount: number;
  createdAt: FieldValue; // For writing to Firestore (serverTimestamp)
}

export interface Post extends Omit<PostDocument, 'createdAt'> {
  id: string; // Firestore document ID
  createdAt: Timestamp; // For reading from Firestore
}
