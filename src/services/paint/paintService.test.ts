import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  searchPaints,
  getAutocompleteSuggestions,
  getPaintById,
  getPaintFilterOptions,
} from './paintService';
import * as paintCache from './paintCache';

// Mock the cache module
vi.mock('./paintCache', () => ({
  getCachedPaints: vi.fn(),
  getFilterOptions: vi.fn(),
  loadPaints: vi.fn(),
}));

const mockPaints = [
  {
    id: '1',
    name: 'Abaddon Black',
    nameLower: 'abaddon black',
    brand: 'citadel',
    brandLower: 'citadel',
    paintType: 'base',
    productLine: 'Base',
    sku: null,
    hexColor: '#000000',
    rgb: { r: 0, g: 0, b: 0 },
  },
  {
    id: '2',
    name: 'Mephiston Red',
    nameLower: 'mephiston red',
    brand: 'citadel',
    brandLower: 'citadel',
    paintType: 'base',
    productLine: 'Base',
    sku: null,
    hexColor: '#9A1115',
    rgb: { r: 154, g: 17, b: 21 },
  },
  {
    id: '3',
    name: 'Model Color Black',
    nameLower: 'model color black',
    brand: 'vallejo',
    brandLower: 'vallejo',
    paintType: 'base',
    productLine: 'Model Color',
    sku: '70.950',
    hexColor: '#000000',
    rgb: { r: 0, g: 0, b: 0 },
  },
];

const mockFilterOptions = {
  brands: ['citadel', 'vallejo'],
  paintTypes: ['base'],
  productLines: ['Base', 'Model Color'],
};

describe('paintService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (paintCache.getCachedPaints as ReturnType<typeof vi.fn>).mockResolvedValue(
      mockPaints
    );
    (paintCache.getFilterOptions as ReturnType<typeof vi.fn>).mockResolvedValue(
      mockFilterOptions
    );
  });

  describe('searchPaints', () => {
    it('returns all paints when no filters applied', async () => {
      const result = await searchPaints({});
      expect(result.results).toHaveLength(3);
      expect(result.totalMatches).toBe(3);
    });

    it('filters by query (partial match)', async () => {
      const result = await searchPaints({ query: 'black' });
      expect(result.results).toHaveLength(2);
      expect(
        result.results.every((r) =>
          r.paint.name.toLowerCase().includes('black')
        )
      ).toBe(true);
    });

    it('filters by brand', async () => {
      const result = await searchPaints({ brand: 'vallejo' });
      expect(result.results).toHaveLength(1);
      expect(result.results[0].paint.brand).toBe('vallejo');
    });

    it('combines query and brand filters', async () => {
      const result = await searchPaints({ query: 'black', brand: 'citadel' });
      expect(result.results).toHaveLength(1);
      expect(result.results[0].paint.name).toBe('Abaddon Black');
    });

    it('scores exact matches higher', async () => {
      const result = await searchPaints({ query: 'abaddon black' });
      expect(result.results[0].paint.name).toBe('Abaddon Black');
      expect(result.results[0].score).toBe(100);
    });

    it('scores prefix matches higher than contains', async () => {
      const result = await searchPaints({ query: 'abad' });
      expect(result.results[0].paint.name).toBe('Abaddon Black');
      expect(result.results[0].score).toBe(80);
    });

    it('respects limit parameter', async () => {
      const result = await searchPaints({ limit: 1 });
      expect(result.results).toHaveLength(1);
      expect(result.totalMatches).toBe(3);
    });

    it('returns search time in response', async () => {
      const result = await searchPaints({});
      expect(result.searchTimeMs).toBeGreaterThanOrEqual(0);
    });

    it('returns empty results for non-matching query', async () => {
      const result = await searchPaints({ query: 'nonexistent' });
      expect(result.results).toHaveLength(0);
      expect(result.totalMatches).toBe(0);
    });

    it('is case insensitive', async () => {
      const result = await searchPaints({ query: 'ABADDON' });
      expect(result.results).toHaveLength(1);
      expect(result.results[0].paint.name).toBe('Abaddon Black');
    });

    it('filters by paintType', async () => {
      const result = await searchPaints({ paintType: 'base' });
      expect(result.results).toHaveLength(3);
    });

    it('filters by productLine', async () => {
      const result = await searchPaints({ productLine: 'Model Color' });
      expect(result.results).toHaveLength(1);
      expect(result.results[0].paint.productLine).toBe('Model Color');
    });
  });

  describe('getAutocompleteSuggestions', () => {
    it('returns empty for queries less than 2 characters', async () => {
      const result = await getAutocompleteSuggestions('a');
      expect(result).toEqual([]);
    });

    it('returns suggestions for valid queries', async () => {
      const result = await getAutocompleteSuggestions('ab');
      expect(result.length).toBeGreaterThan(0);
      expect(result[0]).toHaveProperty('id');
      expect(result[0]).toHaveProperty('name');
      expect(result[0]).toHaveProperty('hexColor');
    });

    it('limits results to 8 suggestions', async () => {
      const manyPaints = Array(20)
        .fill(mockPaints[0])
        .map((p, i) => ({
          ...p,
          id: String(i),
          nameLower: 'test paint',
        }));
      (paintCache.getCachedPaints as ReturnType<typeof vi.fn>).mockResolvedValue(
        manyPaints
      );

      const result = await getAutocompleteSuggestions('test');
      expect(result.length).toBeLessThanOrEqual(8);
    });

    it('respects brand filter', async () => {
      const result = await getAutocompleteSuggestions('black', 'citadel');
      expect(result).toHaveLength(1);
      expect(result[0].brand).toBe('citadel');
    });
  });

  describe('getPaintById', () => {
    it('returns paint when found', async () => {
      const result = await getPaintById('1');
      expect(result?.name).toBe('Abaddon Black');
    });

    it('returns null when not found', async () => {
      const result = await getPaintById('nonexistent');
      expect(result).toBeNull();
    });
  });

  describe('getPaintFilterOptions', () => {
    it('returns filter options from cache', async () => {
      const result = await getPaintFilterOptions();
      expect(result).toEqual(mockFilterOptions);
    });
  });
});
