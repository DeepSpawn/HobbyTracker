import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useBarcodeScanner } from './useBarcodeScanner';
import * as paintService from '../services/paint';
import * as nativeDetector from '../services/scanner/nativeBarcodeDetector';
import {
  mockCitadelPaint,
  mockNotFoundBarcode,
} from '../test/fixtures/mockPaints';
import { EXPECTED_BARCODES } from '../test/fixtures/barcodeImages';

// Mock paint service
vi.mock('../services/paint', () => ({
  getPaintBySku: vi.fn(),
}));

// Mock ZXing library (only BarcodeFormat is needed now)
vi.mock('@zxing/library', () => ({
  BarcodeFormat: {
    EAN_13: 13,
    EAN_8: 8,
    UPC_A: 14,
    UPC_E: 15,
    CODE_128: 128,
    CODE_39: 39,
  },
}));

// Mock native barcode detector
vi.mock('../services/scanner/nativeBarcodeDetector', () => ({
  isNativeBarcodeDetectorSupported: vi.fn(() => true),
  detectBarcodeNative: vi.fn(() => Promise.resolve(null)),
  getNativeSupportedFormats: vi.fn(() => Promise.resolve(['ean_13'])),
}));

// Mock barcodeDetection (ZXing fallback)
vi.mock('../services/scanner/barcodeDetection', () => ({
  detectBarcodeFromRgba: vi.fn(() => null),
}));

const mockGetPaintBySku = vi.mocked(paintService.getPaintBySku);
const mockDetectBarcodeNative = vi.mocked(nativeDetector.detectBarcodeNative);

// Capture requestAnimationFrame callbacks for manual control
let rafCallbacks: Array<(time: number) => void> = [];
let rafId = 0;
let perfNowValue = 200; // Start past the throttle interval
let dateNowValue = 5000; // Controllable Date.now() for debounce testing (starts well past debounce window from 0)

// Mock MediaStream and tracks
function createMockStream() {
  const mockTrack = {
    stop: vi.fn(),
    kind: 'video',
    getSettings: () => ({ width: 1280, height: 720, facingMode: 'environment', frameRate: 30 }),
  };
  return {
    getTracks: () => [mockTrack],
    getVideoTracks: () => [mockTrack],
    _track: mockTrack,
  };
}

// Mock video element with properties needed by the scan loop
function createMockVideoElement() {
  return {
    play: vi.fn().mockResolvedValue(undefined),
    srcObject: null,
    readyState: 4,
    HAVE_ENOUGH_DATA: 4,
    videoWidth: 1280,
    videoHeight: 720,
  } as unknown as HTMLVideoElement;
}

/**
 * Run stored requestAnimationFrame callbacks N times.
 * Each iteration processes all pending rAF callbacks, then collects
 * any new ones that were scheduled during execution.
 */
async function runScanLoop(iterations = 1) {
  for (let i = 0; i < iterations; i++) {
    perfNowValue += 200; // Advance past throttle interval
    dateNowValue += 200; // Advance Date.now() in step with performance.now()
    const cbs = [...rafCallbacks];
    rafCallbacks = [];
    for (const cb of cbs) {
      await act(async () => {
        cb(perfNowValue);
        await new Promise((r) => setTimeout(r, 0));
      });
    }
  }
}

describe('useBarcodeScanner', () => {
  let mockStream: ReturnType<typeof createMockStream>;
  let mockGetUserMedia: ReturnType<typeof vi.fn>;
  let mockVideoElement: HTMLVideoElement;
  let originalRaf: typeof requestAnimationFrame;
  let originalCaf: typeof cancelAnimationFrame;
  let originalPerfNow: typeof performance.now;

  beforeEach(() => {
    vi.clearAllMocks();
    mockGetPaintBySku.mockResolvedValue(null);
    mockDetectBarcodeNative.mockResolvedValue(null);
    mockStream = createMockStream();
    mockGetUserMedia = vi.fn().mockResolvedValue(mockStream);
    mockVideoElement = createMockVideoElement();
    rafCallbacks = [];
    rafId = 0;
    perfNowValue = 200;
    dateNowValue = 5000;

    // Mock navigator.mediaDevices
    Object.defineProperty(globalThis.navigator, 'mediaDevices', {
      value: { getUserMedia: mockGetUserMedia },
      writable: true,
      configurable: true,
    });

    // Mock requestAnimationFrame to store callbacks
    originalRaf = globalThis.requestAnimationFrame;
    originalCaf = globalThis.cancelAnimationFrame;
    originalPerfNow = performance.now;

    globalThis.requestAnimationFrame = vi.fn((cb: FrameRequestCallback) => {
      rafId++;
      rafCallbacks.push(cb);
      return rafId;
    }) as unknown as typeof requestAnimationFrame;

    globalThis.cancelAnimationFrame = vi.fn();

    // Mock performance.now to control throttling
    vi.spyOn(performance, 'now').mockImplementation(() => perfNowValue);

    // Mock Date.now to control debounce
    vi.spyOn(Date, 'now').mockImplementation(() => dateNowValue);
  });

  afterEach(() => {
    globalThis.requestAnimationFrame = originalRaf;
    globalThis.cancelAnimationFrame = originalCaf;
    performance.now = originalPerfNow;
    vi.useRealTimers();
  });

  describe('initial state', () => {
    it('initializes with idle status', () => {
      const { result } = renderHook(() => useBarcodeScanner());
      expect(result.current.status).toBe('idle');
    });

    it('initializes with null error', () => {
      const { result } = renderHook(() => useBarcodeScanner());
      expect(result.current.error).toBeNull();
    });

    it('initializes with null lastScannedBarcode', () => {
      const { result } = renderHook(() => useBarcodeScanner());
      expect(result.current.lastScannedBarcode).toBeNull();
    });

    it('initializes with null lastMatchedPaint', () => {
      const { result } = renderHook(() => useBarcodeScanner());
      expect(result.current.lastMatchedPaint).toBeNull();
    });

    it('provides a video ref', () => {
      const { result } = renderHook(() => useBarcodeScanner());
      expect(result.current.videoRef).toBeDefined();
    });

    it('provides control functions', () => {
      const { result } = renderHook(() => useBarcodeScanner());
      expect(typeof result.current.startScanning).toBe('function');
      expect(typeof result.current.stopScanning).toBe('function');
      expect(typeof result.current.resetError).toBe('function');
      expect(typeof result.current.resetLastScan).toBe('function');
    });
  });

  describe('startScanning', () => {
    it('requests camera with correct constraints', async () => {
      const { result } = renderHook(() => useBarcodeScanner());

      await act(async () => {
        await result.current.startScanning();
      });

      expect(mockGetUserMedia).toHaveBeenCalledWith({
        video: {
          facingMode: 'environment',
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      });
    });

    it('transitions to scanning status after camera access', async () => {
      const { result } = renderHook(() => useBarcodeScanner());
      Object.defineProperty(result.current.videoRef, 'current', {
        value: mockVideoElement,
        writable: true,
      });

      await act(async () => {
        await result.current.startScanning();
      });

      expect(result.current.status).toBe('scanning');
    });

    it('starts the rAF-based scan loop', async () => {
      const { result } = renderHook(() => useBarcodeScanner());
      Object.defineProperty(result.current.videoRef, 'current', {
        value: mockVideoElement,
        writable: true,
      });

      await act(async () => {
        await result.current.startScanning();
      });

      // Scan loop should have scheduled at least one rAF callback
      expect(globalThis.requestAnimationFrame).toHaveBeenCalled();
    });
  });

  describe('error handling', () => {
    it('sets permission_denied error when camera access denied', async () => {
      const error = new DOMException('Permission denied', 'NotAllowedError');
      const rejectingGetUserMedia = vi.fn().mockRejectedValue(error);
      Object.defineProperty(globalThis.navigator, 'mediaDevices', {
        value: { getUserMedia: rejectingGetUserMedia },
        writable: true,
        configurable: true,
      });

      const { result } = renderHook(() => useBarcodeScanner());

      await act(async () => {
        try {
          await result.current.startScanning();
        } catch { /* hook catches internally */ }
      });

      expect(rejectingGetUserMedia).toHaveBeenCalled();
      expect(result.current.error?.type).toBe('permission_denied');
      expect(result.current.error?.message).toContain('Camera access was denied');
    });

    it('sets no_camera error when no camera found', async () => {
      const error = new DOMException('No camera', 'NotFoundError');
      const rejectingGetUserMedia = vi.fn().mockRejectedValue(error);
      Object.defineProperty(globalThis.navigator, 'mediaDevices', {
        value: { getUserMedia: rejectingGetUserMedia },
        writable: true,
        configurable: true,
      });

      const { result } = renderHook(() => useBarcodeScanner());

      await act(async () => {
        try {
          await result.current.startScanning();
        } catch { /* hook catches internally */ }
      });

      expect(rejectingGetUserMedia).toHaveBeenCalled();
      expect(result.current.error?.type).toBe('no_camera');
      expect(result.current.error?.message).toContain('No camera found');
    });

    it('sets not_supported error when mediaDevices not available', async () => {
      Object.defineProperty(globalThis.navigator, 'mediaDevices', {
        value: undefined,
        writable: true,
        configurable: true,
      });

      const { result } = renderHook(() => useBarcodeScanner());

      await act(async () => {
        await result.current.startScanning();
      });

      expect(result.current.status).toBe('error');
      expect(result.current.error?.type).toBe('not_supported');
    });

    it('resetError clears error and returns to idle', async () => {
      Object.defineProperty(globalThis.navigator, 'mediaDevices', {
        value: undefined,
        writable: true,
        configurable: true,
      });

      const { result } = renderHook(() => useBarcodeScanner());

      await act(async () => {
        await result.current.startScanning();
      });
      expect(result.current.error).not.toBeNull();

      act(() => {
        result.current.resetError();
      });

      expect(result.current.error).toBeNull();
      expect(result.current.status).toBe('idle');
    });
  });

  describe('stopScanning', () => {
    it('transitions to idle status when stopped', async () => {
      const { result } = renderHook(() => useBarcodeScanner());
      Object.defineProperty(result.current.videoRef, 'current', {
        value: mockVideoElement,
        writable: true,
      });

      await act(async () => {
        await result.current.startScanning();
      });
      expect(result.current.status).toBe('scanning');

      act(() => {
        result.current.stopScanning();
      });

      expect(result.current.status).toBe('idle');
    });

    it('stops media stream tracks when stopped', async () => {
      const { result } = renderHook(() => useBarcodeScanner());
      Object.defineProperty(result.current.videoRef, 'current', {
        value: mockVideoElement,
        writable: true,
      });

      await act(async () => {
        await result.current.startScanning();
      });

      act(() => {
        result.current.stopScanning();
      });

      expect(mockStream._track.stop).toHaveBeenCalled();
    });
  });

  describe('barcode detection', () => {
    it('sets lastScannedBarcode when barcode detected', async () => {
      mockGetPaintBySku.mockResolvedValue(mockCitadelPaint);
      // Need 2 consecutive reads for confirmation
      mockDetectBarcodeNative
        .mockResolvedValueOnce({ text: EXPECTED_BARCODES.citadel, format: 'ean_13' })
        .mockResolvedValueOnce({ text: EXPECTED_BARCODES.citadel, format: 'ean_13' });

      const { result } = renderHook(() => useBarcodeScanner());
      Object.defineProperty(result.current.videoRef, 'current', {
        value: mockVideoElement,
        writable: true,
      });

      await act(async () => {
        await result.current.startScanning();
      });

      // Run scan loop twice for consecutive read confirmation
      await runScanLoop(2);

      await waitFor(() => {
        expect(result.current.lastScannedBarcode).toBe(EXPECTED_BARCODES.citadel);
      });
    });

    it('looks up paint by barcode', async () => {
      mockGetPaintBySku.mockResolvedValue(mockCitadelPaint);
      mockDetectBarcodeNative
        .mockResolvedValueOnce({ text: EXPECTED_BARCODES.citadel, format: 'ean_13' })
        .mockResolvedValueOnce({ text: EXPECTED_BARCODES.citadel, format: 'ean_13' });

      const { result } = renderHook(() => useBarcodeScanner());
      Object.defineProperty(result.current.videoRef, 'current', {
        value: mockVideoElement,
        writable: true,
      });

      await act(async () => {
        await result.current.startScanning();
      });

      await runScanLoop(2);

      await waitFor(() => {
        expect(mockGetPaintBySku).toHaveBeenCalledWith(EXPECTED_BARCODES.citadel);
      });
    });
  });

  describe('paint lookup', () => {
    it('sets lastMatchedPaint when paint found', async () => {
      mockGetPaintBySku.mockResolvedValue(mockCitadelPaint);
      mockDetectBarcodeNative
        .mockResolvedValueOnce({ text: EXPECTED_BARCODES.citadel, format: 'ean_13' })
        .mockResolvedValueOnce({ text: EXPECTED_BARCODES.citadel, format: 'ean_13' });

      const { result } = renderHook(() => useBarcodeScanner());
      Object.defineProperty(result.current.videoRef, 'current', {
        value: mockVideoElement,
        writable: true,
      });

      await act(async () => {
        await result.current.startScanning();
      });

      await runScanLoop(2);

      await waitFor(() => {
        expect(result.current.lastMatchedPaint).toEqual(mockCitadelPaint);
      });
    });

    it('sets lastMatchedPaint to null when paint not found', async () => {
      mockGetPaintBySku.mockResolvedValue(null);
      mockDetectBarcodeNative
        .mockResolvedValueOnce({ text: mockNotFoundBarcode, format: 'ean_13' })
        .mockResolvedValueOnce({ text: mockNotFoundBarcode, format: 'ean_13' });

      const { result } = renderHook(() => useBarcodeScanner());
      Object.defineProperty(result.current.videoRef, 'current', {
        value: mockVideoElement,
        writable: true,
      });

      await act(async () => {
        await result.current.startScanning();
      });

      await runScanLoop(2);

      await waitFor(() => {
        expect(result.current.lastMatchedPaint).toBeNull();
      });
    });
  });

  describe('callbacks', () => {
    it('calls onBarcodeDetected when barcode scanned', async () => {
      mockGetPaintBySku.mockResolvedValue(mockCitadelPaint);
      mockDetectBarcodeNative
        .mockResolvedValueOnce({ text: EXPECTED_BARCODES.citadel, format: 'ean_13' })
        .mockResolvedValueOnce({ text: EXPECTED_BARCODES.citadel, format: 'ean_13' });

      const onBarcodeDetected = vi.fn();
      const { result } = renderHook(() =>
        useBarcodeScanner({ onBarcodeDetected })
      );
      Object.defineProperty(result.current.videoRef, 'current', {
        value: mockVideoElement,
        writable: true,
      });

      await act(async () => {
        await result.current.startScanning();
      });

      await runScanLoop(2);

      await waitFor(() => {
        expect(onBarcodeDetected).toHaveBeenCalledWith(EXPECTED_BARCODES.citadel);
      });
    });

    it('calls onPaintFound when paint matched', async () => {
      mockGetPaintBySku.mockResolvedValue(mockCitadelPaint);
      mockDetectBarcodeNative
        .mockResolvedValueOnce({ text: EXPECTED_BARCODES.citadel, format: 'ean_13' })
        .mockResolvedValueOnce({ text: EXPECTED_BARCODES.citadel, format: 'ean_13' });

      const onPaintFound = vi.fn();
      const { result } = renderHook(() => useBarcodeScanner({ onPaintFound }));
      Object.defineProperty(result.current.videoRef, 'current', {
        value: mockVideoElement,
        writable: true,
      });

      await act(async () => {
        await result.current.startScanning();
      });

      await runScanLoop(2);

      await waitFor(() => {
        expect(onPaintFound).toHaveBeenCalledWith(mockCitadelPaint);
      });
    });

    it('calls onPaintNotFound when no match', async () => {
      mockGetPaintBySku.mockResolvedValue(null);
      mockDetectBarcodeNative
        .mockResolvedValueOnce({ text: mockNotFoundBarcode, format: 'ean_13' })
        .mockResolvedValueOnce({ text: mockNotFoundBarcode, format: 'ean_13' });

      const onPaintNotFound = vi.fn();
      const { result } = renderHook(() => useBarcodeScanner({ onPaintNotFound }));
      Object.defineProperty(result.current.videoRef, 'current', {
        value: mockVideoElement,
        writable: true,
      });

      await act(async () => {
        await result.current.startScanning();
      });

      await runScanLoop(2);

      await waitFor(() => {
        expect(onPaintNotFound).toHaveBeenCalledWith(mockNotFoundBarcode);
      });
    });
  });

  describe('debouncing', () => {
    it('debounces rapid scans within 1500ms window', async () => {
      mockGetPaintBySku.mockResolvedValue(mockCitadelPaint);
      const onBarcodeDetected = vi.fn();
      const { result } = renderHook(() =>
        useBarcodeScanner({ onBarcodeDetected })
      );
      Object.defineProperty(result.current.videoRef, 'current', {
        value: mockVideoElement,
        writable: true,
      });

      await act(async () => {
        await result.current.startScanning();
      });

      // First scan - 2 consecutive reads
      mockDetectBarcodeNative
        .mockResolvedValueOnce({ text: EXPECTED_BARCODES.citadel, format: 'ean_13' })
        .mockResolvedValueOnce({ text: EXPECTED_BARCODES.citadel, format: 'ean_13' });
      await runScanLoop(2);

      await waitFor(() => {
        expect(onBarcodeDetected).toHaveBeenCalledTimes(1);
      });

      // Rapid subsequent scan within debounce window (perfNow only advanced 400ms)
      mockDetectBarcodeNative
        .mockResolvedValueOnce({ text: EXPECTED_BARCODES.citadel, format: 'ean_13' })
        .mockResolvedValueOnce({ text: EXPECTED_BARCODES.citadel, format: 'ean_13' });
      await runScanLoop(2);

      // Still only 1 call (debounced)
      expect(onBarcodeDetected).toHaveBeenCalledTimes(1);
    });

    it('allows new scan after debounce period', async () => {
      mockGetPaintBySku.mockResolvedValue(mockCitadelPaint);
      const onBarcodeDetected = vi.fn();
      const { result } = renderHook(() =>
        useBarcodeScanner({ onBarcodeDetected })
      );
      Object.defineProperty(result.current.videoRef, 'current', {
        value: mockVideoElement,
        writable: true,
      });

      await act(async () => {
        await result.current.startScanning();
      });

      // First scan
      mockDetectBarcodeNative
        .mockResolvedValueOnce({ text: EXPECTED_BARCODES.citadel, format: 'ean_13' })
        .mockResolvedValueOnce({ text: EXPECTED_BARCODES.citadel, format: 'ean_13' });
      await runScanLoop(2);

      await waitFor(() => {
        expect(onBarcodeDetected).toHaveBeenCalledTimes(1);
      });

      // Advance past debounce period (1500ms)
      perfNowValue += 2000;
      dateNowValue += 2000;

      // Second scan with different barcode
      mockDetectBarcodeNative
        .mockResolvedValueOnce({ text: EXPECTED_BARCODES.vallejo, format: 'ean_13' })
        .mockResolvedValueOnce({ text: EXPECTED_BARCODES.vallejo, format: 'ean_13' });
      await runScanLoop(2);

      await waitFor(() => {
        expect(onBarcodeDetected).toHaveBeenCalledTimes(2);
        expect(onBarcodeDetected).toHaveBeenNthCalledWith(1, EXPECTED_BARCODES.citadel);
        expect(onBarcodeDetected).toHaveBeenNthCalledWith(2, EXPECTED_BARCODES.vallejo);
      });
    });
  });

  describe('resetLastScan', () => {
    it('clears lastScannedBarcode and lastMatchedPaint', async () => {
      mockGetPaintBySku.mockResolvedValue(mockCitadelPaint);
      mockDetectBarcodeNative
        .mockResolvedValueOnce({ text: EXPECTED_BARCODES.citadel, format: 'ean_13' })
        .mockResolvedValueOnce({ text: EXPECTED_BARCODES.citadel, format: 'ean_13' });

      const { result } = renderHook(() => useBarcodeScanner());
      Object.defineProperty(result.current.videoRef, 'current', {
        value: mockVideoElement,
        writable: true,
      });

      await act(async () => {
        await result.current.startScanning();
      });

      await runScanLoop(2);

      await waitFor(() => {
        expect(result.current.lastScannedBarcode).toBe(EXPECTED_BARCODES.citadel);
      });

      act(() => {
        result.current.resetLastScan();
      });

      expect(result.current.lastScannedBarcode).toBeNull();
      expect(result.current.lastMatchedPaint).toBeNull();
    });
  });

  describe('cleanup', () => {
    it('stops scanning on unmount', async () => {
      const { result, unmount } = renderHook(() => useBarcodeScanner());
      Object.defineProperty(result.current.videoRef, 'current', {
        value: mockVideoElement,
        writable: true,
      });

      await act(async () => {
        await result.current.startScanning();
      });

      unmount();

      expect(mockStream._track.stop).toHaveBeenCalled();
    });
  });

  describe('continuous vs single-shot mode', () => {
    it('returns to scanning status after scan in continuous mode (default)', async () => {
      mockGetPaintBySku.mockResolvedValue(mockCitadelPaint);
      mockDetectBarcodeNative
        .mockResolvedValueOnce({ text: EXPECTED_BARCODES.citadel, format: 'ean_13' })
        .mockResolvedValueOnce({ text: EXPECTED_BARCODES.citadel, format: 'ean_13' });

      const { result } = renderHook(() => useBarcodeScanner());
      Object.defineProperty(result.current.videoRef, 'current', {
        value: mockVideoElement,
        writable: true,
      });

      await act(async () => {
        await result.current.startScanning();
      });

      await runScanLoop(2);

      await waitFor(() => {
        expect(result.current.status).toBe('scanning');
      });
    });

    it('returns to idle in single-shot mode', async () => {
      mockGetPaintBySku.mockResolvedValue(mockCitadelPaint);
      mockDetectBarcodeNative
        .mockResolvedValueOnce({ text: EXPECTED_BARCODES.citadel, format: 'ean_13' })
        .mockResolvedValueOnce({ text: EXPECTED_BARCODES.citadel, format: 'ean_13' });

      const { result } = renderHook(() => useBarcodeScanner({ continuous: false }));
      Object.defineProperty(result.current.videoRef, 'current', {
        value: mockVideoElement,
        writable: true,
      });

      await act(async () => {
        await result.current.startScanning();
      });

      await runScanLoop(2);

      await waitFor(() => {
        expect(result.current.status).toBe('idle');
      });
    });
  });
});
