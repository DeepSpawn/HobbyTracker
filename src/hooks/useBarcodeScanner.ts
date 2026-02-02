import { useState, useRef, useCallback, useEffect } from 'react';
import { BarcodeFormat } from '@zxing/library';
import type { Paint } from '../types/paint';
import { getPaintBySku } from '../services/paint';
import { detectBarcodeFromRgba } from '../services/scanner/barcodeDetection';
import {
  isNativeBarcodeDetectorSupported,
  detectBarcodeNative,
  getNativeSupportedFormats,
} from '../services/scanner/nativeBarcodeDetector';

export type ScannerStatus =
  | 'idle'
  | 'requesting'
  | 'scanning'
  | 'processing'
  | 'error';

export type ScannerErrorType =
  | 'permission_denied'
  | 'no_camera'
  | 'not_supported'
  | 'unknown';

export interface ScannerError {
  type: ScannerErrorType;
  message: string;
}

export type ScannerBackend = 'native' | 'zxing';

export interface DebugEvent {
  timestamp: number;
  type: 'status_change' | 'barcode_detected' | 'paint_lookup' | 'error' | 'camera_info' | 'zxing_callback';
  message: string;
  data?: unknown;
}

export interface UseBarcodesScannerOptions {
  onBarcodeDetected?: (barcode: string) => void;
  onPaintFound?: (paint: Paint) => void;
  onPaintNotFound?: (barcode: string) => void;
  continuous?: boolean;
  debug?: boolean;
  onDebugEvent?: (event: DebugEvent) => void;
}

export interface UseBarcodesScannerReturn {
  status: ScannerStatus;
  error: ScannerError | null;
  lastScannedBarcode: string | null;
  lastMatchedPaint: Paint | null;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  startScanning: () => Promise<void>;
  stopScanning: () => void;
  resetError: () => void;
  resetLastScan: () => void;
  debugEvents: DebugEvent[];
  streamInfo: StreamInfo | null;
  activeBackend: ScannerBackend | null;
}

export interface StreamInfo {
  width: number;
  height: number;
  facingMode: string;
  frameRate: number;
  label: string;
}

const SCAN_DEBOUNCE_MS = 1500;
const MAX_DEBUG_EVENTS = 100;
/** Target ~10 fps for the scan loop */
const SCAN_INTERVAL_MS = 100;
/** Crop to center 60% of frame for ZXing fallback */
const CENTER_CROP_RATIO = 0.6;

function createScannerError(err: unknown): ScannerError {
  if (err instanceof DOMException) {
    if (err.name === 'NotAllowedError') {
      return {
        type: 'permission_denied',
        message: 'Camera access was denied. Please enable camera permissions in your browser settings.',
      };
    }
    if (err.name === 'NotFoundError') {
      return {
        type: 'no_camera',
        message: 'No camera found. Please try on a device with a camera.',
      };
    }
  }

  if (!navigator.mediaDevices?.getUserMedia) {
    return {
      type: 'not_supported',
      message: 'Your browser does not support camera access.',
    };
  }

  return {
    type: 'unknown',
    message: err instanceof Error ? err.message : 'An unknown error occurred.',
  };
}

function getStreamInfo(stream: MediaStream): StreamInfo {
  const track = stream.getVideoTracks()[0];
  const settings = track?.getSettings() ?? {};
  return {
    width: settings.width ?? 0,
    height: settings.height ?? 0,
    facingMode: settings.facingMode ?? 'unknown',
    frameRate: settings.frameRate ?? 0,
    label: track?.label ?? 'unknown',
  };
}

/** ZXing barcode formats for center-crop fallback detection */
const ZXING_FORMATS = [
  BarcodeFormat.EAN_13,
  BarcodeFormat.EAN_8,
  BarcodeFormat.UPC_A,
  BarcodeFormat.UPC_E,
  BarcodeFormat.CODE_128,
  BarcodeFormat.CODE_39,
];

export function useBarcodeScanner(
  options: UseBarcodesScannerOptions = {}
): UseBarcodesScannerReturn {
  const {
    onBarcodeDetected,
    onPaintFound,
    onPaintNotFound,
    continuous = true,
    debug = false,
    onDebugEvent,
  } = options;

  const [status, setStatus] = useState<ScannerStatus>('idle');
  const [error, setError] = useState<ScannerError | null>(null);
  const [lastScannedBarcode, setLastScannedBarcode] = useState<string | null>(null);
  const [lastMatchedPaint, setLastMatchedPaint] = useState<Paint | null>(null);
  const [streamInfo, setStreamInfo] = useState<StreamInfo | null>(null);
  const [activeBackend, setActiveBackend] = useState<ScannerBackend | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const lastScanTimeRef = useRef<number>(0);
  const isStoppedRef = useRef<boolean>(true);
  const debugEventsRef = useRef<DebugEvent[]>([]);
  const [debugEvents, setDebugEvents] = useState<DebugEvent[]>([]);
  const debugThrottleRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scanLoopRafRef = useRef<number>(0);
  const scanAttemptCountRef = useRef<number>(0);
  const lastScanLoopTimeRef = useRef<number>(0);
  const offscreenCanvasRef = useRef<OffscreenCanvas | HTMLCanvasElement | null>(null);

  const emitDebug = useCallback((type: DebugEvent['type'], message: string, data?: unknown) => {
    if (!debug) return;
    const event: DebugEvent = { timestamp: Date.now(), type, message, data };
    debugEventsRef.current = [...debugEventsRef.current.slice(-(MAX_DEBUG_EVENTS - 1)), event];
    onDebugEvent?.(event);

    // Throttle state updates to avoid excessive re-renders during scanning
    if (!debugThrottleRef.current) {
      debugThrottleRef.current = setTimeout(() => {
        setDebugEvents([...debugEventsRef.current]);
        debugThrottleRef.current = null;
      }, 250);
    }
  }, [debug, onDebugEvent]);

  const stopScanning = useCallback(() => {
    isStoppedRef.current = true;

    if (scanLoopRafRef.current) {
      cancelAnimationFrame(scanLoopRafRef.current);
      scanLoopRafRef.current = 0;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    offscreenCanvasRef.current = null;
    setStreamInfo(null);
    setActiveBackend(null);
    setStatus('idle');
    emitDebug('status_change', 'Scanner stopped, status → idle');
  }, [emitDebug]);

  const handleBarcodeScan = useCallback(
    async (barcode: string, backend: ScannerBackend) => {
      const now = Date.now();
      if (now - lastScanTimeRef.current < SCAN_DEBOUNCE_MS) {
        emitDebug('barcode_detected', `Debounced duplicate: ${barcode}`, { barcode, debounced: true, backend });
        return;
      }
      lastScanTimeRef.current = now;

      emitDebug('barcode_detected', `Barcode detected (${backend}): ${barcode}`, { barcode, backend });
      setLastScannedBarcode(barcode);
      onBarcodeDetected?.(barcode);

      setStatus('processing');
      emitDebug('status_change', 'status → processing');

      try {
        const paint = await getPaintBySku(barcode);

        if (paint) {
          setLastMatchedPaint(paint);
          onPaintFound?.(paint);
          emitDebug('paint_lookup', `Paint found: ${paint.name} (${paint.brand})`, { paint: { id: paint.id, name: paint.name, brand: paint.brand } });
        } else {
          setLastMatchedPaint(null);
          onPaintNotFound?.(barcode);
          emitDebug('paint_lookup', `No paint found for barcode: ${barcode}`, { barcode });
        }
      } finally {
        if (!isStoppedRef.current) {
          setStatus(continuous ? 'scanning' : 'idle');
          emitDebug('status_change', `status → ${continuous ? 'scanning' : 'idle'}`);
        }
      }
    },
    [onBarcodeDetected, onPaintFound, onPaintNotFound, continuous, emitDebug]
  );

  const startScanning = useCallback(async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setError({
        type: 'not_supported',
        message: 'Your browser does not support camera access.',
      });
      setStatus('error');
      emitDebug('error', 'Browser does not support camera access');
      return;
    }

    setStatus('requesting');
    setError(null);
    isStoppedRef.current = false;
    scanAttemptCountRef.current = 0;
    emitDebug('status_change', 'status → requesting');

    try {
      const constraints = {
        video: {
          facingMode: 'environment',
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      };
      emitDebug('camera_info', 'Requesting camera with constraints', constraints);

      const stream = await navigator.mediaDevices.getUserMedia(constraints);

      if (isStoppedRef.current) {
        stream.getTracks().forEach((track) => track.stop());
        emitDebug('status_change', 'Stopped before stream ready, discarding');
        return;
      }

      streamRef.current = stream;
      const info = getStreamInfo(stream);
      setStreamInfo(info);
      emitDebug('camera_info', `Camera stream acquired: ${info.width}x${info.height} @ ${info.frameRate}fps (${info.facingMode})`, info);

      // Log camera capabilities for debugging
      const track = stream.getVideoTracks()[0];
      if (track) {
        const settings = track.getSettings();
        emitDebug('camera_info', 'Camera settings', settings);
        if ('getCapabilities' in track) {
          try {
            const capabilities = (track as MediaStreamTrack & { getCapabilities: () => unknown }).getCapabilities();
            emitDebug('camera_info', 'Camera capabilities', capabilities);
          } catch {
            emitDebug('camera_info', 'Could not get camera capabilities');
          }
        }
      }

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        emitDebug('camera_info', 'Video element playing');
      }

      // Check native BarcodeDetector availability
      const nativeAvailable = isNativeBarcodeDetectorSupported();
      if (nativeAvailable) {
        const formats = await getNativeSupportedFormats();
        emitDebug('camera_info', `Native BarcodeDetector: available (formats: ${formats.join(', ')})`, { formats });
        setActiveBackend('native');
      } else {
        emitDebug('camera_info', 'Native BarcodeDetector: not available, using ZXing fallback');
        setActiveBackend('zxing');
      }

      setStatus('scanning');
      emitDebug('status_change', 'status → scanning, starting custom scan loop');

      // Start custom rAF-based scan loop
      const scanLoop = async () => {
        if (isStoppedRef.current) return;

        const now = performance.now();
        // Throttle to ~10fps
        if (now - lastScanLoopTimeRef.current < SCAN_INTERVAL_MS) {
          scanLoopRafRef.current = requestAnimationFrame(scanLoop);
          return;
        }
        lastScanLoopTimeRef.current = now;

        const video = videoRef.current;
        if (!video || video.readyState < video.HAVE_ENOUGH_DATA) {
          scanLoopRafRef.current = requestAnimationFrame(scanLoop);
          return;
        }

        scanAttemptCountRef.current++;

        // Log every 50th attempt
        if (scanAttemptCountRef.current % 50 === 0) {
          emitDebug('zxing_callback', `Scan attempts: ${scanAttemptCountRef.current}`, { count: scanAttemptCountRef.current });
        }

        // 1. Try native BarcodeDetector first
        if (nativeAvailable) {
          try {
            const nativeResult = await detectBarcodeNative(video);
            if (nativeResult) {
              handleBarcodeScan(nativeResult.text, 'native');
              scanLoopRafRef.current = requestAnimationFrame(scanLoop);
              return;
            }
          } catch {
            // Native detection failed, fall through to ZXing
          }
        }

        // 2. ZXing fallback with center-crop
        try {
          const vw = video.videoWidth;
          const vh = video.videoHeight;
          if (vw > 0 && vh > 0) {
            // Get or create offscreen canvas
            if (!offscreenCanvasRef.current) {
              if (typeof OffscreenCanvas !== 'undefined') {
                offscreenCanvasRef.current = new OffscreenCanvas(vw, vh);
              } else {
                const canvas = document.createElement('canvas');
                canvas.width = vw;
                canvas.height = vh;
                offscreenCanvasRef.current = canvas;
              }
            }

            const canvas = offscreenCanvasRef.current;

            // Center-crop: take 60% of the frame from the center
            const cropW = Math.round(vw * CENTER_CROP_RATIO);
            const cropH = Math.round(vh * CENTER_CROP_RATIO);
            const cropX = Math.round((vw - cropW) / 2);
            const cropY = Math.round((vh - cropH) / 2);

            // Resize canvas to crop dimensions
            canvas.width = cropW;
            canvas.height = cropH;

            const ctx = canvas.getContext('2d') as CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D | null;
            if (ctx) {
              ctx.drawImage(video, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);
              const imageData = ctx.getImageData(0, 0, cropW, cropH);
              const result = detectBarcodeFromRgba(imageData.data, cropW, cropH, ZXING_FORMATS);
              if (result) {
                handleBarcodeScan(result.text, 'zxing');
              }
            }
          }
        } catch {
          // ZXing detection failed, continue loop
        }

        scanLoopRafRef.current = requestAnimationFrame(scanLoop);
      };

      scanLoopRafRef.current = requestAnimationFrame(scanLoop);
    } catch (err) {
      const scannerError = createScannerError(err);
      setError(scannerError);
      setStatus('error');
      emitDebug('error', `Camera error: ${scannerError.type} - ${scannerError.message}`, scannerError);
      stopScanning();
    }
  }, [handleBarcodeScan, stopScanning, emitDebug]);

  const resetError = useCallback(() => {
    setError(null);
    setStatus('idle');
  }, []);

  const resetLastScan = useCallback(() => {
    setLastScannedBarcode(null);
    setLastMatchedPaint(null);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopScanning();
      if (debugThrottleRef.current) {
        clearTimeout(debugThrottleRef.current);
      }
    };
  }, [stopScanning]);

  return {
    status,
    error,
    lastScannedBarcode,
    lastMatchedPaint,
    videoRef,
    startScanning,
    stopScanning,
    resetError,
    resetLastScan,
    debugEvents,
    streamInfo,
    activeBackend,
  };
}
