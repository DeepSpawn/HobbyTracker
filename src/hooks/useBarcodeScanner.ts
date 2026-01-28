import { useState, useRef, useCallback, useEffect } from 'react';
import { BrowserMultiFormatReader, BarcodeFormat, DecodeHintType } from '@zxing/library';
import type { Paint } from '../types/paint';
import { getPaintBySku } from '../services/paint';
import { validateEanChecksum } from '../services/paint/paintLookupByEan';

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

export interface UseBarcodesScannerOptions {
  onBarcodeDetected?: (barcode: string) => void;
  onPaintFound?: (paint: Paint) => void;
  onPaintNotFound?: (barcode: string) => void;
  continuous?: boolean;
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
}

const SCAN_DEBOUNCE_MS = 1500;

/**
 * Validate barcode checksum for EAN-13 or UPC-A formats.
 * UPC-A (12 digits) is validated by prepending 0 to make EAN-13.
 * Returns false for invalid checksums (likely misreads).
 */
function isValidBarcodeChecksum(barcode: string): boolean {
  // EAN-13: 13 digits
  if (/^\d{13}$/.test(barcode)) {
    return validateEanChecksum(barcode);
  }

  // UPC-A: 12 digits - prepend 0 to convert to EAN-13 for validation
  if (/^\d{12}$/.test(barcode)) {
    return validateEanChecksum('0' + barcode);
  }

  // Other formats (CODE_128, CODE_39, etc.) - allow through without checksum validation
  // as they may be valid SKU-based lookups
  return true;
}

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

export function useBarcodeScanner(
  options: UseBarcodesScannerOptions = {}
): UseBarcodesScannerReturn {
  const {
    onBarcodeDetected,
    onPaintFound,
    onPaintNotFound,
    continuous = true,
  } = options;

  const [status, setStatus] = useState<ScannerStatus>('idle');
  const [error, setError] = useState<ScannerError | null>(null);
  const [lastScannedBarcode, setLastScannedBarcode] = useState<string | null>(null);
  const [lastMatchedPaint, setLastMatchedPaint] = useState<Paint | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const readerRef = useRef<BrowserMultiFormatReader | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const lastScanTimeRef = useRef<number>(0);
  const isStoppedRef = useRef<boolean>(true);
  // Consecutive read confirmation to reduce misreads
  const lastDetectedBarcodeRef = useRef<string | null>(null);
  const consecutiveReadCountRef = useRef<number>(0);
  const REQUIRED_CONSECUTIVE_READS = 2;

  const stopScanning = useCallback(() => {
    isStoppedRef.current = true;

    if (readerRef.current) {
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

    setStatus('idle');
  }, []);

  const handleBarcodeScan = useCallback(
    async (barcode: string) => {
      const now = Date.now();
      if (now - lastScanTimeRef.current < SCAN_DEBOUNCE_MS) {
        return;
      }

      // Validate barcode checksum - silently ignore misreads
      const checksumValid = isValidBarcodeChecksum(barcode);
      console.debug(`[Scanner] Checksum validation for ${barcode}: ${checksumValid ? 'VALID' : 'INVALID'}`);
      if (!checksumValid) {
        console.debug(`[Scanner] Rejecting barcode with invalid checksum: ${barcode}`);
        return;
      }

      lastScanTimeRef.current = now;

      setLastScannedBarcode(barcode);
      onBarcodeDetected?.(barcode);

      setStatus('processing');
      console.debug(`[Scanner] Looking up paint for barcode: ${barcode}`);

      try {
        const paint = await getPaintBySku(barcode);

        if (paint) {
          console.debug(`[Scanner] Found paint: ${paint.name} (${paint.brand})`);
          setLastMatchedPaint(paint);
          onPaintFound?.(paint);
        } else {
          console.debug(`[Scanner] No paint found for barcode: ${barcode}`);
          setLastMatchedPaint(null);
          onPaintNotFound?.(barcode);
        }
      } finally {
        if (!isStoppedRef.current) {
          setStatus(continuous ? 'scanning' : 'idle');
        }
      }
    },
    [onBarcodeDetected, onPaintFound, onPaintNotFound, continuous]
  );

  const startScanning = useCallback(async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setError({
        type: 'not_supported',
        message: 'Your browser does not support camera access.',
      });
      setStatus('error');
      return;
    }

    setStatus('requesting');
    setError(null);
    isStoppedRef.current = false;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment',
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      });

      if (isStoppedRef.current) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      // Use default reader without hints - ZXing will try all supported formats
      const reader = new BrowserMultiFormatReader();
      readerRef.current = reader;

      setStatus('scanning');

      reader.decodeFromVideoDevice(
        null,
        videoRef.current!,
        (result, err) => {
          if (isStoppedRef.current) return;

          if (result) {
            const barcode = result.getText();
            const format = result.getBarcodeFormat();

            // Debug logging
            console.debug(`[Scanner] Detected: ${barcode} (format: ${format})`);

            // Consecutive read confirmation to reduce misreads
            if (barcode === lastDetectedBarcodeRef.current) {
              consecutiveReadCountRef.current++;
              console.debug(`[Scanner] Consecutive read ${consecutiveReadCountRef.current}/${REQUIRED_CONSECUTIVE_READS}`);
            } else {
              console.debug(`[Scanner] New barcode, resetting count (was: ${lastDetectedBarcodeRef.current})`);
              lastDetectedBarcodeRef.current = barcode;
              consecutiveReadCountRef.current = 1;
            }

            // Only process after required consecutive reads
            if (consecutiveReadCountRef.current >= REQUIRED_CONSECUTIVE_READS) {
              console.debug(`[Scanner] Confirmed! Processing barcode: ${barcode}`);
              handleBarcodeScan(barcode);
              // Reset after successful scan to allow re-scanning same barcode later
              lastDetectedBarcodeRef.current = null;
              consecutiveReadCountRef.current = 0;
            }
          }

          // ZXing throws errors continuously when no barcode is detected
          // This is normal behavior, so we only log unexpected errors
          if (err) {
            const errMessage = err instanceof Error ? err.message : String(err);
            const isExpectedError =
              err.name === 'NotFoundException' ||
              errMessage.includes('No MultiFormat Readers were able to detect');
            if (!isExpectedError) {
              console.error('Barcode scan error:', err);
            }
          }
        }
      );
    } catch (err) {
      const scannerError = createScannerError(err);
      setError(scannerError);
      setStatus('error');
      stopScanning();
    }
  }, [handleBarcodeScan, stopScanning]);

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
  };
}
