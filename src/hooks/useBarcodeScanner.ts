import { useState, useRef, useCallback, useEffect } from 'react';
import { BrowserMultiFormatReader, BarcodeFormat, DecodeHintType } from '@zxing/library';
import type { Paint } from '../types/paint';
import { getPaintBySku } from '../services/paint';

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

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const readerRef = useRef<BrowserMultiFormatReader | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const lastScanTimeRef = useRef<number>(0);
  const isStoppedRef = useRef<boolean>(true);
  const debugEventsRef = useRef<DebugEvent[]>([]);
  const [debugEvents, setDebugEvents] = useState<DebugEvent[]>([]);
  const debugThrottleRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const zxingCallbackCountRef = useRef<number>(0);

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

    if (readerRef.current) {
      readerRef.current.stopContinuousDecode();
      readerRef.current.reset();
      readerRef.current = null;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    setStreamInfo(null);
    setStatus('idle');
    emitDebug('status_change', 'Scanner stopped, status → idle');
  }, [emitDebug]);

  const handleBarcodeScan = useCallback(
    async (barcode: string) => {
      const now = Date.now();
      if (now - lastScanTimeRef.current < SCAN_DEBOUNCE_MS) {
        emitDebug('barcode_detected', `Debounced duplicate: ${barcode}`, { barcode, debounced: true });
        return;
      }
      lastScanTimeRef.current = now;

      emitDebug('barcode_detected', `Barcode detected: ${barcode}`, { barcode });
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
    zxingCallbackCountRef.current = 0;
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

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        emitDebug('camera_info', 'Video element playing');
      }

      const hints = new Map();
      hints.set(DecodeHintType.POSSIBLE_FORMATS, [
        BarcodeFormat.EAN_13,
        BarcodeFormat.EAN_8,
        BarcodeFormat.UPC_A,
        BarcodeFormat.UPC_E,
        BarcodeFormat.CODE_128,
        BarcodeFormat.CODE_39,
      ]);

      const reader = new BrowserMultiFormatReader(hints);
      readerRef.current = reader;

      setStatus('scanning');
      emitDebug('status_change', 'status → scanning, starting ZXing decode loop');

      reader.decodeFromStream(
        streamRef.current!,
        videoRef.current!,
        (result, err) => {
          if (isStoppedRef.current) return;

          zxingCallbackCountRef.current++;

          if (result) {
            const barcode = result.getText();
            const format = BarcodeFormat[result.getBarcodeFormat()];
            emitDebug('zxing_callback', `ZXing result: ${barcode} (${format})`, { barcode, format, callbackCount: zxingCallbackCountRef.current });
            handleBarcodeScan(barcode);
          }

          if (err && err.name !== 'NotFoundException' && err.name !== 'ChecksumException') {
            emitDebug('error', `ZXing error: ${err.name}: ${err.message}`, { name: err.name, message: err.message });
            console.error('Barcode scan error:', err);
          }
        }
      );
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
  };
}
