
// src/types/follow.ts
import type { Timestamp, FieldValue } from 'firebase/firestore';

export interface FollowRequestDocument {
  requesterId: string;
  requesterDisplayName: string | null;
  requesterAvatarUrl: string | null;
  recipientId: string;
  recipientDisplayName: string | null; 
  recipientAvatarUrl: string | null;  
  status: 'pending' | 'accepted' | 'declined';
  createdAt: FieldValue;
  updatedAt: FieldValue;
}

export interface FollowRequest extends Omit<FollowRequestDocument, 'createdAt' | 'updatedAt'> {
  id: string;
  createdAt: Date;
  updatedAt: Date;
}
