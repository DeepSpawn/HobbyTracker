/**
 * Paint Lookup by EAN Service
 *
 * Provides Firestore lookup functionality to find paints by their EAN-13 barcode.
 * Used by the barcode scanner feature (P0b) to quickly identify paints.
 */

import { collection, query, where, getDocs, limit } from 'firebase/firestore';
import { db, COLLECTIONS } from '../../lib/firebase';
import type { Paint } from '../../types/paint';

// EAN-13 validation regex
const EAN_REGEX = /^\d{13}$/;

/**
 * Validate EAN-13 barcode format
 */
export function isValidEan(ean: string): boolean {
  return EAN_REGEX.test(ean);
}

/**
 * Validate EAN-13 checksum
 * EAN-13 uses a modulo 10 checksum algorithm
 */
export function validateEanChecksum(ean: string): boolean {
  if (!isValidEan(ean)) return false;

  const digits = ean.split('').map(Number);
  let sum = 0;

  for (let i = 0; i < 12; i++) {
    sum += digits[i] * (i % 2 === 0 ? 1 : 3);
  }

  const checkDigit = (10 - (sum % 10)) % 10;
  return checkDigit === digits[12];
}

/**
 * Look up a paint by its EAN-13 barcode
 *
 * @param ean - The EAN-13 barcode to search for
 * @returns The matching paint or null if not found
 */
export async function lookupPaintByEan(ean: string): Promise<Paint | null> {
  // Validate EAN format
  if (!isValidEan(ean)) {
    console.warn(`Invalid EAN format: ${ean}`);
    return null;
  }

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
 * Check if an EAN exists in the database
 *
 * @param ean - The EAN-13 barcode to check
 * @returns True if a paint with this EAN exists
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
