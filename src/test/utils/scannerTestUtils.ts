import { vi } from 'vitest';

/**
 * Test utilities for barcode scanner tests
 */

/**
 * Create a mock MediaStream with tracks
 */
export function createMockMediaStream() {
  const mockTrack = {
    stop: vi.fn(),
    kind: 'video' as const,
    enabled: true,
    id: 'mock-track-id',
    label: 'Mock Camera',
    muted: false,
    readyState: 'live' as const,
  };

  return {
    getTracks: vi.fn(() => [mockTrack]),
    getVideoTracks: vi.fn(() => [mockTrack]),
    getAudioTracks: vi.fn(() => []),
    addTrack: vi.fn(),
    removeTrack: vi.fn(),
    clone: vi.fn(),
    active: true,
    id: 'mock-stream-id',
    _mockTrack: mockTrack, // Expose for assertions
  };
}

/**
 * Create a mock video element
 */
export function createMockVideoElement() {
  return {
    play: vi.fn().mockResolvedValue(undefined),
    pause: vi.fn(),
    srcObject: null as MediaStream | null,
    videoWidth: 1280,
    videoHeight: 720,
    readyState: 4,
  };
}

/**
 * Setup navigator.mediaDevices for successful camera access
 */
export function mockMediaDevicesSuccess() {
  const mockStream = createMockMediaStream();

  const mockMediaDevices = {
    getUserMedia: vi.fn().mockResolvedValue(mockStream),
    enumerateDevices: vi.fn().mockResolvedValue([
      { deviceId: 'camera1', kind: 'videoinput', label: 'Back Camera' },
    ]),
  };

  Object.defineProperty(navigator, 'mediaDevices', {
    value: mockMediaDevices,
    writable: true,
    configurable: true,
  });

  return { mockStream, mockMediaDevices };
}

/**
 * Setup navigator.mediaDevices to throw a permission error
 */
export function mockMediaDevicesPermissionDenied() {
  const error = new DOMException('Permission denied', 'NotAllowedError');

  const mockMediaDevices = {
    getUserMedia: vi.fn().mockRejectedValue(error),
    enumerateDevices: vi.fn().mockResolvedValue([]),
  };

  Object.defineProperty(navigator, 'mediaDevices', {
    value: mockMediaDevices,
    writable: true,
    configurable: true,
  });

  return { mockMediaDevices, error };
}

/**
 * Setup navigator.mediaDevices to throw a no camera error
 */
export function mockMediaDevicesNoCamera() {
  const error = new DOMException('No camera found', 'NotFoundError');

  const mockMediaDevices = {
    getUserMedia: vi.fn().mockRejectedValue(error),
    enumerateDevices: vi.fn().mockResolvedValue([]),
  };

  Object.defineProperty(navigator, 'mediaDevices', {
    value: mockMediaDevices,
    writable: true,
    configurable: true,
  });

  return { mockMediaDevices, error };
}

/**
 * Setup navigator.mediaDevices as undefined (not supported)
 */
export function mockNoMediaDevices() {
  Object.defineProperty(navigator, 'mediaDevices', {
    value: undefined,
    writable: true,
    configurable: true,
  });
}

/**
 * Restore navigator.mediaDevices to original state
 */
export function restoreMediaDevices() {
  // Reset to a default mock
  Object.defineProperty(navigator, 'mediaDevices', {
    value: {
      getUserMedia: vi.fn(),
      enumerateDevices: vi.fn().mockResolvedValue([]),
    },
    writable: true,
    configurable: true,
  });
}

/**
 * Create a mock ZXing BrowserMultiFormatReader
 */
export function createMockZXingReader() {
  let scanCallback: ((result: unknown, error: unknown) => void) | null = null;

  const mockReader = {
    decodeFromVideoDevice: vi.fn(
      (
        _deviceId: string | null,
        _videoElement: HTMLVideoElement,
        callback: (result: unknown, error: unknown) => void
      ) => {
        scanCallback = callback;
      }
    ),
    decodeFromImageUrl: vi.fn(),
    reset: vi.fn(),
    _simulateScan: (barcode: string) => {
      if (scanCallback) {
        scanCallback({ getText: () => barcode }, null);
      }
    },
    _simulateError: (error: Error) => {
      if (scanCallback) {
        scanCallback(null, error);
      }
    },
    _simulateNotFound: () => {
      if (scanCallback) {
        const notFoundError = new Error('No barcode found');
        notFoundError.name = 'NotFoundException';
        scanCallback(null, notFoundError);
      }
    },
  };

  return mockReader;
}

/**
 * Create a mock ZXing scan result
 */
export function createMockScanResult(barcode: string) {
  return {
    getText: () => barcode,
    getBarcodeFormat: () => 13, // EAN_13
    getResultPoints: () => [],
    getTimestamp: () => Date.now(),
  };
}

/**
 * Wait for a specified amount of time (for debounce testing)
 */
export function waitMs(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Advance fake timers and flush promises
 */
export async function advanceTimersAndFlush(ms: number): Promise<void> {
  vi.advanceTimersByTime(ms);
  await vi.runAllTimersAsync();
}
