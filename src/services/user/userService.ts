import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  serverTimestamp,
  type Timestamp,
} from 'firebase/firestore';
import { db, COLLECTIONS } from '../../lib/firebase';
import type {
  UserProfile,
  UserPreferences,
  CreateUserProfileData,
} from '../../types/user';

/**
 * Firestore document structure (uses Timestamps instead of Dates)
 */
interface UserProfileDocument {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  preferences: UserPreferences;
}

/**
 * Convert Firestore document to UserProfile
 */
function toUserProfile(doc: UserProfileDocument): UserProfile {
  return {
    uid: doc.uid,
    email: doc.email,
    displayName: doc.displayName,
    photoURL: doc.photoURL,
    createdAt: doc.createdAt.toDate(),
    updatedAt: doc.updatedAt.toDate(),
    preferences: doc.preferences,
  };
}

/**
 * Get user document reference
 */
function getUserDocRef(uid: string) {
  return doc(db, COLLECTIONS.USERS, uid);
}

/**
 * Create or update a user profile in Firestore.
 * If the user doesn't exist, creates a new profile with createdAt.
 * If the user exists, updates displayName, photoURL, and updatedAt.
 */
export async function createOrUpdateUserProfile(
  data: CreateUserProfileData
): Promise<void> {
  const userRef = getUserDocRef(data.uid);
  const userSnap = await getDoc(userRef);

  if (!userSnap.exists()) {
    // Create new user profile
    await setDoc(userRef, {
      uid: data.uid,
      email: data.email,
      displayName: data.displayName,
      photoURL: data.photoURL,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      preferences: {},
    });
  } else {
    // Update existing user profile (sync auth data)
    await updateDoc(userRef, {
      displayName: data.displayName,
      photoURL: data.photoURL,
      updatedAt: serverTimestamp(),
    });
  }
}

/**
 * Get a user profile from Firestore
 */
export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  const userRef = getUserDocRef(uid);
  const userSnap = await getDoc(userRef);

  if (!userSnap.exists()) {
    return null;
  }

  return toUserProfile(userSnap.data() as UserProfileDocument);
}

/**
 * Update user preferences
 */
export async function updateUserPreferences(
  uid: string,
  preferences: Partial<UserPreferences>
): Promise<void> {
  const userRef = getUserDocRef(uid);

  await updateDoc(userRef, {
    preferences,
    updatedAt: serverTimestamp(),
  });
}
