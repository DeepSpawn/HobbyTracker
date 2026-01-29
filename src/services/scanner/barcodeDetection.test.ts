import { describe, it, expect } from 'vitest';
import { detectBarcodeFromRgb, detectBarcodeFromRgba } from './barcodeDetection';
import { generateBarcodeImage, generateBarcodeImageRgba } from '../../test/fixtures/generateBarcode';

describe('barcodeDetection', () => {
  describe('detectBarcodeFromRgb', () => {
    it('detects a valid EAN-13 barcode (Citadel Macragge Blue)', () => {
      const ean = '5011921120963';
      const { rgbData, width, height } = generateBarcodeImage(ean);

      const result = detectBarcodeFromRgb(rgbData, width, height);

      expect(result).not.toBeNull();
      expect(result!.text).toBe(ean);
      expect(result!.format).toBe('EAN_13');
    });

    it('detects another EAN-13 barcode (Vallejo US Dark Green)', () => {
      const ean = '8429551708593';
      const { rgbData, width, height } = generateBarcodeImage(ean);

      const result = detectBarcodeFromRgb(rgbData, width, height);

      expect(result).not.toBeNull();
      expect(result!.text).toBe(ean);
    });

    it('detects a third EAN-13 barcode (Army Painter)', () => {
      const ean = '5713799411067';
      const { rgbData, width, height } = generateBarcodeImage(ean);

      const result = detectBarcodeFromRgb(rgbData, width, height);

      expect(result).not.toBeNull();
      expect(result!.text).toBe(ean);
    });

    it('returns null for a blank white image', () => {
      const width = 380;
      const height = 150;
      const rgbData = new Uint8ClampedArray(width * height * 3).fill(255);

      const result = detectBarcodeFromRgb(rgbData, width, height);

      expect(result).toBeNull();
    });

    it('returns null for a solid black image', () => {
      const width = 380;
      const height = 150;
      const rgbData = new Uint8ClampedArray(width * height * 3).fill(0);

      const result = detectBarcodeFromRgb(rgbData, width, height);

      expect(result).toBeNull();
    });

    it('returns null for random noise', () => {
      const width = 380;
      const height = 150;
      const rgbData = new Uint8ClampedArray(width * height * 3);
      // Deterministic pseudo-random for reproducibility
      let seed = 42;
      for (let i = 0; i < rgbData.length; i++) {
        seed = (seed * 1103515245 + 12345) & 0x7fffffff;
        rgbData[i] = seed % 256;
      }

      const result = detectBarcodeFromRgb(rgbData, width, height);

      expect(result).toBeNull();
    });

    it('detects barcode at higher resolution', () => {
      const ean = '5011921120963';
      const { rgbData, width, height } = generateBarcodeImage(ean, 760, 300);

      const result = detectBarcodeFromRgb(rgbData, width, height);

      expect(result).not.toBeNull();
      expect(result!.text).toBe(ean);
    });
  });

  describe('detectBarcodeFromRgba', () => {
    it('detects a barcode from RGBA data', () => {
      const ean = '5011921120963';
      const { rgbaData, width, height } = generateBarcodeImageRgba(ean);

      const result = detectBarcodeFromRgba(rgbaData, width, height);

      expect(result).not.toBeNull();
      expect(result!.text).toBe(ean);
    });
  });
});
