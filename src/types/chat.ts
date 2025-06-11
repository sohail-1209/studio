// src/types/chat.ts
import type { Timestamp, FieldValue } from 'firebase/firestore';

export interface ChatMessageDocument {
  senderId: string;
  text: string;
  timestamp: FieldValue; // For writing new messages
  imageUrl?: string | null;
  dataAiHint?: string;
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
  // Store details of both users for easier display in the chat list
  userDetails: {
    [key: string]: ChatSessionUserDetail; // key is userId
  };
  lastMessageText: string | null;
  lastMessageSenderId: string | null;
  lastMessageTimestamp: FieldValue | null; // For updating with serverTimestamp
  updatedAt: FieldValue; // For sorting chats, use serverTimestamp
  // Optional: unread counts per user
  // unreadCounts?: {
  //   [key: string]: number; // key is userId
  // };
}

export interface ChatSession extends Omit<ChatSessionDocument, 'lastMessageTimestamp' | 'updatedAt'> {
  id: string; // Firestore document ID
  lastMessageTimestamp: Date | null; // Converted for display
  updatedAt: Date; // Converted for display
  // Derived property for easier access to the other user in a 1:1 chat
  otherUser?: ChatSessionUserDetail & { uid: string };
}
