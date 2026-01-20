import type { Timestamp } from 'firebase/firestore';

/**
 * Document stored in Firestore at /users/{userId}/inventory/{paintId}
 * Using paintId as document ID for efficient lookups
 */
export interface UserInventoryDocument {
  paintId: string;
  ownedAt: Timestamp;
}

/**
 * Client-side representation with JS Date
 */
export interface UserInventoryItem {
  paintId: string;
  ownedAt: Date;
}
