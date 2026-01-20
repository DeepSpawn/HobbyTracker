import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getDocs } from 'firebase/firestore';
import {
  loadPaints,
  getCachedPaints,
  invalidateCache,
  isPaintsLoaded,
  getFilterOptions,
} from './paintCache';

const mockPaints = [
  {
    id: '1',
    name: 'Abaddon Black',
    brand: 'citadel',
    paintType: 'base',
    productLine: 'Base',
    sku: null,
    hexColor: '#000000',
    rgb: { r: 0, g: 0, b: 0 },
  },
  {
    id: '2',
    name: 'Mephiston Red',
    brand: 'citadel',
    paintType: 'base',
    productLine: 'Base',
    sku: null,
    hexColor: '#9A1115',
    rgb: { r: 154, g: 17, b: 21 },
  },
  {
    id: '3',
    name: 'Model Color Black',
    brand: 'vallejo',
    paintType: 'base',
    productLine: 'Model Color',
    sku: '70.950',
    hexColor: '#000000',
    rgb: { r: 0, g: 0, b: 0 },
  },
];

function createMockSnapshot() {
  return {
    forEach: (
      callback: (doc: { id: string; data: () => unknown }) => void
    ) => {
      mockPaints.forEach((paint) => {
        callback({ id: paint.id, data: () => paint });
      });
    },
  };
}

describe('paintCache', () => {
  beforeEach(() => {
    invalidateCache();
    vi.clearAllMocks();
  });

  describe('loadPaints', () => {
    it('loads paints from Firestore on first call', async () => {
      (getDocs as ReturnType<typeof vi.fn>).mockResolvedValue(
        createMockSnapshot()
      );

      await loadPaints();

      expect(getDocs).toHaveBeenCalledTimes(1);
      expect(isPaintsLoaded()).toBe(true);
    });

    it('does not reload if cache is valid', async () => {
      (getDocs as ReturnType<typeof vi.fn>).mockResolvedValue(
        createMockSnapshot()
      );

      await loadPaints();
      await loadPaints();
      await loadPaints();

      expect(getDocs).toHaveBeenCalledTimes(1);
    });

    it('deduplicates concurrent load requests', async () => {
      (getDocs as ReturnType<typeof vi.fn>).mockResolvedValue(
        createMockSnapshot()
      );

      await Promise.all([loadPaints(), loadPaints(), loadPaints()]);

      expect(getDocs).toHaveBeenCalledTimes(1);
    });
  });

  describe('getCachedPaints', () => {
    it('returns paints with lowercase fields', async () => {
      (getDocs as ReturnType<typeof vi.fn>).mockResolvedValue(
        createMockSnapshot()
      );

      const paints = await getCachedPaints();

      expect(paints).toHaveLength(3);
      expect(paints[0].nameLower).toBe('abaddon black');
      expect(paints[0].brandLower).toBe('citadel');
    });

    it('loads paints if not already loaded', async () => {
      (getDocs as ReturnType<typeof vi.fn>).mockResolvedValue(
        createMockSnapshot()
      );

      expect(isPaintsLoaded()).toBe(false);
      await getCachedPaints();
      expect(isPaintsLoaded()).toBe(true);
    });
  });

  describe('getFilterOptions', () => {
    it('returns unique brands, paintTypes, and productLines', async () => {
      (getDocs as ReturnType<typeof vi.fn>).mockResolvedValue(
        createMockSnapshot()
      );

      const options = await getFilterOptions();

      expect(options.brands).toEqual(['citadel', 'vallejo']);
      expect(options.paintTypes).toEqual(['base']);
      expect(options.productLines).toEqual(['Base', 'Model Color']);
    });
  });

  describe('invalidateCache', () => {
    it('clears cached data', async () => {
      (getDocs as ReturnType<typeof vi.fn>).mockResolvedValue(
        createMockSnapshot()
      );

      await getCachedPaints();
      expect(isPaintsLoaded()).toBe(true);

      invalidateCache();
      expect(isPaintsLoaded()).toBe(false);

      await getCachedPaints();
      expect(getDocs).toHaveBeenCalledTimes(2);
    });
  });
});
