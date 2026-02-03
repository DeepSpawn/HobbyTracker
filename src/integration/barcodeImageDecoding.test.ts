/**
 * Integration tests for barcode image decoding
 *
 * These tests validate the test fixtures and expected barcode values.
 * Actual ZXing decoding of real images is complex in Node.js/jsdom,
 * so we test the data integrity and helper functions here.
 *
 * For end-to-end browser testing of actual barcode scanning,
 * consider using Playwright or Cypress with real device cameras.
 */

import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import {
  TEST_IMAGES,
  EXPECTED_BARCODES,
  getExpectedBarcodeForImage,
  getAllTestImagePaths,
} from '../test/fixtures/barcodeImages';
import {
  findMockPaintByEan,
  findMockPaintBySku,
  mockCitadelPaint,
  mockVallejoPaint,
  mockMonumentPaint,
  mockNotFoundBarcode,
} from '../test/fixtures/mockPaints';
import { isValidEan, validateEanChecksum } from '../services/paint/paintLookupByEan';

describe('Barcode Image Decoding Integration Tests', () => {
  describe('Test Image File Validation', () => {
    it('all test image paths are properly defined', () => {
      expect(TEST_IMAGES.citadel.clearShot).toBeDefined();
      expect(TEST_IMAGES.citadel.angledShot).toBeDefined();
      expect(TEST_IMAGES.citadel.alternateAngle).toBeDefined();
      expect(TEST_IMAGES.monument.clearShot).toBeDefined();
      expect(TEST_IMAGES.monument.angledShot).toBeDefined();
      expect(TEST_IMAGES.vallejo.clearShot).toBeDefined();
      expect(TEST_IMAGES.akInteractive.clearShot).toBeDefined();
      expect(TEST_IMAGES.akInteractive.upsideDown).toBeDefined();
      expect(TEST_IMAGES.akInteractive.blurry).toBeDefined();
    });

    it('test image files exist on disk', () => {
      const allPaths = getAllTestImagePaths();

      for (const imagePath of allPaths) {
        expect(fs.existsSync(imagePath), `Missing: ${imagePath}`).toBe(true);
      }
    });

    it('test images are valid JPEG files', () => {
      const allPaths = getAllTestImagePaths();

      for (const imagePath of allPaths) {
        const ext = path.extname(imagePath).toLowerCase();
        expect(['.jpg', '.jpeg']).toContain(ext);

        // Check file is not empty
        const stats = fs.statSync(imagePath);
        expect(stats.size).toBeGreaterThan(0);
      }
    });

    it('getAllTestImagePaths returns all expected images', () => {
      const allPaths = getAllTestImagePaths();

      // Should have 14 images total
      expect(allPaths.length).toBe(14);
    });
  });

  describe('Expected Barcode Values', () => {
    it('Citadel barcode is valid EAN-13', () => {
      expect(isValidEan(EXPECTED_BARCODES.citadel)).toBe(true);
      expect(EXPECTED_BARCODES.citadel).toBe('5011921120963');
    });

    it('Citadel barcode has valid checksum', () => {
      expect(validateEanChecksum(EXPECTED_BARCODES.citadel)).toBe(true);
    });

    it('Vallejo barcode is valid EAN-13', () => {
      expect(isValidEan(EXPECTED_BARCODES.vallejo)).toBe(true);
      expect(EXPECTED_BARCODES.vallejo).toBe('8429551708593');
    });

    it('Vallejo barcode has valid checksum', () => {
      expect(validateEanChecksum(EXPECTED_BARCODES.vallejo)).toBe(true);
    });

    it('AK Interactive barcode is valid EAN-13', () => {
      expect(isValidEan(EXPECTED_BARCODES.akInteractive)).toBe(true);
      expect(EXPECTED_BARCODES.akInteractive).toBe('8435568302686');
    });

    it('AK Interactive barcode has valid checksum', () => {
      expect(validateEanChecksum(EXPECTED_BARCODES.akInteractive)).toBe(true);
    });

    it('Monument Hobbies barcode is valid UPC-A (12 digits)', () => {
      // UPC-A is 12 digits
      expect(EXPECTED_BARCODES.monument).toMatch(/^\d{12}$/);
      expect(EXPECTED_BARCODES.monument).toBe('628504411063');
    });

    it('Monument Hobbies UPC-A padded to EAN-13 has valid checksum', () => {
      const paddedEan = '0' + EXPECTED_BARCODES.monument;
      expect(isValidEan(paddedEan)).toBe(true);
      expect(validateEanChecksum(paddedEan)).toBe(true);
    });
  });

  describe('Image to Barcode Mapping', () => {
    it('getExpectedBarcodeForImage returns correct barcode for Citadel images', () => {
      expect(getExpectedBarcodeForImage(TEST_IMAGES.citadel.clearShot)).toBe(
        EXPECTED_BARCODES.citadel
      );
      expect(getExpectedBarcodeForImage(TEST_IMAGES.citadel.angledShot)).toBe(
        EXPECTED_BARCODES.citadel
      );
      expect(getExpectedBarcodeForImage(TEST_IMAGES.citadel.alternateAngle)).toBe(
        EXPECTED_BARCODES.citadel
      );
    });

    it('getExpectedBarcodeForImage returns correct barcode for Monument images', () => {
      expect(getExpectedBarcodeForImage(TEST_IMAGES.monument.clearShot)).toBe(
        EXPECTED_BARCODES.monument
      );
      expect(getExpectedBarcodeForImage(TEST_IMAGES.monument.angledShot)).toBe(
        EXPECTED_BARCODES.monument
      );
    });

    it('getExpectedBarcodeForImage returns correct barcode for Vallejo images', () => {
      expect(getExpectedBarcodeForImage(TEST_IMAGES.vallejo.clearShot)).toBe(
        EXPECTED_BARCODES.vallejo
      );
    });

    it('getExpectedBarcodeForImage returns correct barcode for AK Interactive images', () => {
      expect(getExpectedBarcodeForImage(TEST_IMAGES.akInteractive.clearShot)).toBe(
        EXPECTED_BARCODES.akInteractive
      );
      expect(getExpectedBarcodeForImage(TEST_IMAGES.akInteractive.upsideDown)).toBe(
        EXPECTED_BARCODES.akInteractive
      );
      expect(getExpectedBarcodeForImage(TEST_IMAGES.akInteractive.blurry)).toBe(
        EXPECTED_BARCODES.akInteractive
      );
    });

    it('returns null for unknown image paths', () => {
      expect(getExpectedBarcodeForImage('/unknown/path/image.jpg')).toBeNull();
    });
  });

  describe('Paint Lookup Integration', () => {
    describe('findMockPaintByEan', () => {
      it('finds Citadel paint by EAN', () => {
        const paint = findMockPaintByEan(EXPECTED_BARCODES.citadel);

        expect(paint).not.toBeNull();
        expect(paint?.brand).toBe('citadel');
        expect(paint?.name).toBe(mockCitadelPaint.name);
      });

      it('finds Vallejo paint by EAN', () => {
        const paint = findMockPaintByEan(EXPECTED_BARCODES.vallejo);

        expect(paint).not.toBeNull();
        expect(paint?.brand).toBe('vallejo');
        expect(paint?.name).toBe(mockVallejoPaint.name);
      });

      it('finds Monument paint by padded EAN', () => {
        const paddedEan = '0' + EXPECTED_BARCODES.monument;
        const paint = findMockPaintByEan(paddedEan);

        expect(paint).not.toBeNull();
        expect(paint?.brand).toBe('monument_hobbies');
        expect(paint?.name).toBe(mockMonumentPaint.name);
      });

      it('returns null for AK Interactive (not in database)', () => {
        const paint = findMockPaintByEan(EXPECTED_BARCODES.akInteractive);

        expect(paint).toBeNull();
      });

      it('AK Interactive barcode matches mockNotFoundBarcode constant', () => {
        expect(EXPECTED_BARCODES.akInteractive).toBe(mockNotFoundBarcode);
      });
    });

    describe('findMockPaintBySku', () => {
      it('finds paint by SKU', () => {
        const paint = findMockPaintBySku(mockCitadelPaint.sku!);

        expect(paint).not.toBeNull();
        expect(paint?.id).toBe(mockCitadelPaint.id);
      });

      it('finds paint by EAN when passed as SKU', () => {
        const paint = findMockPaintBySku(EXPECTED_BARCODES.citadel);

        expect(paint).not.toBeNull();
        expect(paint?.brand).toBe('citadel');
      });

      it('handles SKU with leading zeros', () => {
        // Some barcodes have leading zeros
        const paint = findMockPaintBySku('0' + EXPECTED_BARCODES.monument);

        expect(paint).not.toBeNull();
        expect(paint?.brand).toBe('monument_hobbies');
      });
    });
  });

  describe('End-to-End Flow Simulation', () => {
    it('simulates successful scan -> lookup -> found flow for Citadel', () => {
      // Step 1: Barcode is scanned (simulated)
      const scannedBarcode = EXPECTED_BARCODES.citadel;

      // Step 2: Validate the barcode
      expect(isValidEan(scannedBarcode)).toBe(true);

      // Step 3: Look up the paint
      const paint = findMockPaintByEan(scannedBarcode);

      // Step 4: Verify paint was found
      expect(paint).not.toBeNull();
      expect(paint?.brand).toBe('citadel');
      expect(paint?.ean).toBe(scannedBarcode);
    });

    it('simulates successful scan -> lookup -> found flow for Vallejo', () => {
      const scannedBarcode = EXPECTED_BARCODES.vallejo;

      expect(isValidEan(scannedBarcode)).toBe(true);

      const paint = findMockPaintByEan(scannedBarcode);

      expect(paint).not.toBeNull();
      expect(paint?.brand).toBe('vallejo');
    });

    it('simulates successful scan -> lookup -> NOT FOUND flow for AK Interactive', () => {
      // Step 1: Barcode is scanned
      const scannedBarcode = EXPECTED_BARCODES.akInteractive;

      // Step 2: Validate the barcode - it's valid
      expect(isValidEan(scannedBarcode)).toBe(true);

      // Step 3: Look up the paint - NOT FOUND
      const paint = findMockPaintByEan(scannedBarcode);

      // Step 4: Verify paint was NOT found
      expect(paint).toBeNull();

      // This is the expected "paint not found" scenario
      // The UI should show "Paint Not Found" with the barcode
    });

    it('simulates UPC-A scan (Monument Hobbies)', () => {
      // UPC-A barcodes are 12 digits, but EAN lookup expects 13
      const scannedBarcode = EXPECTED_BARCODES.monument;

      // UPC-A is not valid as EAN-13 directly
      expect(isValidEan(scannedBarcode)).toBe(false);

      // But can be looked up via SKU/EAN matching in the service
      const paint = findMockPaintBySku(scannedBarcode);

      expect(paint).not.toBeNull();
      expect(paint?.brand).toBe('monument_hobbies');
    });
  });

  describe('Barcode Format Detection', () => {
    it('identifies EAN-13 format (13 digits, valid checksum)', () => {
      const testCases = [
        { barcode: EXPECTED_BARCODES.citadel, brand: 'citadel' },
        { barcode: EXPECTED_BARCODES.vallejo, brand: 'vallejo' },
        { barcode: EXPECTED_BARCODES.akInteractive, brand: 'ak_interactive' },
      ];

      for (const { barcode, brand } of testCases) {
        expect(barcode.length, `${brand} barcode should be 13 digits`).toBe(13);
        expect(isValidEan(barcode), `${brand} barcode should be valid EAN`).toBe(true);
        expect(
          validateEanChecksum(barcode),
          `${brand} barcode should have valid checksum`
        ).toBe(true);
      }
    });

    it('identifies UPC-A format (12 digits)', () => {
      expect(EXPECTED_BARCODES.monument.length).toBe(12);
      expect(/^\d{12}$/.test(EXPECTED_BARCODES.monument)).toBe(true);
    });

    it('EAN-13 can encode UPC-A by prepending 0', () => {
      const upcA = EXPECTED_BARCODES.monument;
      const ean13 = '0' + upcA;

      expect(ean13.length).toBe(13);
      expect(isValidEan(ean13)).toBe(true);
      expect(validateEanChecksum(ean13)).toBe(true);
    });
  });

  describe('Brand-Specific EAN Patterns', () => {
    it('Citadel/Games Workshop uses 5011921 prefix', () => {
      expect(EXPECTED_BARCODES.citadel.startsWith('5011921')).toBe(true);
    });

    it('Vallejo uses 8429551 prefix', () => {
      expect(EXPECTED_BARCODES.vallejo.startsWith('8429551')).toBe(true);
    });

    it('AK Interactive uses 8435568 prefix', () => {
      expect(EXPECTED_BARCODES.akInteractive.startsWith('8435568')).toBe(true);
    });

    it('Monument Hobbies uses 628504 prefix (UPC)', () => {
      expect(EXPECTED_BARCODES.monument.startsWith('628504')).toBe(true);
    });
  });
});
