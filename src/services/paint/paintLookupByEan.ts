/**
 * Paint Lookup by Barcode Service
 *
 * Provides Firestore lookup functionality to find paints by their barcode.
 * Supports both EAN-13 (13 digits) and UPC-A (12 digits) formats.
 * Used by the barcode scanner feature (P0b) to quickly identify paints.
 */

import { collection, query, where, getDocs, limit } from 'firebase/firestore';
import { db, COLLECTIONS } from '../../lib/firebase';
import type { Paint } from '../../types/paint';

// Barcode validation regex (EAN-13 or UPC-12)
const BARCODE_REGEX = /^\d{12,13}$/;

/**
 * Validate barcode format (EAN-13 or UPC-12)
 */
export function isValidEan(barcode: string): boolean {
  return BARCODE_REGEX.test(barcode);
}

/**
 * Validate barcode checksum
 * Both EAN-13 and UPC-A use the same modulo 10 checksum algorithm
 */
export function validateEanChecksum(barcode: string): boolean {
  if (!isValidEan(barcode)) return false;

  const digits = barcode.split('').map(Number);
  const length = digits.length;
  let sum = 0;

  // For both UPC-12 and EAN-13, odd positions (from right) are multiplied by 3
  for (let i = 0; i < length - 1; i++) {
    const positionFromRight = length - 1 - i;
    sum += digits[i] * (positionFromRight % 2 === 0 ? 1 : 3);
  }

  const checkDigit = (10 - (sum % 10)) % 10;
  return checkDigit === digits[length - 1];
}

/**
 * Look up a paint by its barcode (EAN-13 or UPC-12)
 *
 * @param barcode - The barcode to search for (12 or 13 digits)
 * @returns The matching paint or null if not found
 */
export async function lookupPaintByEan(barcode: string): Promise<Paint | null> {
  // Validate barcode format
  if (!isValidEan(barcode)) {
    console.warn(`Invalid barcode format: ${barcode}`);
    return null;
  }

  const ean = barcode; // Keep variable name for Firestore field compatibility

  try {
    const paintsRef = collection(db, COLLECTIONS.PAINTS);
    const q = query(paintsRef, where('ean', '==', ean), limit(1));
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      return null;
    }

    const doc = snapshot.docs[0];
    return {
      id: doc.id,
      ...doc.data(),
    } as Paint;
  } catch (error) {
    console.error('Error looking up paint by EAN:', error);
    throw error;
  }
}

/**
 * Check if a barcode exists in the database
 *
 * @param barcode - The barcode to check (EAN-13 or UPC-12)
 * @returns True if a paint with this barcode exists
 */
export async function eanExists(ean: string): Promise<boolean> {
  const paint = await lookupPaintByEan(ean);
  return paint !== null;
}

/**
 * Get EAN coverage statistics from the paint cache
 * Useful for showing users how much barcode scanning coverage they have
 */
export interface EanCoverageStats {
  totalPaints: number;
  paintsWithEan: number;
  coveragePercentage: number;
  byBrand: Record<
    string,
    {
      total: number;
      withEan: number;
      percentage: number;
    }
  >;
}

export function calculateEanCoverage(paints: Paint[]): EanCoverageStats {
  const byBrand: Record<string, { total: number; withEan: number }> = {};

  for (const paint of paints) {
    if (!byBrand[paint.brand]) {
      byBrand[paint.brand] = { total: 0, withEan: 0 };
    }
    byBrand[paint.brand].total++;
    if (paint.ean) {
      byBrand[paint.brand].withEan++;
    }
  }

  const totalPaints = paints.length;
  const paintsWithEan = paints.filter((p) => p.ean).length;

  return {
    totalPaints,
    paintsWithEan,
    coveragePercentage: totalPaints > 0 ? (paintsWithEan / totalPaints) * 100 : 0,
    byBrand: Object.fromEntries(
      Object.entries(byBrand).map(([brand, stats]) => [
        brand,
        {
          ...stats,
          percentage: stats.total > 0 ? (stats.withEan / stats.total) * 100 : 0,
        },
      ])
    ),
  };
}
