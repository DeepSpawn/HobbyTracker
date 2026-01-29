import type { Paint } from '../../types/paint';
import type {
  PaintSearchParams,
  PaintSearchResult,
  PaintSearchResponse,
  PaintAutocompleteSuggestion,
  PaintFilterOptions,
} from '../../types/paintSearch';
import { getCachedPaints, getFilterOptions, loadPaints } from './paintCache';

// Default search limit
const DEFAULT_LIMIT = 20;
const AUTOCOMPLETE_LIMIT = 8;

/**
 * Calculate relevance score for a paint match
 * Higher score = better match
 */
function calculateScore(paintNameLower: string, queryLower: string): number {
  // Exact match
  if (paintNameLower === queryLower) return 100;

  // Starts with query (most relevant for autocomplete)
  if (paintNameLower.startsWith(queryLower)) return 80;

  // Contains query as a word boundary
  if (
    paintNameLower.includes(` ${queryLower}`) ||
    paintNameLower.includes(`${queryLower} `)
  ) {
    return 60;
  }

  // Contains query anywhere
  if (paintNameLower.includes(queryLower)) return 40;

  return 0;
}

/**
 * Search paints with optional filters
 * Performs client-side filtering on cached data
 */
export async function searchPaints(
  params: PaintSearchParams = {}
): Promise<PaintSearchResponse> {
  const startTime = performance.now();
  const { query, brand, paintType, productLine, limit = DEFAULT_LIMIT } = params;

  const paints = await getCachedPaints();
  const queryLower = query?.toLowerCase().trim() || '';

  const results: PaintSearchResult[] = [];

  for (const paint of paints) {
    // Apply filters
    if (brand && paint.brandLower !== brand.toLowerCase()) continue;
    if (paintType && paint.paintType !== paintType) continue;
    if (productLine && paint.productLine !== productLine) continue;

    // If no query, include all filtered paints with score 0
    if (!queryLower) {
      results.push({ paint, score: 0 });
      continue;
    }

    // Calculate match score
    const score = calculateScore(paint.nameLower, queryLower);
    if (score > 0) {
      results.push({ paint, score });
    }
  }

  // Sort by score (descending), then alphabetically by name
  results.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return a.paint.name.localeCompare(b.paint.name);
  });

  const searchTimeMs = performance.now() - startTime;

  return {
    results: results.slice(0, limit),
    totalMatches: results.length,
    searchTimeMs,
  };
}

/**
 * Get autocomplete suggestions for paint names
 * Optimized for fast typing feedback
 */
export async function getAutocompleteSuggestions(
  query: string,
  brand?: string
): Promise<PaintAutocompleteSuggestion[]> {
  if (!query || query.trim().length < 2) {
    return [];
  }

  const response = await searchPaints({
    query,
    brand,
    limit: AUTOCOMPLETE_LIMIT,
  });

  return response.results.map((r) => ({
    id: r.paint.id,
    name: r.paint.name,
    brand: r.paint.brand,
    productLine: r.paint.productLine,
    hexColor: r.paint.hexColor,
  }));
}

/**
 * Get a single paint by ID
 */
export async function getPaintById(id: string): Promise<Paint | null> {
  const paints = await getCachedPaints();
  return paints.find((p) => p.id === id) ?? null;
}

/**
 * Get a paint by its SKU/barcode
 * Normalizes SKUs by stripping leading zeros for comparison
 * Returns null if no paint matches the SKU
 */
export async function getPaintBySku(sku: string): Promise<Paint | null> {
  if (!sku || !sku.trim()) {
    return null;
  }

  const paints = await getCachedPaints();
  const normalizedSku = sku.trim().replace(/^0+/, '');

  const trimmed = sku.trim();

  return (
    paints.find((p) => {
      // Check SKU match
      if (p.sku) {
        const paintSku = p.sku.replace(/^0+/, '');
        if (paintSku === normalizedSku || p.sku === trimmed) return true;
      }
      // Check EAN match
      if (p.ean && p.ean === trimmed) return true;
      return false;
    }) ?? null
  );
}

/**
 * Get available filter options
 */
export async function getPaintFilterOptions(): Promise<PaintFilterOptions> {
  return getFilterOptions();
}

/**
 * Preload paint cache (call on app init for faster first search)
 */
export async function preloadPaints(): Promise<void> {
  return loadPaints();
}
