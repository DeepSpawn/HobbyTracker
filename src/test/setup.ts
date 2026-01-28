import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock scrollIntoView for jsdom
Element.prototype.scrollIntoView = vi.fn();

// Mock HTMLVideoElement.play for scanner tests
HTMLVideoElement.prototype.play = vi.fn().mockImplementation(() => Promise.resolve());

// Mock navigator.mediaDevices for scanner tests
Object.defineProperty(navigator, 'mediaDevices', {
  value: {
    getUserMedia: vi.fn(),
    enumerateDevices: vi.fn().mockResolvedValue([]),
  },
  writable: true,
  configurable: true,
});

// Mock createObjectURL for video streams
URL.createObjectURL = vi.fn(() => 'mock-object-url');
URL.revokeObjectURL = vi.fn();

// Mock Firebase modules before any imports that use them
vi.mock('firebase/app', () => ({
  initializeApp: vi.fn(() => ({})),
}));

vi.mock('firebase/auth', () => ({
  getAuth: vi.fn(() => ({})),
  GoogleAuthProvider: vi.fn(),
  signInWithEmailAndPassword: vi.fn(),
  createUserWithEmailAndPassword: vi.fn(),
  signInWithPopup: vi.fn(),
  signOut: vi.fn(),
  onAuthStateChanged: vi.fn(),
}));

vi.mock('firebase/firestore', () => ({
  getFirestore: vi.fn(() => ({})),
  collection: vi.fn(),
  query: vi.fn(),
  where: vi.fn(),
  limit: vi.fn(),
  getDocs: vi.fn(),
  doc: vi.fn(),
  getDoc: vi.fn(),
  setDoc: vi.fn(),
  updateDoc: vi.fn(),
  serverTimestamp: vi.fn(),
}));

// Mock ZXing library for barcode scanner tests
vi.mock('@zxing/library', () => ({
  BrowserMultiFormatReader: vi.fn().mockImplementation(() => ({
    decodeFromVideoDevice: vi.fn(),
    decodeFromImageUrl: vi.fn(),
    reset: vi.fn(),
  })),
  BarcodeFormat: {
    EAN_13: 13,
    EAN_8: 8,
    UPC_A: 14,
    UPC_E: 15,
    CODE_128: 128,
    CODE_39: 39,
  },
  DecodeHintType: {
    POSSIBLE_FORMATS: 1,
    TRY_HARDER: 2,
  },
}));
