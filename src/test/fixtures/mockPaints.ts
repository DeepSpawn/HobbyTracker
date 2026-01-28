import type { Paint } from '../../types/paint';

/**
 * Mock paint data matching real barcodes from test images
 */

export const mockCitadelPaint: Paint = {
  id: 'citadel-macragge-blue',
  name: 'Macragge Blue',
  brand: 'citadel',
  productLine: 'Base',
  paintType: 'base',
  sku: '21-08',
  hexColor: '#0D407F',
  rgb: { r: 13, g: 64, b: 127 },
  ean: '5011921120963',
};

export const mockMonumentPaint: Paint = {
  id: 'monument-mpa006',
  name: 'Bold Titanium White',
  brand: 'monument_hobbies',
  productLine: 'Pro Acryl',
  paintType: 'base',
  sku: 'MPA-006',
  hexColor: '#FFFFFF',
  rgb: { r: 255, g: 255, b: 255 },
  ean: '0628504411063', // UPC-A padded to EAN-13
};

export const mockVallejoPaint: Paint = {
  id: 'vallejo-70893',
  name: 'US Dark Green',
  brand: 'vallejo',
  productLine: 'Model Color',
  paintType: 'base',
  sku: '70.893',
  hexColor: '#3D4B2F',
  rgb: { r: 61, g: 75, b: 47 },
  ean: '8429551708593',
};

// AK Interactive paint NOT in database - for testing not-found flow
export const mockNotFoundBarcode = '8435568302686';

// Collection of all mock paints for tests
export const mockPaints: Paint[] = [
  mockCitadelPaint,
  mockMonumentPaint,
  mockVallejoPaint,
];

// Paint without EAN for coverage tests
export const mockPaintWithoutEan: Paint = {
  id: 'test-no-ean',
  name: 'Test Paint No EAN',
  brand: 'test_brand',
  productLine: 'Test Line',
  paintType: 'base',
  sku: 'TEST-001',
  hexColor: '#FF0000',
  rgb: { r: 255, g: 0, b: 0 },
  ean: null,
};

// Paint with undefined EAN for coverage tests
export const mockPaintUndefinedEan: Paint = {
  id: 'test-undefined-ean',
  name: 'Test Paint Undefined EAN',
  brand: 'test_brand',
  productLine: 'Test Line',
  paintType: 'layer',
  sku: 'TEST-002',
  hexColor: '#00FF00',
  rgb: { r: 0, g: 255, b: 0 },
  // ean intentionally omitted
};

/**
 * Lookup paint by EAN from mock data
 */
export function findMockPaintByEan(ean: string): Paint | null {
  return mockPaints.find((p) => p.ean === ean) ?? null;
}

/**
 * Lookup paint by SKU from mock data
 */
export function findMockPaintBySku(sku: string): Paint | null {
  // Normalize SKU by stripping leading zeros (matching paintService behavior)
  const normalizedSku = sku.replace(/^0+/, '');
  return (
    mockPaints.find((p) => {
      // Check SKU match
      if (p.sku) {
        const paintSku = p.sku.replace(/^0+/, '');
        if (paintSku === normalizedSku) return true;
      }
      // Check EAN match (with and without leading zeros)
      if (p.ean) {
        if (p.ean === sku) return true;
        // Handle UPC-A (12 digit) to EAN-13 (13 digit) conversion
        if (p.ean.startsWith('0') && p.ean.slice(1) === sku) return true;
        if ('0' + sku === p.ean) return true;
      }
      return false;
    }) ?? null
  );
}
