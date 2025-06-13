
// src/types/chat.ts
import type { Timestamp, FieldValue } from 'firebase/firestore';

export interface ChatMessageDocument {
  senderId: string;
  text?: string | null;
  timestamp: FieldValue;
  imageUrl?: string | null;
  imagePath?: string | null;
  fileType?: string | null;
  dataAiHint?: string;
}

export interface ChatMessage extends Omit<ChatMessageDocument, 'timestamp'> {
  id: string;
  timestamp: Date;
  senderAvatar?: string; // Potentially useful for groups to always have this
  senderDisplayName?: string; // Potentially useful for groups
}

export interface ChatSessionUserDetail {
  displayName: string | null;
  photoURL: string | null;
}

export interface ChatSessionDocument {
  userIds: string[]; // Array of user UIDs (2 for 1:1, >2 for group)
  userDetails: {
    [key: string]: ChatSessionUserDetail; // key is userId
  };
  lastMessageText: string | null;
  lastMessageSenderId: string | null;
  lastMessageTimestamp: FieldValue | null;
  updatedAt: FieldValue;
  typing?: {
    [userId: string]: boolean;
  };
  // Group chat specific fields
  isGroupChat?: boolean;
  groupName?: string;
  groupAvatarUrl?: string | null; // URL for the group's custom avatar
  groupAdminIds?: string[]; // Optional: for future admin features
}

export interface ChatSession extends Omit<ChatSessionDocument, 'lastMessageTimestamp' | 'updatedAt'> {
  id: string; // Firestore document ID
  lastMessageTimestamp: Date | null;
  updatedAt: Date;
  otherUser?: ChatSessionUserDetail & { uid: string }; // Primarily for 1:1 chats
  // Group chat specific fields are directly available if isGroupChat is true
  isGroupChat?: boolean;
  groupName?: string;
  groupAvatarUrl?: string | null;
  typing?: {
    [userId: string]: boolean;
  };
}
