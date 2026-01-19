/**
 * User preferences stored in Firestore
 */
export interface UserPreferences {
  theme?: 'light' | 'dark' | 'system';
}

/**
 * User profile document stored in Firestore at /users/{uid}
 */
export interface UserProfile {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  createdAt: Date;
  updatedAt: Date;
  preferences: UserPreferences;
}

/**
 * Data required to create a new user profile
 */
export interface CreateUserProfileData {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
}
