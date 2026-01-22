/**
 * Amazon EAN/UPC Scraper for Paint Database
 *
 * Scrapes EAN/UPC barcode data from Amazon product pages.
 * Amazon exposes UPC/EAN in the "Technical Details" or "Product Information" section.
 *
 * Strategy:
 * 1. Search Amazon for each paint by brand + name
 * 2. Extract ASIN from search results
 * 3. Fetch product page and parse UPC/EAN from Technical Details
 *
 * Rate limiting: 2-3 second delay between requests (Amazon is strict)
 * Checkpoint support: Saves progress and can resume from where it left off.
 *
 * Usage:
 *   npm run ean:scrape:amazon                    # Scrape all brands
 *   npm run ean:scrape:amazon -- --brand=citadel # Scrape specific brand
 *   npm run ean:scrape:amazon -- --limit=10      # Limit number of paints
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import type { Paint, PaintDatabase } from '../../src/types/paint';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const CONFIG = {
  // Use .com.au as user suggested it has good paint data
  baseUrl: 'https://www.amazon.com.au',
  searchPath: '/s',
  requestDelayMs: 3000, // 3 second delay - Amazon is strict
  outputDir: path.join(__dirname, '../../data/ean-scrape'),
  paintsFile: path.join(__dirname, '../../src/data/paints.json'),
  userAgent:
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
};

// Types - same as UPCitemdb scraper for compatibility
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
    asin?: string;
  }>;
  scrapedAt: string;
  error?: string;
}

interface ScrapeSession {
  brand: string;
  source: 'amazon';
  startedAt: string;
  lastUpdatedAt: string;
  completedCount: number;
  totalCount: number;
  results: ScrapedResult[];
}

interface CheckpointData {
  brand: string;
  source: 'amazon';
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
  return path.join(CONFIG.outputDir, `checkpoint-amazon-${brand}.json`);
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
    source: 'amazon',
    completedPaintIds,
    lastUpdatedAt: new Date().toISOString(),
  };
  const checkpointPath = getCheckpointPath(brand);
  fs.writeFileSync(checkpointPath, JSON.stringify(checkpoint, null, 2));
}

function getOutputPath(brand: string): string {
  const date = new Date().toISOString().split('T')[0];
  return path.join(CONFIG.outputDir, `amazon-${brand}-${date}.json`);
}

function loadExistingResults(brand: string): ScrapedResult[] {
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
    source: 'amazon',
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
 * Build search query for Amazon
 */
function buildSearchQuery(paint: Paint): string {
  const brandNames: Record<string, string> = {
    citadel: 'Citadel',
    vallejo: 'Vallejo',
    army_painter: 'Army Painter',
  };

  const brandName = brandNames[paint.brand] || paint.brand;

  // For Vallejo, include SKU if available
  if (paint.brand === 'vallejo' && paint.sku) {
    return `${brandName} ${paint.sku} paint`;
  }

  // Include product line for better matching
  return `${brandName} ${paint.name} ${paint.productLine} paint`;
}

/**
 * Fetch a URL with proper headers
 */
async function fetchWithHeaders(url: string): Promise<Response> {
  return fetch(url, {
    headers: {
      'User-Agent': CONFIG.userAgent,
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.5',
      'Accept-Encoding': 'gzip, deflate, br',
      Connection: 'keep-alive',
      'Upgrade-Insecure-Requests': '1',
    },
  });
}

/**
 * Extract ASIN from Amazon search results HTML
 */
function extractAsinFromSearch(html: string, paintName: string): string | null {
  // Amazon search results have data-asin attributes
  const asinPattern = /data-asin="([A-Z0-9]{10})"/g;
  const asins: string[] = [];

  let match;
  while ((match = asinPattern.exec(html)) !== null) {
    if (match[1] && match[1].length === 10) {
      asins.push(match[1]);
    }
  }

  // Return first valid ASIN (skip empty ones)
  for (const asin of asins) {
    if (asin && asin !== '') {
      return asin;
    }
  }

  return null;
}

/**
 * Extract UPC/EAN from Amazon product page HTML
 */
function extractUpcFromProductPage(html: string): { upc: string | null; title: string } {
  let upc: string | null = null;
  let title = '';

  // Extract title
  const titleMatch = html.match(/<span[^>]*id="productTitle"[^>]*>([^<]+)</i);
  if (titleMatch) {
    title = titleMatch[1].trim();
  }

  // Look for UPC/EAN in various formats
  // Pattern 1: "UPC" or "EAN" label followed by number
  const upcPatterns = [
    /(?:UPC|EAN|GTIN)[:\s]*(?:<[^>]*>)*\s*(\d{12,13})/gi,
    /(?:UPC|EAN|GTIN)(?:<\/th>|<\/td>)[^<]*<td[^>]*>(?:<[^>]*>)*\s*(\d{12,13})/gi,
    /"upc"\s*:\s*"(\d{12,13})"/gi,
    /"ean"\s*:\s*"(\d{12,13})"/gi,
    /"gtin13"\s*:\s*"(\d{13})"/gi,
  ];

  for (const pattern of upcPatterns) {
    const match = pattern.exec(html);
    if (match && match[1]) {
      upc = match[1];
      break;
    }
  }

  // Also look for 13-digit numbers that match known brand prefixes
  if (!upc) {
    const brandPrefixes = ['501192', '842955', '571379']; // GW, Vallejo, Army Painter
    const eanPattern = /\b(\d{13})\b/g;
    let eanMatch;
    while ((eanMatch = eanPattern.exec(html)) !== null) {
      const candidate = eanMatch[1];
      if (brandPrefixes.some((prefix) => candidate.startsWith(prefix))) {
        upc = candidate;
        break;
      }
    }
  }

  return { upc, title };
}

/**
 * Scrape Amazon for a single paint
 */
async function scrapePaint(paint: Paint): Promise<ScrapedResult> {
  const searchQuery = buildSearchQuery(paint);
  const encodedQuery = encodeURIComponent(searchQuery);
  const searchUrl = `${CONFIG.baseUrl}${CONFIG.searchPath}?k=${encodedQuery}`;

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
    // Step 1: Search for the paint
    const searchResponse = await fetchWithHeaders(searchUrl);

    if (!searchResponse.ok) {
      result.error = `Search HTTP ${searchResponse.status}: ${searchResponse.statusText}`;
      return result;
    }

    const searchHtml = await searchResponse.text();

    // Check for CAPTCHA
    if (searchHtml.includes('captcha') || searchHtml.includes('robot')) {
      result.error = 'CAPTCHA detected - need to slow down or use different approach';
      return result;
    }

    // Step 2: Extract ASIN from search results
    const asin = extractAsinFromSearch(searchHtml, paint.name);

    if (!asin) {
      result.error = 'No ASIN found in search results';
      return result;
    }

    // Rate limit before product page fetch
    await sleep(1000);

    // Step 3: Fetch product page
    const productUrl = `${CONFIG.baseUrl}/dp/${asin}`;
    const productResponse = await fetchWithHeaders(productUrl);

    if (!productResponse.ok) {
      result.error = `Product page HTTP ${productResponse.status}: ${productResponse.statusText}`;
      return result;
    }

    const productHtml = await productResponse.text();

    // Check for CAPTCHA on product page
    if (productHtml.includes('captcha') || productHtml.includes('robot')) {
      result.error = 'CAPTCHA detected on product page';
      return result;
    }

    // Step 4: Extract UPC/EAN
    const { upc, title } = extractUpcFromProductPage(productHtml);

    if (upc) {
      result.results.push({
        ean: upc,
        title: title || searchQuery,
        brand: paint.brand,
        asin,
      });
    } else {
      // Still record the ASIN even if no UPC found - useful for manual lookup
      result.results.push({
        ean: '',
        title: title || searchQuery,
        brand: paint.brand,
        asin,
      });
      result.error = 'No UPC/EAN found on product page (ASIN recorded)';
    }
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

  console.log(`\nUsing Amazon Australia (${CONFIG.baseUrl})`);
  console.log(`Rate limit: ${CONFIG.requestDelayMs}ms between requests\n`);

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
    let captchaCount = 0;
    const maxCaptchas = 3; // Stop if we hit too many CAPTCHAs

    for (let i = 0; i < remainingPaints.length; i++) {
      const paint = remainingPaints[i];
      const progress = `[${i + 1}/${remainingPaints.length}]`;

      process.stdout.write(`${progress} Scraping: ${paint.name}... `);

      const result = await scrapePaint(paint);
      results.push(result);
      completedIds.add(paint.id);

      if (result.error?.includes('CAPTCHA')) {
        console.log(`CAPTCHA!`);
        captchaCount++;
        if (captchaCount >= maxCaptchas) {
          console.log(`\nToo many CAPTCHAs (${captchaCount}). Stopping to avoid ban.`);
          console.log('Try again later or increase delay.');
          break;
        }
        // Extra delay after CAPTCHA
        await sleep(10000);
      } else if (result.error) {
        console.log(`ERROR: ${result.error}`);
      } else if (result.results.length === 0 || !result.results[0].ean) {
        console.log(`no UPC found (ASIN: ${result.results[0]?.asin || 'none'})`);
      } else {
        const eans = result.results.map((r) => r.ean).join(', ');
        console.log(`found: ${eans}`);
      }

      // Save checkpoint and results periodically
      if ((i + 1) % 5 === 0 || i === remainingPaints.length - 1) {
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

    // Stats
    const withEan = results.filter((r) => r.results.length > 0 && r.results[0].ean).length;
    console.log(`\nCompleted ${brand}: ${withEan}/${results.length} found with EAN`);
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
