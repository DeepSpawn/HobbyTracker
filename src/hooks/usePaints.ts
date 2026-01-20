import { useState, useEffect, useMemo } from 'react';
import type { Paint, PaintDatabase } from '../types/paint';
import paintData from '../data/paints.json';

interface UsePaintsOptions {
  searchQuery?: string;
  brandFilter?: string;
  productLineFilter?: string;
  paintTypeFilter?: string;
  ownedOnly?: boolean;
  ownedPaintIds?: Set<string>;
}

interface UsePaintsReturn {
  paints: Paint[];
  allPaints: Paint[];
  isLoading: boolean;
  brands: string[];
  productLines: string[];
  paintTypes: string[];
  totalCount: number;
  filteredCount: number;
}

export function usePaints(options: UsePaintsOptions = {}): UsePaintsReturn {
  const [isLoading, setIsLoading] = useState(true);
  const [database, setDatabase] = useState<PaintDatabase | null>(null);

  // Load paint data (already bundled, so this is instant after first load)
  useEffect(() => {
    setDatabase(paintData as PaintDatabase);
    setIsLoading(false);
  }, []);

  // Extract unique values for filters
  const { brands, productLines, paintTypes } = useMemo(() => {
    if (!database) return { brands: [], productLines: [], paintTypes: [] };

    const brandsSet = new Set<string>();
    const productLinesSet = new Set<string>();
    const paintTypesSet = new Set<string>();

    database.paints.forEach((paint) => {
      brandsSet.add(paint.brand);
      productLinesSet.add(paint.productLine);
      paintTypesSet.add(paint.paintType);
    });

    return {
      brands: Array.from(brandsSet).sort(),
      productLines: Array.from(productLinesSet).sort(),
      paintTypes: Array.from(paintTypesSet).sort(),
    };
  }, [database]);

  // Filter paints based on options
  const paints = useMemo(() => {
    if (!database) return [];

    let filtered = database.paints;

    // Search query filter
    if (options.searchQuery) {
      const query = options.searchQuery.toLowerCase();
      filtered = filtered.filter(
        (paint) =>
          paint.name.toLowerCase().includes(query) ||
          paint.brand.toLowerCase().includes(query) ||
          paint.productLine.toLowerCase().includes(query)
      );
    }

    // Brand filter
    if (options.brandFilter) {
      filtered = filtered.filter(
        (paint) => paint.brand === options.brandFilter
      );
    }

    // Product line filter
    if (options.productLineFilter) {
      filtered = filtered.filter(
        (paint) => paint.productLine === options.productLineFilter
      );
    }

    // Paint type filter
    if (options.paintTypeFilter) {
      filtered = filtered.filter(
        (paint) => paint.paintType === options.paintTypeFilter
      );
    }

    // Owned only filter
    if (options.ownedOnly && options.ownedPaintIds) {
      filtered = filtered.filter((paint) => options.ownedPaintIds!.has(paint.id));
    }

    return filtered;
  }, [database, options]);

  return {
    paints,
    allPaints: database?.paints ?? [],
    isLoading,
    brands,
    productLines,
    paintTypes,
    totalCount: database?.counts.total ?? 0,
    filteredCount: paints.length,
  };
}
