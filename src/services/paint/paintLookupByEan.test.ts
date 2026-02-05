import { describe, it, expect } from 'vitest';
import { isValidEan, validateEanChecksum, calculateEanCoverage } from './paintLookupByEan';
import type { Paint } from '../../types/paint';

describe('isValidEan', () => {
  it('accepts a valid 13-digit EAN', () => {
    expect(isValidEan('5011921120963')).toBe(true);
  });

  it('accepts a valid 12-digit UPC', () => {
    // Monument Hobbies UPC format
    expect(isValidEan('628504411421')).toBe(true);
  });

  it('rejects an 11-digit string', () => {
    expect(isValidEan('50119211209')).toBe(false);
  });

  it('rejects a 14-digit string', () => {
    expect(isValidEan('50119211209630')).toBe(false);
  });

  it('rejects an empty string', () => {
    expect(isValidEan('')).toBe(false);
  });

  it('rejects non-numeric characters', () => {
    expect(isValidEan('501192112096a')).toBe(false);
  });

  it('rejects a string with spaces', () => {
    expect(isValidEan('5011921 20963')).toBe(false);
  });
});

describe('validateEanChecksum', () => {
  it('validates a correct EAN-13 checksum (Citadel Macragge Blue)', () => {
    expect(validateEanChecksum('5011921120963')).toBe(true);
  });

  it('validates another correct EAN-13 (Vallejo US Dark Green)', () => {
    expect(validateEanChecksum('8429551708593')).toBe(true);
  });

  it('validates a correct UPC-12 checksum (Monument Hobbies)', () => {
    // Shadow Flesh UPC from prexhobby.com
    expect(validateEanChecksum('628504411421')).toBe(true);
  });

  it('rejects an EAN with wrong check digit', () => {
    // Change last digit from 3 to 4
    expect(validateEanChecksum('5011921120964')).toBe(false);
  });

  it('rejects an EAN with all zeros except check digit', () => {
    // 0000000000000 - check digit for all zeros is 0
    expect(validateEanChecksum('0000000000000')).toBe(true);
    // Wrong check digit
    expect(validateEanChecksum('0000000000001')).toBe(false);
  });

  it('returns false for invalid format (too short)', () => {
    expect(validateEanChecksum('12345')).toBe(false);
  });

  it('returns false for non-numeric input', () => {
    expect(validateEanChecksum('abcdefghijklm')).toBe(false);
  });
});

describe('calculateEanCoverage', () => {
  const makePaint = (brand: string, ean?: string | null): Paint => ({
    id: `paint-${Math.random()}`,
    name: 'Test Paint',
    brand,
    productLine: 'Test Line',
    paintType: 'base',
    sku: null,
    hexColor: '#000000',
    rgb: { r: 0, g: 0, b: 0 },
    ean: ean ?? undefined,
  });

  it('returns zero coverage for empty array', () => {
    const stats = calculateEanCoverage([]);
    expect(stats.totalPaints).toBe(0);
    expect(stats.paintsWithEan).toBe(0);
    expect(stats.coveragePercentage).toBe(0);
  });

  it('returns 100% when all paints have EANs', () => {
    const paints = [
      makePaint('citadel', '5011921120963'),
      makePaint('citadel', '5011921120970'),
    ];
    const stats = calculateEanCoverage(paints);
    expect(stats.totalPaints).toBe(2);
    expect(stats.paintsWithEan).toBe(2);
    expect(stats.coveragePercentage).toBe(100);
  });

  it('returns 0% when no paints have EANs', () => {
    const paints = [makePaint('citadel'), makePaint('vallejo')];
    const stats = calculateEanCoverage(paints);
    expect(stats.paintsWithEan).toBe(0);
    expect(stats.coveragePercentage).toBe(0);
  });

  it('calculates partial coverage correctly', () => {
    const paints = [
      makePaint('citadel', '5011921120963'),
      makePaint('citadel'),
      makePaint('vallejo', '8429551708593'),
      makePaint('vallejo'),
    ];
    const stats = calculateEanCoverage(paints);
    expect(stats.totalPaints).toBe(4);
    expect(stats.paintsWithEan).toBe(2);
    expect(stats.coveragePercentage).toBe(50);
  });

  it('breaks down coverage by brand', () => {
    const paints = [
      makePaint('citadel', '5011921120963'),
      makePaint('citadel', '5011921120970'),
      makePaint('citadel'),
      makePaint('vallejo', '8429551708593'),
      makePaint('vallejo'),
      makePaint('vallejo'),
    ];
    const stats = calculateEanCoverage(paints);

    expect(stats.byBrand['citadel'].total).toBe(3);
    expect(stats.byBrand['citadel'].withEan).toBe(2);
    expect(stats.byBrand['citadel'].percentage).toBeCloseTo(66.67, 1);

    expect(stats.byBrand['vallejo'].total).toBe(3);
    expect(stats.byBrand['vallejo'].withEan).toBe(1);
    expect(stats.byBrand['vallejo'].percentage).toBeCloseTo(33.33, 1);
  });

  it('treats null EAN as no EAN', () => {
    const paints = [makePaint('citadel', null)];
    const stats = calculateEanCoverage(paints);
    expect(stats.paintsWithEan).toBe(0);
  });
});
