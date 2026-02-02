/**
 * Wrapper for the Web BarcodeDetector API (Chrome 83+, Edge 83+).
 *
 * This API uses the platform's native barcode detection (often hardware-accelerated)
 * and is significantly more reliable than ZXing-js for 1D barcodes from live camera feeds.
 */

/** Barcode formats we care about for paint pot scanning. */
const SUPPORTED_FORMATS = ['ean_13', 'ean_8', 'upc_a', 'upc_e'] as const;

/** Result from native BarcodeDetector.detect() */
export interface NativeDetectionResult {
  text: string;
  format: string;
}

/** Type declarations for the BarcodeDetector Web API */
interface BarcodeDetectorResult {
  rawValue: string;
  format: string;
  boundingBox: DOMRectReadOnly;
  cornerPoints: Array<{ x: number; y: number }>;
}

interface BarcodeDetectorAPI {
  detect(source: ImageBitmapSource): Promise<BarcodeDetectorResult[]>;
}

interface BarcodeDetectorConstructor {
  new (options?: { formats: string[] }): BarcodeDetectorAPI;
  getSupportedFormats(): Promise<string[]>;
}

/** Singleton detector instance */
let detectorInstance: BarcodeDetectorAPI | null = null;
let supportChecked = false;
let isSupported = false;

/**
 * Check if the native BarcodeDetector API is available.
 */
export function isNativeBarcodeDetectorSupported(): boolean {
  if (supportChecked) return isSupported;
  supportChecked = true;
  isSupported = 'BarcodeDetector' in globalThis;
  return isSupported;
}

/**
 * Get or create the singleton BarcodeDetector instance.
 */
function getDetector(): BarcodeDetectorAPI | null {
  if (detectorInstance) return detectorInstance;
  if (!isNativeBarcodeDetectorSupported()) return null;

  const BarcodeDetector = (globalThis as unknown as { BarcodeDetector: BarcodeDetectorConstructor }).BarcodeDetector;
  detectorInstance = new BarcodeDetector({ formats: [...SUPPORTED_FORMATS] });
  return detectorInstance;
}

/**
 * Get the supported formats from the native API (for debug display).
 */
export async function getNativeSupportedFormats(): Promise<string[]> {
  if (!isNativeBarcodeDetectorSupported()) return [];
  const BarcodeDetector = (globalThis as unknown as { BarcodeDetector: BarcodeDetectorConstructor }).BarcodeDetector;
  try {
    return await BarcodeDetector.getSupportedFormats();
  } catch {
    return [];
  }
}

/**
 * Detect barcodes using the native BarcodeDetector API.
 *
 * @param source - A video element, canvas, or ImageBitmap
 * @returns First detected barcode result, or null if none found
 */
export async function detectBarcodeNative(
  source: ImageBitmapSource,
): Promise<NativeDetectionResult | null> {
  const detector = getDetector();
  if (!detector) return null;

  try {
    const results = await detector.detect(source);
    if (results.length === 0) return null;

    return {
      text: results[0].rawValue,
      format: results[0].format,
    };
  } catch {
    // Can throw if the source is in a bad state (e.g., video not playing)
    return null;
  }
}
