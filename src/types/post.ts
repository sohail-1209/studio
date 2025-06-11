// src/types/post.ts
import type { Timestamp, FieldValue } from 'firebase/firestore';

export interface PostDocument {
  userId: string;
  userDisplayName: string | null;
  userAvatarUrl: string | null;
  caption: string;
  imageUrl?: string | null;
  videoUrl?: string | null; // Kept for future, not used in current implementation
  likesCount: number;
  commentsCount: number;
  createdAt: FieldValue; // For writing to Firestore (serverTimestamp)
  dataAiHint?: string; // Optional AI hint for images
}

export interface Post extends Omit<PostDocument, 'createdAt'> {
  id: string; // Firestore document ID
  createdAt: Date; // For reading from Firestore, converted to Date object
}
