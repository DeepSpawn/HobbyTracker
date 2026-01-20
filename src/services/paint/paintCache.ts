import { collection, getDocs } from 'firebase/firestore';
import { db, COLLECTIONS } from '../../lib/firebase';
import type { Paint } from '../../types/paint';

export interface CachedPaint extends Paint {
  /** Lowercase name for fast searching */
  nameLower: string;
  /** Lowercase brand for fast filtering */
  brandLower: string;
}

interface PaintCacheState {
  paints: CachedPaint[];
  brands: Set<string>;
  paintTypes: Set<string>;
  productLines: Set<string>;
  loadedAt: number | null;
  isLoading: boolean;
  loadPromise: Promise<void> | null;
}

// Module-level singleton state
let cache: PaintCacheState = {
  paints: [],
  brands: new Set(),
  paintTypes: new Set(),
  productLines: new Set(),
  loadedAt: null,
  isLoading: false,
  loadPromise: null,
};

// Cache TTL: 30 minutes (paints rarely change)
const CACHE_TTL_MS = 30 * 60 * 1000;

/**
 * Check if cache is valid
 */
function isCacheValid(): boolean {
  if (!cache.loadedAt) return false;
  return Date.now() - cache.loadedAt < CACHE_TTL_MS;
}

/**
 * Load paints from Firestore into cache
 * Uses deduplication to prevent multiple simultaneous loads
 */
export async function loadPaints(): Promise<void> {
  // Return existing promise if load is in progress
  if (cache.isLoading && cache.loadPromise) {
    return cache.loadPromise;
  }

  // Return immediately if cache is valid
  if (isCacheValid()) {
    return;
  }

  cache.isLoading = true;
  cache.loadPromise = (async () => {
    try {
      const paintsRef = collection(db, COLLECTIONS.PAINTS);
      const snapshot = await getDocs(paintsRef);

      const paints: CachedPaint[] = [];
      const brands = new Set<string>();
      const paintTypes = new Set<string>();
      const productLines = new Set<string>();

      snapshot.forEach((doc) => {
        const paint = { id: doc.id, ...doc.data() } as Paint;
        paints.push({
          ...paint,
          nameLower: paint.name.toLowerCase(),
          brandLower: paint.brand.toLowerCase(),
        });
        brands.add(paint.brand);
        paintTypes.add(paint.paintType);
        productLines.add(paint.productLine);
      });

      cache = {
        paints,
        brands,
        paintTypes,
        productLines,
        loadedAt: Date.now(),
        isLoading: false,
        loadPromise: null,
      };
    } catch (error) {
      cache.isLoading = false;
      cache.loadPromise = null;
      throw error;
    }
  })();

  return cache.loadPromise;
}

/**
 * Get all cached paints (ensures cache is loaded)
 */
export async function getCachedPaints(): Promise<CachedPaint[]> {
  await loadPaints();
  return cache.paints;
}

/**
 * Get filter options from cache
 */
export async function getFilterOptions(): Promise<{
  brands: string[];
  paintTypes: string[];
  productLines: string[];
}> {
  await loadPaints();
  return {
    brands: Array.from(cache.brands).sort(),
    paintTypes: Array.from(cache.paintTypes).sort(),
    productLines: Array.from(cache.productLines).sort(),
  };
}

/**
 * Force cache invalidation (useful for testing or admin updates)
 */
export function invalidateCache(): void {
  cache = {
    paints: [],
    brands: new Set(),
    paintTypes: new Set(),
    productLines: new Set(),
    loadedAt: null,
    isLoading: false,
    loadPromise: null,
  };
}

/**
 * Check if paints are currently loaded
 */
export function isPaintsLoaded(): boolean {
  return isCacheValid();
}
