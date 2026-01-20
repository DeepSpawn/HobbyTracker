import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { usePaintSearch } from './usePaintSearch';
import * as paintService from '../services/paint';

vi.mock('../services/paint', () => ({
  searchPaints: vi.fn(),
  getAutocompleteSuggestions: vi.fn(),
  getPaintFilterOptions: vi.fn(),
}));

const mockSearchResponse = {
  results: [
    {
      paint: {
        id: '1',
        name: 'Abaddon Black',
        brand: 'citadel',
        paintType: 'base',
        productLine: 'Base',
        sku: null,
        hexColor: '#000000',
        rgb: { r: 0, g: 0, b: 0 },
      },
      score: 100,
    },
  ],
  totalMatches: 1,
  searchTimeMs: 5,
};

const mockFilterOptions = {
  brands: ['citadel', 'vallejo', 'army_painter'],
  paintTypes: ['base', 'layer', 'shade'],
  productLines: ['Base', 'Layer', 'Shade'],
};

describe('usePaintSearch', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (paintService.searchPaints as ReturnType<typeof vi.fn>).mockResolvedValue(
      mockSearchResponse
    );
    (
      paintService.getAutocompleteSuggestions as ReturnType<typeof vi.fn>
    ).mockResolvedValue([]);
    (
      paintService.getPaintFilterOptions as ReturnType<typeof vi.fn>
    ).mockResolvedValue(mockFilterOptions);
  });

  it('initializes with empty state', () => {
    const { result } = renderHook(() => usePaintSearch());

    expect(result.current.query).toBe('');
    expect(result.current.brand).toBe('');
    expect(result.current.results).toEqual([]);
    expect(result.current.isSearching).toBe(false);
  });

  it('loads filter options on mount', async () => {
    const { result } = renderHook(() => usePaintSearch());

    await waitFor(() => {
      expect(result.current.filterOptions).toEqual(mockFilterOptions);
    });
  });

  it('updates query state', () => {
    const { result } = renderHook(() => usePaintSearch());

    act(() => {
      result.current.setQuery('test');
    });

    expect(result.current.query).toBe('test');
  });

  it('updates brand state', () => {
    const { result } = renderHook(() => usePaintSearch());

    act(() => {
      result.current.setBrand('citadel');
    });

    expect(result.current.brand).toBe('citadel');
  });

  it('performs search when search() called', async () => {
    const { result } = renderHook(() => usePaintSearch());

    await act(async () => {
      await result.current.search({ query: 'abaddon' });
    });

    expect(paintService.searchPaints).toHaveBeenCalledWith(
      expect.objectContaining({ query: 'abaddon' })
    );
    expect(result.current.results).toHaveLength(1);
    expect(result.current.totalMatches).toBe(1);
  });

  it('sets isSearching while searching', async () => {
    let resolveSearch: () => void;
    const searchPromise = new Promise<typeof mockSearchResponse>((resolve) => {
      resolveSearch = () => resolve(mockSearchResponse);
    });
    (paintService.searchPaints as ReturnType<typeof vi.fn>).mockReturnValue(
      searchPromise
    );

    const { result } = renderHook(() => usePaintSearch());

    act(() => {
      result.current.search();
    });

    expect(result.current.isSearching).toBe(true);

    await act(async () => {
      resolveSearch!();
      await searchPromise;
    });

    expect(result.current.isSearching).toBe(false);
  });

  it('resets state when reset() called', () => {
    const { result } = renderHook(() => usePaintSearch());

    act(() => {
      result.current.setQuery('test');
      result.current.setBrand('citadel');
    });

    act(() => {
      result.current.reset();
    });

    expect(result.current.query).toBe('');
    expect(result.current.brand).toBe('');
    expect(result.current.results).toEqual([]);
  });

  it('accepts initial parameters', () => {
    const { result } = renderHook(() =>
      usePaintSearch({ query: 'initial', brand: 'vallejo' })
    );

    expect(result.current.query).toBe('initial');
    expect(result.current.brand).toBe('vallejo');
  });

  it('handles search errors', async () => {
    const error = new Error('Search failed');
    (paintService.searchPaints as ReturnType<typeof vi.fn>).mockRejectedValue(
      error
    );

    const { result } = renderHook(() => usePaintSearch());

    await act(async () => {
      await result.current.search({ query: 'test' });
    });

    expect(result.current.error).toEqual(error);
    expect(result.current.results).toEqual([]);
  });

  it('clears error on new search', async () => {
    const error = new Error('Search failed');
    (paintService.searchPaints as ReturnType<typeof vi.fn>)
      .mockRejectedValueOnce(error)
      .mockResolvedValueOnce(mockSearchResponse);

    const { result } = renderHook(() => usePaintSearch());

    await act(async () => {
      await result.current.search({ query: 'fail' });
    });

    expect(result.current.error).toEqual(error);

    await act(async () => {
      await result.current.search({ query: 'success' });
    });

    expect(result.current.error).toBeNull();
  });
});
