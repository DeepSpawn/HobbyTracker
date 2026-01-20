import type { Paint } from './paint';

/**
 * Parameters for paint search
 */
export interface PaintSearchParams {
  /** Search query for paint name (partial match, case-insensitive) */
  query?: string;
  /** Filter by brand (exact match) */
  brand?: string;
  /** Filter by paint type (exact match) */
  paintType?: string;
  /** Filter by product line (exact match) */
  productLine?: string;
  /** Maximum number of results to return */
  limit?: number;
}

/**
 * Search result with relevance scoring
 */
export interface PaintSearchResult {
  paint: Paint;
  /** Relevance score (higher is better match) */
  score: number;
}

/**
 * Response from paint search
 */
export interface PaintSearchResponse {
  results: PaintSearchResult[];
  totalMatches: number;
  /** Time in ms to perform search */
  searchTimeMs: number;
}

/**
 * Autocomplete suggestion
 */
export interface PaintAutocompleteSuggestion {
  id: string;
  name: string;
  brand: string;
  productLine: string;
  hexColor: string;
}

/**
 * Available filter options derived from paint data
 */
export interface PaintFilterOptions {
  brands: string[];
  paintTypes: string[];
  productLines: string[];
}
