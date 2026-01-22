/**
 * UPCitemdb EAN Scraper for Paint Database
 *
 * Scrapes EAN-13 barcode data from UPCitemdb.com for miniature paints.
 * Uses the search functionality to look up paints by brand and name.
 *
 * Rate limiting: 2 second delay between requests to be respectful.
 * Checkpoint support: Saves progress and can resume from where it left off.
 *
 * Usage:
 *   npm run ean:scrape                    # Scrape all brands
 *   npm run ean:scrape -- --brand=citadel # Scrape specific brand
 *   npm run ean:scrape -- --limit=10      # Limit number of paints to scrape
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import type { Paint, PaintDatabase } from '../../src/types/paint';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const CONFIG = {
  baseUrl: 'https://www.upcitemdb.com',
  searchPath: '/query',
  requestDelayMs: 2000, // 2 second delay between requests
  outputDir: path.join(__dirname, '../../data/ean-scrape'),
  paintsFile: path.join(__dirname, '../../src/data/paints.json'),
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
  startedAt: string;
  lastUpdatedAt: string;
  completedCount: number;
  totalCount: number;
  results: ScrapedResult[];
}

interface CheckpointData {
  brand: string;
  completedPaintIds: string[];
  lastUpdatedAt: string;
}

// Utility functions
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function loadPaintsDatabase(): PaintDatabase {
  const content = fs.readFileSync(CONFIG.paintsFile, 'utf-8');
  return JSON.parse(content) as PaintDatabase;
}

function getCheckpointPath(brand: string): string {
  return path.join(CONFIG.outputDir, `checkpoint-${brand}.json`);
}

function loadCheckpoint(brand: string): CheckpointData | null {
  const checkpointPath = getCheckpointPath(brand);
  if (fs.existsSync(checkpointPath)) {
    const content = fs.readFileSync(checkpointPath, 'utf-8');
    return JSON.parse(content) as CheckpointData;
  }
  return null;
}

function saveCheckpoint(brand: string, completedPaintIds: string[]): void {
  const checkpoint: CheckpointData = {
    brand,
    completedPaintIds,
    lastUpdatedAt: new Date().toISOString(),
  };
  const checkpointPath = getCheckpointPath(brand);
  fs.writeFileSync(checkpointPath, JSON.stringify(checkpoint, null, 2));
}

function getOutputPath(brand: string): string {
  const date = new Date().toISOString().split('T')[0];
  return path.join(CONFIG.outputDir, `${brand}-${date}.json`);
}

function loadExistingResults(brand: string): ScrapedResult[] {
  // Check if there's an existing file for today
  const outputPath = getOutputPath(brand);
  if (fs.existsSync(outputPath)) {
    const content = fs.readFileSync(outputPath, 'utf-8');
    const session = JSON.parse(content) as ScrapeSession;
    return session.results;
  }
  return [];
}

function saveResults(brand: string, results: ScrapedResult[], totalCount: number): void {
  const session: ScrapeSession = {
    brand,
    startedAt: new Date().toISOString(),
    lastUpdatedAt: new Date().toISOString(),
    completedCount: results.length,
    totalCount,
    results,
  };
  const outputPath = getOutputPath(brand);
  fs.writeFileSync(outputPath, JSON.stringify(session, null, 2));
}

/**
 * Build search query for a paint
 */
function buildSearchQuery(paint: Paint): string {
  const brandNames: Record<string, string> = {
    citadel: 'Citadel',
    vallejo: 'Vallejo',
    army_painter: 'Army Painter',
  };

  const brandName = brandNames[paint.brand] || paint.brand;

  // For Vallejo, use SKU if available (more reliable)
  if (paint.brand === 'vallejo' && paint.sku) {
    return `${brandName} ${paint.sku}`;
  }

  // Include product line for disambiguation
  return `${brandName} ${paint.productLine} ${paint.name}`;
}

/**
 * Parse EAN results from UPCitemdb search page HTML
 */
function parseSearchResults(
  html: string
): Array<{ ean: string; title: string; brand: string; model?: string }> {
  const results: Array<{ ean: string; title: string; brand: string; model?: string }> = [];

  // UPCitemdb search results are in a table with class "table-condensed"
  // Each row has EAN, title, brand info

  // Extract EAN codes (13 digit numbers)
  const eanMatches = html.matchAll(/\b(\d{13})\b/g);
  const eans = new Set<string>();
  for (const match of eanMatches) {
    eans.add(match[1]);
  }

  // Extract product info from result items
  // Look for patterns like: <a href="/upc/5011921026524">Product Title</a>
  const productPattern = /<a[^>]*href="\/upc\/(\d{13})"[^>]*>([^<]+)<\/a>/gi;
  const productMatches = html.matchAll(productPattern);

  for (const match of productMatches) {
    const ean = match[1];
    const title = match[2].trim();

    // Try to extract brand from title or surrounding context
    let brand = '';
    if (title.toLowerCase().includes('citadel') || title.toLowerCase().includes('games workshop')) {
      brand = 'Games Workshop';
    } else if (title.toLowerCase().includes('vallejo')) {
      brand = 'Vallejo';
    } else if (title.toLowerCase().includes('army painter')) {
      brand = 'Army Painter';
    }

    results.push({ ean, title, brand });
  }

  // If no structured results found but we have EANs, add them with minimal info
  if (results.length === 0 && eans.size > 0) {
    for (const ean of eans) {
      // Skip obviously non-product EANs (like timestamps)
      if (ean.startsWith('5011921') || ean.startsWith('8429551') || ean.startsWith('5713799')) {
        results.push({ ean, title: '', brand: '' });
      }
    }
  }

  return results;
}

/**
 * Scrape UPCitemdb for a single paint
 */
async function scrapePaint(paint: Paint): Promise<ScrapedResult> {
  const searchQuery = buildSearchQuery(paint);
  const encodedQuery = encodeURIComponent(searchQuery);
  const url = `${CONFIG.baseUrl}${CONFIG.searchPath}?s=${encodedQuery}`;

  const result: ScrapedResult = {
    paintId: paint.id,
    paintName: paint.name,
    brand: paint.brand,
    productLine: paint.productLine,
    searchQuery,
    results: [],
    scrapedAt: new Date().toISOString(),
  };

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
      },
    });

    if (!response.ok) {
      result.error = `HTTP ${response.status}: ${response.statusText}`;
      return result;
    }

    const html = await response.text();
    result.results = parseSearchResults(html);
  } catch (error) {
    result.error = error instanceof Error ? error.message : String(error);
  }

  return result;
}

/**
 * Main scraper function
 */
async function main(): Promise<void> {
  // Parse CLI arguments
  const args = process.argv.slice(2);
  let brandFilter: string | undefined;
  let limit: number | undefined;

  for (const arg of args) {
    if (arg.startsWith('--brand=')) {
      brandFilter = arg.split('=')[1];
    } else if (arg.startsWith('--limit=')) {
      limit = parseInt(arg.split('=')[1], 10);
    }
  }

  // Ensure output directory exists
  if (!fs.existsSync(CONFIG.outputDir)) {
    fs.mkdirSync(CONFIG.outputDir, { recursive: true });
  }

  // Load paints database
  console.log('Loading paints database...');
  const database = loadPaintsDatabase();
  console.log(`Loaded ${database.paints.length} paints\n`);

  // Filter paints by brand if specified
  let paintsToScrape = database.paints;
  if (brandFilter) {
    paintsToScrape = paintsToScrape.filter((p) => p.brand === brandFilter);
    console.log(`Filtered to ${paintsToScrape.length} ${brandFilter} paints`);
  }

  // Apply limit if specified
  if (limit && limit > 0) {
    paintsToScrape = paintsToScrape.slice(0, limit);
    console.log(`Limited to first ${limit} paints`);
  }

  // Group by brand for checkpoint management
  const paintsByBrand = new Map<string, Paint[]>();
  for (const paint of paintsToScrape) {
    const paints = paintsByBrand.get(paint.brand) || [];
    paints.push(paint);
    paintsByBrand.set(paint.brand, paints);
  }

  // Process each brand
  for (const [brand, paints] of paintsByBrand) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`Processing ${brand}: ${paints.length} paints`);
    console.log('='.repeat(60));

    // Load checkpoint to resume from
    const checkpoint = loadCheckpoint(brand);
    const completedIds = new Set(checkpoint?.completedPaintIds || []);

    // Load existing results
    const existingResults = loadExistingResults(brand);
    const results: ScrapedResult[] = [...existingResults];

    // Filter out already completed paints
    const remainingPaints = paints.filter((p) => !completedIds.has(p.id));
    console.log(`Remaining: ${remainingPaints.length} (${completedIds.size} already done)`);

    if (remainingPaints.length === 0) {
      console.log('All paints already scraped for this brand.');
      continue;
    }

    // Scrape each paint with rate limiting
    for (let i = 0; i < remainingPaints.length; i++) {
      const paint = remainingPaints[i];
      const progress = `[${i + 1}/${remainingPaints.length}]`;

      process.stdout.write(`${progress} Scraping: ${paint.name}... `);

      const result = await scrapePaint(paint);
      results.push(result);
      completedIds.add(paint.id);

      if (result.error) {
        console.log(`ERROR: ${result.error}`);
      } else if (result.results.length === 0) {
        console.log('no results');
      } else {
        const eans = result.results.map((r) => r.ean).join(', ');
        console.log(`found ${result.results.length} result(s): ${eans}`);
      }

      // Save checkpoint and results periodically
      if ((i + 1) % 10 === 0 || i === remainingPaints.length - 1) {
        saveCheckpoint(brand, Array.from(completedIds));
        saveResults(brand, results, paints.length);
      }

      // Rate limit delay (skip for last item)
      if (i < remainingPaints.length - 1) {
        await sleep(CONFIG.requestDelayMs);
      }
    }

    // Final save
    saveCheckpoint(brand, Array.from(completedIds));
    saveResults(brand, results, paints.length);

    console.log(`\nCompleted ${brand}: ${results.length} results saved`);
  }

  // Summary
  console.log(`\n${'='.repeat(60)}`);
  console.log('SCRAPING COMPLETE');
  console.log('='.repeat(60));
  console.log(`Results saved to: ${CONFIG.outputDir}`);
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
