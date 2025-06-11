
// src/types/chat.ts
import type { Timestamp, FieldValue } from 'firebase/firestore';

export interface ChatMessageDocument {
  senderId: string;
  text?: string | null; // Text is now optional
  timestamp: FieldValue; // For writing new messages
  imageUrl?: string | null;
  imagePath?: string | null; // To potentially delete from storage if message is deleted
  fileType?: string | null; // e.g., 'image/jpeg'
  dataAiHint?: string; // For images, if applicable
}

export interface ChatMessage extends Omit<ChatMessageDocument, 'timestamp'> {
  id: string;
  timestamp: Date; // Converted for display
  senderAvatar?: string; // Denormalized for convenience if needed, or fetched
}

export interface ChatSessionUserDetail {
  displayName: string | null;
  photoURL: string | null;
}

export interface ChatSessionDocument {
  userIds: string[]; // Array of two user UIDs
  userDetails: {
    [key: string]: ChatSessionUserDetail; // key is userId
  };
  lastMessageText: string | null;
  lastMessageSenderId: string | null;
  lastMessageTimestamp: FieldValue | null; // For updating with serverTimestamp
  updatedAt: FieldValue; // For sorting chats, use serverTimestamp
}

export interface ChatSession extends Omit<ChatSessionDocument, 'lastMessageTimestamp' | 'updatedAt'> {
  id: string; // Firestore document ID
  lastMessageTimestamp: Date | null; // Converted for display
  updatedAt: Date; // Converted for display
  otherUser?: ChatSessionUserDetail & { uid: string };
}
