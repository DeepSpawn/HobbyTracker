import {
  doc,
  collection,
  setDoc,
  deleteDoc,
  serverTimestamp,
  onSnapshot,
  type Unsubscribe,
} from 'firebase/firestore';
import { db, COLLECTIONS } from '../../lib/firebase';

/**
 * Get the inventory collection reference for a user
 */
function getInventoryCollection(userId: string) {
  return collection(db, COLLECTIONS.USERS, userId, COLLECTIONS.USER_INVENTORY);
}

/**
 * Get a specific paint document reference in user's inventory
 */
function getInventoryDocRef(userId: string, paintId: string) {
  return doc(db, COLLECTIONS.USERS, userId, COLLECTIONS.USER_INVENTORY, paintId);
}

/**
 * Subscribe to user's inventory changes (real-time updates)
 */
export function subscribeToInventory(
  userId: string,
  callback: (paintIds: Set<string>) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  const inventoryRef = getInventoryCollection(userId);

  return onSnapshot(
    inventoryRef,
    (snapshot) => {
      const paintIds = new Set<string>();
      snapshot.forEach((doc) => {
        paintIds.add(doc.id);
      });
      callback(paintIds);
    },
    (error) => {
      console.error('Inventory subscription error:', error);
      onError?.(error);
    }
  );
}

/**
 * Add a paint to user's inventory
 */
export async function addPaintToInventory(
  userId: string,
  paintId: string
): Promise<void> {
  const docRef = getInventoryDocRef(userId, paintId);
  await setDoc(docRef, {
    paintId,
    ownedAt: serverTimestamp(),
  });
}

/**
 * Remove a paint from user's inventory
 */
export async function removePaintFromInventory(
  userId: string,
  paintId: string
): Promise<void> {
  const docRef = getInventoryDocRef(userId, paintId);
  await deleteDoc(docRef);
}

/**
 * Toggle paint ownership - returns new ownership state
 */
export async function togglePaintOwnership(
  userId: string,
  paintId: string,
  currentlyOwned: boolean
): Promise<boolean> {
  if (currentlyOwned) {
    await removePaintFromInventory(userId, paintId);
    return false;
  } else {
    await addPaintToInventory(userId, paintId);
    return true;
  }
}
