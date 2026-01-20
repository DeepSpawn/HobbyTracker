import { useState, useEffect, useCallback, useRef } from 'react';
import type { Paint } from '../types/paint';
import type {
  PaintSearchParams,
  PaintAutocompleteSuggestion,
  PaintFilterOptions,
} from '../types/paintSearch';
import {
  searchPaints,
  getAutocompleteSuggestions,
  getPaintFilterOptions,
} from '../services/paint';

// Debounce delay for autocomplete (ms)
const DEBOUNCE_DELAY = 150;

export interface UsePaintSearchState {
  /** Search query string */
  query: string;
  /** Selected brand filter */
  brand: string;
  /** Search results */
  results: Paint[];
  /** Autocomplete suggestions */
  suggestions: PaintAutocompleteSuggestion[];
  /** Available filter options */
  filterOptions: PaintFilterOptions | null;
  /** Loading state for search */
  isSearching: boolean;
  /** Loading state for suggestions */
  isSuggestionsLoading: boolean;
  /** Total number of matches (before limit) */
  totalMatches: number;
  /** Last search time in ms */
  searchTimeMs: number;
  /** Error if search failed */
  error: Error | null;
}

export interface UsePaintSearchActions {
  /** Update search query */
  setQuery: (query: string) => void;
  /** Update brand filter */
  setBrand: (brand: string) => void;
  /** Clear all filters and query */
  reset: () => void;
  /** Manually trigger search */
  search: (params?: PaintSearchParams) => Promise<void>;
}

export type UsePaintSearchReturn = UsePaintSearchState & UsePaintSearchActions;

/**
 * Hook for paint search with debounced autocomplete
 */
export function usePaintSearch(
  initialParams: PaintSearchParams = {}
): UsePaintSearchReturn {
  const [query, setQueryState] = useState(initialParams.query ?? '');
  const [brand, setBrandState] = useState(initialParams.brand ?? '');
  const [results, setResults] = useState<Paint[]>([]);
  const [suggestions, setSuggestions] = useState<PaintAutocompleteSuggestion[]>(
    []
  );
  const [filterOptions, setFilterOptions] = useState<PaintFilterOptions | null>(
    null
  );
  const [isSearching, setIsSearching] = useState(false);
  const [isSuggestionsLoading, setIsSuggestionsLoading] = useState(false);
  const [totalMatches, setTotalMatches] = useState(0);
  const [searchTimeMs, setSearchTimeMs] = useState(0);
  const [error, setError] = useState<Error | null>(null);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load filter options on mount
  useEffect(() => {
    getPaintFilterOptions()
      .then(setFilterOptions)
      .catch((err) => {
        console.error('Failed to load filter options:', err);
      });
  }, []);

  // Debounced autocomplete suggestions
  useEffect(() => {
    // Clear previous debounce
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    // Clear suggestions if query too short
    if (query.length < 2) {
      setSuggestions([]);
      return;
    }

    setIsSuggestionsLoading(true);

    debounceRef.current = setTimeout(async () => {
      try {
        const newSuggestions = await getAutocompleteSuggestions(query, brand || undefined);
        setSuggestions(newSuggestions);
      } catch (err) {
        console.error('Autocomplete error:', err);
        setSuggestions([]);
      } finally {
        setIsSuggestionsLoading(false);
      }
    }, DEBOUNCE_DELAY);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [query, brand]);

  const search = useCallback(
    async (params: PaintSearchParams = {}) => {
      setIsSearching(true);
      setError(null);

      try {
        const response = await searchPaints({
          query: params.query ?? query,
          brand: params.brand ?? (brand || undefined),
          ...params,
        });

        setResults(response.results.map((r) => r.paint));
        setTotalMatches(response.totalMatches);
        setSearchTimeMs(response.searchTimeMs);
      } catch (err) {
        if (err instanceof Error) {
          setError(err);
        }
        setResults([]);
      } finally {
        setIsSearching(false);
      }
    },
    [query, brand]
  );

  const setQuery = useCallback((newQuery: string) => {
    setQueryState(newQuery);
  }, []);

  const setBrand = useCallback((newBrand: string) => {
    setBrandState(newBrand);
  }, []);

  const reset = useCallback(() => {
    setQueryState('');
    setBrandState('');
    setResults([]);
    setSuggestions([]);
    setTotalMatches(0);
    setSearchTimeMs(0);
    setError(null);
  }, []);

  return {
    query,
    brand,
    results,
    suggestions,
    filterOptions,
    isSearching,
    isSuggestionsLoading,
    totalMatches,
    searchTimeMs,
    error,
    setQuery,
    setBrand,
    reset,
    search,
  };
}
