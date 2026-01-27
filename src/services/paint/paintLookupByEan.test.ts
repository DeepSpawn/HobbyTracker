import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getDocs } from 'firebase/firestore';
import {
  isValidEan,
  validateEanChecksum,
  lookupPaintByEan,
  calculateEanCoverage,
} from './paintLookupByEan';
import {
  mockCitadelPaint,
  mockVallejoPaint,
  mockMonumentPaint,
  mockPaintWithoutEan,
  mockPaintUndefinedEan,
  mockNotFoundBarcode,
} from '../../test/fixtures/mockPaints';
import { EXPECTED_BARCODES } from '../../test/fixtures/barcodeImages';

// Get the mocked getDocs function
const mockGetDocs = vi.mocked(getDocs);

describe('paintLookupByEan', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('isValidEan', () => {
    it('returns true for valid 13-digit EAN', () => {
      expect(isValidEan('5011921120963')).toBe(true);
    });

    it('returns true for valid EAN with all zeros', () => {
      expect(isValidEan('0000000000000')).toBe(true);
    });

    it('returns true for Citadel EAN from test images', () => {
      expect(isValidEan(EXPECTED_BARCODES.citadel)).toBe(true);
    });

    it('returns true for Vallejo EAN from test images', () => {
      expect(isValidEan(EXPECTED_BARCODES.vallejo)).toBe(true);
    });

    it('returns true for AK Interactive EAN from test images', () => {
      expect(isValidEan(EXPECTED_BARCODES.akInteractive)).toBe(true);
    });

    it('returns false for 12-digit string (too short)', () => {
      expect(isValidEan('501192112096')).toBe(false);
    });

    it('returns false for 14-digit string (too long)', () => {
      expect(isValidEan('50119211209635')).toBe(false);
    });

    it('returns false for string containing letters', () => {
      expect(isValidEan('501192112096A')).toBe(false);
    });

    it('returns false for string containing spaces', () => {
      expect(isValidEan('5011 92112096')).toBe(false);
    });

    it('returns false for empty string', () => {
      expect(isValidEan('')).toBe(false);
    });

    it('returns false for string with special characters', () => {
      expect(isValidEan('5011921-12096')).toBe(false);
    });

    it('returns false for UPC-A (12 digits) without padding', () => {
      // UPC-A is 12 digits, needs to be padded with leading 0 for EAN-13
      expect(isValidEan(EXPECTED_BARCODES.monument)).toBe(false);
    });

    it('returns true for UPC-A padded to 13 digits', () => {
      expect(isValidEan('0' + EXPECTED_BARCODES.monument)).toBe(true);
    });
  });

  describe('validateEanChecksum', () => {
    it('returns true for valid Citadel EAN checksum', () => {
      expect(validateEanChecksum(EXPECTED_BARCODES.citadel)).toBe(true);
    });

    it('returns true for valid Vallejo EAN checksum', () => {
      expect(validateEanChecksum(EXPECTED_BARCODES.vallejo)).toBe(true);
    });

    it('returns true for valid AK Interactive EAN checksum', () => {
      expect(validateEanChecksum(EXPECTED_BARCODES.akInteractive)).toBe(true);
    });

    it('returns true for valid Monument Hobbies UPC padded to EAN-13', () => {
      // Monument uses UPC-A (12 digits), pad with 0 for EAN-13
      expect(validateEanChecksum('0' + EXPECTED_BARCODES.monument)).toBe(true);
    });

    it('returns true for all zeros (valid per algorithm)', () => {
      expect(validateEanChecksum('0000000000000')).toBe(true);
    });

    it('returns false for invalid checksum (last digit wrong)', () => {
      // Change last digit from 3 to 4
      expect(validateEanChecksum('5011921120964')).toBe(false);
    });

    it('returns false for invalid checksum (digit off by one)', () => {
      // Change last digit from 3 to 2
      expect(validateEanChecksum('5011921120962')).toBe(false);
    });

    it('returns false for short input (fails format first)', () => {
      expect(validateEanChecksum('123')).toBe(false);
    });

    it('returns false for invalid format (contains letters)', () => {
      expect(validateEanChecksum('501192112096X')).toBe(false);
    });

    it('validates common paint brand EAN prefixes', () => {
      // Games Workshop uses 5011921 prefix
      expect(validateEanChecksum('5011921120963')).toBe(true);

      // Vallejo uses 8429551 prefix
      expect(validateEanChecksum('8429551708593')).toBe(true);

      // Army Painter uses 5713799 prefix
      // Example: 5713799420359
      expect(validateEanChecksum('5713799420359')).toBe(true);
    });
  });

  describe('lookupPaintByEan', () => {
    it('returns paint when found in database', async () => {
      const mockSnapshot = {
        empty: false,
        docs: [
          {
            id: mockCitadelPaint.id,
            data: () => ({
              name: mockCitadelPaint.name,
              brand: mockCitadelPaint.brand,
              productLine: mockCitadelPaint.productLine,
              paintType: mockCitadelPaint.paintType,
              sku: mockCitadelPaint.sku,
              hexColor: mockCitadelPaint.hexColor,
              rgb: mockCitadelPaint.rgb,
              ean: mockCitadelPaint.ean,
            }),
          },
        ],
      };
      mockGetDocs.mockResolvedValue(mockSnapshot as never);

      const result = await lookupPaintByEan(EXPECTED_BARCODES.citadel);

      expect(result).not.toBeNull();
      expect(result?.id).toBe(mockCitadelPaint.id);
      expect(result?.name).toBe(mockCitadelPaint.name);
      expect(result?.brand).toBe(mockCitadelPaint.brand);
    });

    it('returns null when paint not found', async () => {
      const mockSnapshot = {
        empty: true,
        docs: [],
      };
      mockGetDocs.mockResolvedValue(mockSnapshot as never);

      const result = await lookupPaintByEan(mockNotFoundBarcode);

      expect(result).toBeNull();
    });

    it('returns null for invalid EAN format without calling Firestore', async () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const result = await lookupPaintByEan('invalid');

      expect(result).toBeNull();
      expect(mockGetDocs).not.toHaveBeenCalled();
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Invalid EAN format'));

      consoleSpy.mockRestore();
    });

    it('returns null for empty string EAN', async () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const result = await lookupPaintByEan('');

      expect(result).toBeNull();
      expect(mockGetDocs).not.toHaveBeenCalled();

      consoleSpy.mockRestore();
    });

    it('throws error when Firestore query fails', async () => {
      const firestoreError = new Error('Firestore connection failed');
      mockGetDocs.mockRejectedValue(firestoreError);

      await expect(lookupPaintByEan(EXPECTED_BARCODES.citadel)).rejects.toThrow(
        'Firestore connection failed'
      );
    });

    it('logs error when Firestore query fails', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const firestoreError = new Error('Network error');
      mockGetDocs.mockRejectedValue(firestoreError);

      await expect(lookupPaintByEan(EXPECTED_BARCODES.citadel)).rejects.toThrow();

      expect(consoleSpy).toHaveBeenCalledWith(
        'Error looking up paint by EAN:',
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });
  });

  describe('calculateEanCoverage', () => {
    it('returns 100% coverage when all paints have EAN', () => {
      const paints = [mockCitadelPaint, mockVallejoPaint, mockMonumentPaint];

      const result = calculateEanCoverage(paints);

      expect(result.totalPaints).toBe(3);
      expect(result.paintsWithEan).toBe(3);
      expect(result.coveragePercentage).toBe(100);
    });

    it('returns 0% coverage when no paints have EAN', () => {
      const paints = [mockPaintWithoutEan, mockPaintUndefinedEan];

      const result = calculateEanCoverage(paints);

      expect(result.totalPaints).toBe(2);
      expect(result.paintsWithEan).toBe(0);
      expect(result.coveragePercentage).toBe(0);
    });

    it('returns correct mixed coverage percentage', () => {
      const paints = [mockCitadelPaint, mockPaintWithoutEan, mockPaintUndefinedEan];

      const result = calculateEanCoverage(paints);

      expect(result.totalPaints).toBe(3);
      expect(result.paintsWithEan).toBe(1);
      expect(result.coveragePercentage).toBeCloseTo(33.33, 1);
    });

    it('calculates correct per-brand statistics', () => {
      const paints = [
        mockCitadelPaint, // citadel, has EAN
        mockVallejoPaint, // vallejo, has EAN
        mockPaintWithoutEan, // test_brand, no EAN
      ];

      const result = calculateEanCoverage(paints);

      expect(result.byBrand.citadel).toEqual({
        total: 1,
        withEan: 1,
        percentage: 100,
      });

      expect(result.byBrand.vallejo).toEqual({
        total: 1,
        withEan: 1,
        percentage: 100,
      });

      expect(result.byBrand.test_brand).toEqual({
        total: 1,
        withEan: 0,
        percentage: 0,
      });
    });

    it('handles empty array', () => {
      const result = calculateEanCoverage([]);

      expect(result.totalPaints).toBe(0);
      expect(result.paintsWithEan).toBe(0);
      expect(result.coveragePercentage).toBe(0);
      expect(result.byBrand).toEqual({});
    });

    it('handles multiple paints from same brand with mixed coverage', () => {
      const paints = [
        mockCitadelPaint, // citadel, has EAN
        { ...mockCitadelPaint, id: 'citadel-2', ean: null }, // citadel, no EAN
        { ...mockCitadelPaint, id: 'citadel-3', ean: undefined }, // citadel, undefined EAN
      ];

      const result = calculateEanCoverage(paints);

      expect(result.byBrand.citadel).toEqual({
        total: 3,
        withEan: 1,
        percentage: expect.closeTo(33.33, 1),
      });
    });
  });
});
