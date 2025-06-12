// src/types/post.ts
import type { Timestamp, FieldValue } from 'firebase/firestore';

// For Comment documents in Firestore
export interface CommentDocument {
  userId: string;
  userDisplayName: string | null;
  userAvatarUrl: string | null;
  text: string;
  createdAt: FieldValue; // serverTimestamp
}

// For Comment objects in the application (after fetching)
export interface Comment extends Omit<CommentDocument, 'createdAt'> {
  id: string; // Firestore document ID
  createdAt: Date; // Converted to Date object
}

export interface PostDocument {
  userId: string;
  userDisplayName: string | null;
  userAvatarUrl: string | null;
  caption: string;
  imageUrl?: string | null;
  imagePath?: string | null; // Path in Firebase Storage for deletion
  videoUrl?: string | null;
  // videoPath?: string | null; // Path in Firebase Storage for video deletion
  likesCount: number;
  likedBy?: string[]; // Array of user UIDs who liked the post
  commentsCount: number;
  createdAt: FieldValue;
  dataAiHint?: string;
  isStory?: boolean; // Flag to indicate if this post is a story
  authorIsPrivate?: boolean; // Added for public/private account feature
}

export interface Post extends Omit<PostDocument, 'createdAt'> {
  id: string;
  createdAt: Date;
  isStory?: boolean; // Flag to indicate if this post is a story
  authorIsPrivate?: boolean; // Added for public/private account feature
}
