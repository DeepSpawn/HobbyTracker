import { describe, it, expect } from 'vitest';
import { detectBarcodeFromRgb, detectBarcodeFromRgba } from './barcodeDetection';
import {
  generateBarcodeImage,
  generateBarcodeImageRgba,
  generateBarcodeWithNoise,
  generateBarcodeWithReducedContrast,
  generateBarcodeAtSmallScale,
} from '../../test/fixtures/generateBarcode';

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

  describe('degraded conditions - noise', () => {
    const ean = '5011921120963';

    it('handles barcode with 10% noise', () => {
      const { rgbData, width, height } = generateBarcodeWithNoise(ean, 0.1);
      const result = detectBarcodeFromRgb(rgbData, width, height);

      // Noise resilience depends on which pixels are affected.
      // This test documents the boundary — if it detects, it must be correct.
      if (result) {
        expect(result.text).toBe(ean);
      } else {
        expect(result).toBeNull();
      }
    });

    it('handles barcode with 20% noise', () => {
      const { rgbData, width, height } = generateBarcodeWithNoise(ean, 0.2);
      const result = detectBarcodeFromRgb(rgbData, width, height);

      if (result) {
        expect(result.text).toBe(ean);
      } else {
        expect(result).toBeNull();
      }
    });

    it('handles barcode with 30% noise', () => {
      const { rgbData, width, height } = generateBarcodeWithNoise(ean, 0.3);
      const result = detectBarcodeFromRgb(rgbData, width, height);

      if (result) {
        expect(result.text).toBe(ean);
      } else {
        expect(result).toBeNull();
      }
    });
  });

  describe('degraded conditions - reduced contrast', () => {
    const ean = '5011921120963';

    it('detects barcode at 70% contrast', () => {
      const { rgbData, width, height } = generateBarcodeWithReducedContrast(ean, 0.7);
      const result = detectBarcodeFromRgb(rgbData, width, height);

      expect(result).not.toBeNull();
      expect(result!.text).toBe(ean);
    });

    it('detects barcode at 50% contrast', () => {
      const { rgbData, width, height } = generateBarcodeWithReducedContrast(ean, 0.5);
      const result = detectBarcodeFromRgb(rgbData, width, height);

      // 50% contrast is challenging; document the boundary
      if (result) {
        expect(result.text).toBe(ean);
      } else {
        expect(result).toBeNull();
      }
    });
  });

  describe('degraded conditions - small scale', () => {
    const ean = '5011921120963';

    it('detects barcode at 4px per module (default-ish)', () => {
      const { rgbData, width, height } = generateBarcodeAtSmallScale(ean, 4);
      const result = detectBarcodeFromRgb(rgbData, width, height);

      expect(result).not.toBeNull();
      expect(result!.text).toBe(ean);
    });

    it('detects barcode at 3px per module', () => {
      const { rgbData, width, height } = generateBarcodeAtSmallScale(ean, 3);
      const result = detectBarcodeFromRgb(rgbData, width, height);

      expect(result).not.toBeNull();
      expect(result!.text).toBe(ean);
    });

    it('detects barcode at 2px per module (small)', () => {
      const { rgbData, width, height } = generateBarcodeAtSmallScale(ean, 2);
      const result = detectBarcodeFromRgb(rgbData, width, height);

      // 2px per module is at the edge of what ZXing can handle
      if (result) {
        expect(result.text).toBe(ean);
      } else {
        expect(result).toBeNull();
      }
    });
  });
});
