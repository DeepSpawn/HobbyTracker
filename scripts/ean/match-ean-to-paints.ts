/**
 * EAN Matching Algorithm
 *
 * Matches scraped EAN results from UPCitemdb to existing paints in the database.
 * Uses fuzzy matching to handle name variations between paint database and UPCitemdb.
 *
 * Outputs:
 * - data/ean-mappings.json: Confirmed EAN mappings
 * - data/ean-manual-review.json: Ambiguous matches requiring human review
 *
 * Usage:
 *   npm run ean:match
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import type { Paint, PaintDatabase } from '../../src/types/paint';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const CONFIG = {
  scrapeDir: path.join(__dirname, '../../data/ean-scrape'),
  outputDir: path.join(__dirname, '../../data'),
  paintsFile: path.join(__dirname, '../../src/data/paints.json'),
  manualOverridesFile: path.join(__dirname, '../../data/ean-manual-overrides.json'),
};

// Types
interface ScrapedResult {
  paintId: string;
  paintName: string;
  brand: string;
  productLine: string;
  searchQuery: string;
  results: Array<{
    ean: string;
    title: string;
    brand: string;
    model?: string;
  }>;
  scrapedAt: string;
  error?: string;
}

interface ScrapeSession {
  brand: string;
  results: ScrapedResult[];
}

interface EanMapping {
  paintId: string;
  paintName: string;
  brand: string;
  productLine: string;
  ean: string | null;
  matchConfidence: 'exact' | 'high' | 'low' | 'manual' | 'none';
  source: 'upcitemdb' | 'manual';
  matchedTitle?: string;
  lookupDate: string;
}

interface ManualReviewItem {
  paintId: string;
  paintName: string;
  brand: string;
  productLine: string;
  candidates: Array<{
    ean: string;
    title: string;
    score: number;
  }>;
}

interface MappingOutput {
  version: string;
  generatedAt: string;
  stats: {
    total: number;
    matched: number;
    notFound: number;
    needsReview: number;
    byBrand: Record<string, { total: number; matched: number }>;
  };
  mappings: EanMapping[];
}

// Brand aliases for matching
const BRAND_ALIASES: Record<string, string[]> = {
  citadel: ['citadel', 'games workshop', 'gw', 'warhammer'],
  vallejo: ['vallejo', 'acrylicos vallejo', 'av'],
  army_painter: ['army painter', 'the army painter', 'armypainter', 'tap'],
};

// Known EAN prefixes by brand (GS1 company prefixes)
const BRAND_EAN_PREFIXES: Record<string, string[]> = {
  citadel: ['501192'], // Games Workshop
  vallejo: ['842955'], // Acrylicos Vallejo
  army_painter: ['571379'], // The Army Painter
};

// Utility functions
function loadPaintsDatabase(): PaintDatabase {
  const content = fs.readFileSync(CONFIG.paintsFile, 'utf-8');
  return JSON.parse(content) as PaintDatabase;
}

function loadScrapedResults(): Map<string, ScrapedResult> {
  const results = new Map<string, ScrapedResult>();

  if (!fs.existsSync(CONFIG.scrapeDir)) {
    console.log('No scrape directory found. Run ean:scrape first.');
    return results;
  }

  const files = fs.readdirSync(CONFIG.scrapeDir).filter((f) => f.endsWith('.json') && !f.startsWith('checkpoint'));

  for (const file of files) {
    const filePath = path.join(CONFIG.scrapeDir, file);
    const content = fs.readFileSync(filePath, 'utf-8');
    const session = JSON.parse(content) as ScrapeSession;

    for (const result of session.results) {
      // Use paintId as key, keep latest result if duplicates
      results.set(result.paintId, result);
    }
  }

  return results;
}

function loadManualOverrides(): Map<string, string> {
  const overrides = new Map<string, string>();

  if (fs.existsSync(CONFIG.manualOverridesFile)) {
    const content = fs.readFileSync(CONFIG.manualOverridesFile, 'utf-8');
    const data = JSON.parse(content) as Array<{ paintId: string; ean: string }>;
    for (const item of data) {
      overrides.set(item.paintId, item.ean);
    }
  }

  return overrides;
}

/**
 * Normalize string for comparison
 */
function normalize(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Calculate similarity score between two strings (0-1)
 * Uses Jaccard similarity on word sets
 */
function calculateSimilarity(str1: string, str2: string): number {
  const words1 = new Set(normalize(str1).split(' ').filter(Boolean));
  const words2 = new Set(normalize(str2).split(' ').filter(Boolean));

  if (words1.size === 0 || words2.size === 0) {
    return 0;
  }

  const intersection = new Set([...words1].filter((w) => words2.has(w)));
  const union = new Set([...words1, ...words2]);

  return intersection.size / union.size;
}

/**
 * Check if brand matches based on aliases or EAN prefix
 */
function brandMatches(paintBrand: string, resultBrand: string, resultTitle: string, ean: string): boolean {
  // First check by EAN prefix (most reliable)
  const eanPrefixes = BRAND_EAN_PREFIXES[paintBrand];
  if (eanPrefixes && eanPrefixes.some((prefix) => ean.startsWith(prefix))) {
    return true;
  }

  // Fallback to alias matching in title/brand
  const aliases = BRAND_ALIASES[paintBrand] || [paintBrand];
  const searchText = `${resultBrand} ${resultTitle}`.toLowerCase();

  return aliases.some((alias) => searchText.includes(alias));
}

/**
 * Validate EAN-13 format
 */
function isValidEan(ean: string): boolean {
  return /^\d{13}$/.test(ean);
}

/**
 * Match a single scraped result to determine best EAN
 */
function matchScrapedResult(
  paint: Paint,
  scraped: ScrapedResult
): { ean: string | null; confidence: 'exact' | 'high' | 'low' | 'none'; matchedTitle?: string; candidates?: Array<{ ean: string; title: string; score: number }> } {
  if (!scraped.results || scraped.results.length === 0) {
    return { ean: null, confidence: 'none' };
  }

  // Filter to valid EANs and matching brands
  const validResults = scraped.results.filter(
    (r) => isValidEan(r.ean) && brandMatches(paint.brand, r.brand, r.title, r.ean)
  );

  if (validResults.length === 0) {
    return { ean: null, confidence: 'none' };
  }

  // Score each result
  const scored = validResults.map((r) => {
    // Check if the title is just an EAN (no product info)
    const titleIsJustEan = /^\d{13}$/.test(r.title.trim());

    let score: number;
    if (titleIsJustEan) {
      // When title is just EAN, we rely on brand prefix matching
      // Give a base score that depends on whether there's only one result
      score = validResults.length === 1 ? 0.7 : 0.4;
    } else {
      const nameSimilarity = calculateSimilarity(paint.name, r.title);
      const productLineSimilarity = r.title.toLowerCase().includes(paint.productLine.toLowerCase()) ? 0.2 : 0;
      score = nameSimilarity + productLineSimilarity;
    }

    return {
      ean: r.ean,
      title: r.title,
      score,
    };
  });

  // Sort by score descending
  scored.sort((a, b) => b.score - a.score);

  const best = scored[0];

  // Determine confidence level
  if (best.score >= 0.8) {
    return { ean: best.ean, confidence: 'exact', matchedTitle: best.title };
  } else if (best.score >= 0.5) {
    // Check if there are close alternatives (need review)
    const closeAlternatives = scored.filter((s) => s.score >= best.score - 0.1 && s.ean !== best.ean);
    if (closeAlternatives.length > 0) {
      return { ean: null, confidence: 'low', candidates: scored.slice(0, 5) };
    }
    return { ean: best.ean, confidence: 'high', matchedTitle: best.title };
  } else if (best.score >= 0.3) {
    return { ean: null, confidence: 'low', candidates: scored.slice(0, 5) };
  }

  return { ean: null, confidence: 'none' };
}

/**
 * Main matching function
 */
async function main(): Promise<void> {
  console.log('Loading paints database...');
  const database = loadPaintsDatabase();
  console.log(`Loaded ${database.paints.length} paints`);

  console.log('\nLoading scraped results...');
  const scrapedResults = loadScrapedResults();
  console.log(`Loaded ${scrapedResults.size} scraped results`);

  console.log('\nLoading manual overrides...');
  const manualOverrides = loadManualOverrides();
  console.log(`Loaded ${manualOverrides.size} manual overrides`);

  const mappings: EanMapping[] = [];
  const manualReview: ManualReviewItem[] = [];
  const stats = {
    total: 0,
    matched: 0,
    notFound: 0,
    needsReview: 0,
    byBrand: {} as Record<string, { total: number; matched: number }>,
  };

  console.log('\nMatching paints to EANs...');

  for (const paint of database.paints) {
    stats.total++;

    // Initialize brand stats
    if (!stats.byBrand[paint.brand]) {
      stats.byBrand[paint.brand] = { total: 0, matched: 0 };
    }
    stats.byBrand[paint.brand].total++;

    // Check manual override first
    if (manualOverrides.has(paint.id)) {
      const ean = manualOverrides.get(paint.id)!;
      mappings.push({
        paintId: paint.id,
        paintName: paint.name,
        brand: paint.brand,
        productLine: paint.productLine,
        ean,
        matchConfidence: 'manual',
        source: 'manual',
        lookupDate: new Date().toISOString(),
      });
      stats.matched++;
      stats.byBrand[paint.brand].matched++;
      continue;
    }

    // Check if we have scraped data for this paint
    const scraped = scrapedResults.get(paint.id);
    if (!scraped) {
      // No scraped data yet
      mappings.push({
        paintId: paint.id,
        paintName: paint.name,
        brand: paint.brand,
        productLine: paint.productLine,
        ean: null,
        matchConfidence: 'none',
        source: 'upcitemdb',
        lookupDate: new Date().toISOString(),
      });
      stats.notFound++;
      continue;
    }

    // Try to match
    const match = matchScrapedResult(paint, scraped);

    if (match.ean && (match.confidence === 'exact' || match.confidence === 'high')) {
      mappings.push({
        paintId: paint.id,
        paintName: paint.name,
        brand: paint.brand,
        productLine: paint.productLine,
        ean: match.ean,
        matchConfidence: match.confidence,
        source: 'upcitemdb',
        matchedTitle: match.matchedTitle,
        lookupDate: new Date().toISOString(),
      });
      stats.matched++;
      stats.byBrand[paint.brand].matched++;
    } else if (match.candidates && match.candidates.length > 0) {
      // Needs manual review
      manualReview.push({
        paintId: paint.id,
        paintName: paint.name,
        brand: paint.brand,
        productLine: paint.productLine,
        candidates: match.candidates,
      });
      mappings.push({
        paintId: paint.id,
        paintName: paint.name,
        brand: paint.brand,
        productLine: paint.productLine,
        ean: null,
        matchConfidence: 'low',
        source: 'upcitemdb',
        lookupDate: new Date().toISOString(),
      });
      stats.needsReview++;
    } else {
      // No match found
      mappings.push({
        paintId: paint.id,
        paintName: paint.name,
        brand: paint.brand,
        productLine: paint.productLine,
        ean: null,
        matchConfidence: 'none',
        source: 'upcitemdb',
        lookupDate: new Date().toISOString(),
      });
      stats.notFound++;
    }
  }

  // Write mappings output
  const output: MappingOutput = {
    version: '1.0.0',
    generatedAt: new Date().toISOString(),
    stats,
    mappings,
  };

  const mappingsPath = path.join(CONFIG.outputDir, 'ean-mappings.json');
  fs.writeFileSync(mappingsPath, JSON.stringify(output, null, 2));
  console.log(`\nMappings saved to: ${mappingsPath}`);

  // Write manual review items
  if (manualReview.length > 0) {
    const reviewPath = path.join(CONFIG.outputDir, 'ean-manual-review.json');
    fs.writeFileSync(reviewPath, JSON.stringify(manualReview, null, 2));
    console.log(`Manual review items saved to: ${reviewPath}`);
  }

  // Print summary
  console.log('\n' + '='.repeat(60));
  console.log('MATCHING SUMMARY');
  console.log('='.repeat(60));
  console.log(`Total paints:     ${stats.total}`);
  console.log(`Matched:          ${stats.matched} (${((stats.matched / stats.total) * 100).toFixed(1)}%)`);
  console.log(`Needs review:     ${stats.needsReview}`);
  console.log(`Not found:        ${stats.notFound}`);
  console.log('\nBy brand:');
  for (const [brand, brandStats] of Object.entries(stats.byBrand)) {
    const pct = ((brandStats.matched / brandStats.total) * 100).toFixed(1);
    console.log(`  ${brand}: ${brandStats.matched}/${brandStats.total} (${pct}%)`);
  }
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
