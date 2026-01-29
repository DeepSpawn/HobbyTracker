/**
 * Pure barcode detection functions for testability.
 *
 * These use ZXing's core MultiFormatReader (not the browser reader)
 * so they can run in Node/vitest without a DOM video element.
 */

import {
  BarcodeFormat,
  BinaryBitmap,
  DecodeHintType,
  HybridBinarizer,
  MultiFormatReader,
  RGBLuminanceSource,
} from '@zxing/library';
import type Result from '@zxing/library/esm/core/Result';

export interface DetectionResult {
  text: string;
  format: string;
  rawBytes: Uint8Array | null;
}

const DEFAULT_FORMATS = [
  BarcodeFormat.EAN_13,
  BarcodeFormat.EAN_8,
  BarcodeFormat.UPC_A,
  BarcodeFormat.UPC_E,
  BarcodeFormat.CODE_128,
  BarcodeFormat.CODE_39,
];

/**
 * Create a configured MultiFormatReader with barcode format hints.
 */
function createReader(formats: BarcodeFormat[] = DEFAULT_FORMATS): MultiFormatReader {
  const hints = new Map<DecodeHintType, unknown>();
  hints.set(DecodeHintType.POSSIBLE_FORMATS, formats);

  const reader = new MultiFormatReader();
  reader.setHints(hints);
  return reader;
}

/**
 * Convert RGB (3 bytes/pixel) to grayscale luminance (1 byte/pixel).
 * Uses the standard luminance formula: L = 0.299R + 0.587G + 0.114B
 */
function rgbToLuminance(rgbData: Uint8ClampedArray | Uint8Array, pixelCount: number): Uint8ClampedArray {
  const luminance = new Uint8ClampedArray(pixelCount);
  for (let i = 0; i < pixelCount; i++) {
    const r = rgbData[i * 3];
    const g = rgbData[i * 3 + 1];
    const b = rgbData[i * 3 + 2];
    luminance[i] = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
  }
  return luminance;
}

/**
 * Convert RGBA (4 bytes/pixel) to grayscale luminance (1 byte/pixel).
 */
function rgbaToLuminance(rgbaData: Uint8ClampedArray | Uint8Array, pixelCount: number): Uint8ClampedArray {
  const luminance = new Uint8ClampedArray(pixelCount);
  for (let i = 0; i < pixelCount; i++) {
    const r = rgbaData[i * 4];
    const g = rgbaData[i * 4 + 1];
    const b = rgbaData[i * 4 + 2];
    luminance[i] = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
  }
  return luminance;
}

/**
 * Detect a barcode from grayscale luminance data (1 byte per pixel).
 */
function detectFromLuminance(
  luminance: Uint8ClampedArray,
  width: number,
  height: number,
  formats?: BarcodeFormat[],
): DetectionResult | null {
  try {
    const luminanceSource = new RGBLuminanceSource(luminance, width, height);
    const binaryBitmap = new BinaryBitmap(new HybridBinarizer(luminanceSource));

    const reader = createReader(formats);
    const result: Result = reader.decode(binaryBitmap);

    return {
      text: result.getText(),
      format: BarcodeFormat[result.getBarcodeFormat()],
      rawBytes: result.getRawBytes(),
    };
  } catch {
    // ZXing throws NotFoundException when no barcode is found
    return null;
  }
}

/**
 * Detect a barcode from raw RGBA pixel data.
 *
 * @param rgbaData - RGBA pixel buffer (e.g. from canvas getImageData().data)
 * @param width - Image width in pixels
 * @param height - Image height in pixels
 * @param formats - Optional barcode formats to look for
 * @returns Detection result or null if no barcode found
 */
export function detectBarcodeFromRgba(
  rgbaData: Uint8ClampedArray | Uint8Array,
  width: number,
  height: number,
  formats?: BarcodeFormat[],
): DetectionResult | null {
  const luminance = rgbaToLuminance(rgbaData, width * height);
  return detectFromLuminance(luminance, width, height, formats);
}

/**
 * Detect a barcode from raw RGB pixel data.
 *
 * @param rgbData - RGB pixel buffer (3 bytes per pixel)
 * @param width - Image width in pixels
 * @param height - Image height in pixels
 * @param formats - Optional barcode formats to look for
 * @returns Detection result or null if no barcode found
 */
export function detectBarcodeFromRgb(
  rgbData: Uint8ClampedArray | Uint8Array,
  width: number,
  height: number,
  formats?: BarcodeFormat[],
): DetectionResult | null {
  const luminance = rgbToLuminance(rgbData, width * height);
  return detectFromLuminance(luminance, width, height, formats);
}

/**
 * Detect a barcode from an ImageData object (canvas API).
 * Convenience wrapper for use in browser contexts.
 */
export function detectBarcodeFromImageData(
  imageData: ImageData,
  formats?: BarcodeFormat[],
): DetectionResult | null {
  return detectBarcodeFromRgba(imageData.data, imageData.width, imageData.height, formats);
}
