/**
 * UPCitemdb Bulk Page Scraper for Paint Database
 *
 * Scrapes EAN data from UPCitemdb brand listing pages.
 * These pages list multiple products at once, making it faster than individual searches.
 *
 * Pages:
 * - https://www.upcitemdb.com/info-games-workshop (Citadel)
 * - https://www.upcitemdb.com/info-vallejo-paint (Vallejo)
 * - https://www.upcitemdb.com/info-army-painter (Army Painter)
 *
 * Usage:
 *   npm run ean:scrape:bulk
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
  requestDelayMs: 2000,
  outputDir: path.join(__dirname, '../../data/ean-scrape'),
  paintsFile: path.join(__dirname, '../../src/data/paints.json'),
  userAgent:
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
};

// Brand info pages on UPCitemdb
const BRAND_PAGES: Record<string, string> = {
  citadel: '/info-games-workshop',
  vallejo: '/info-vallejo-paint',
  army_painter: '/info-army-painter',
};

// Types
interface ScrapedProduct {
  ean: string;
  title: string;
  brand: string;
  url: string;
}

interface BulkScrapeResult {
  brand: string;
  source: 'upcitemdb-bulk';
  scrapedAt: string;
  totalPages: number;
  products: ScrapedProduct[];
}

// Utility functions
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function loadPaintsDatabase(): PaintDatabase {
  const content = fs.readFileSync(CONFIG.paintsFile, 'utf-8');
  return JSON.parse(content) as PaintDatabase;
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
    },
  });
}

/**
 * Extract products from a UPCitemdb info page
 */
function extractProductsFromPage(html: string, brand: string): ScrapedProduct[] {
  const products: ScrapedProduct[] = [];

  // Pattern: <a href="/upc/5011921026524">Product Title</a>
  const pattern = /<a[^>]*href="\/upc\/(\d{12,13})"[^>]*>([^<]+)<\/a>/gi;

  let match;
  while ((match = pattern.exec(html)) !== null) {
    const ean = match[1];
    const title = match[2].trim();

    // Skip if EAN is too short or title is empty
    if (ean.length >= 12 && title.length > 0) {
      products.push({
        ean,
        title,
        brand,
        url: `${CONFIG.baseUrl}/upc/${ean}`,
      });
    }
  }

  return products;
}

/**
 * Get pagination links from page
 */
function getPaginationLinks(html: string, basePath: string): string[] {
  const links: string[] = [];

  // Pattern for pagination: [1-15] | [16-30] | etc.
  // These are usually links like /info-games-workshop?p=2
  const paginationPattern = /href="([^"]*\?p=\d+)"/gi;

  let match;
  while ((match = paginationPattern.exec(html)) !== null) {
    const link = match[1];
    if (!links.includes(link)) {
      links.push(link);
    }
  }

  // Also check for numbered links
  const numberedPattern = /href="(\/info-[^"]*\/\d+)"/gi;
  while ((match = numberedPattern.exec(html)) !== null) {
    const link = match[1];
    if (!links.includes(link)) {
      links.push(link);
    }
  }

  return links;
}

/**
 * Scrape all products for a brand from UPCitemdb
 */
async function scrapeBrand(brand: string): Promise<BulkScrapeResult> {
  const basePath = BRAND_PAGES[brand];
  if (!basePath) {
    throw new Error(`Unknown brand: ${brand}`);
  }

  const result: BulkScrapeResult = {
    brand,
    source: 'upcitemdb-bulk',
    scrapedAt: new Date().toISOString(),
    totalPages: 0,
    products: [],
  };

  const visitedUrls = new Set<string>();
  const urlsToVisit = [basePath];

  console.log(`Scraping ${brand} from ${CONFIG.baseUrl}${basePath}...`);

  while (urlsToVisit.length > 0) {
    const currentPath = urlsToVisit.shift()!;
    const url = `${CONFIG.baseUrl}${currentPath}`;

    if (visitedUrls.has(url)) {
      continue;
    }
    visitedUrls.add(url);
    result.totalPages++;

    process.stdout.write(`  Page ${result.totalPages}: ${currentPath}... `);

    try {
      const response = await fetchWithHeaders(url);

      if (!response.ok) {
        console.log(`HTTP ${response.status}`);
        continue;
      }

      const html = await response.text();

      // Extract products
      const products = extractProductsFromPage(html, brand);
      const newProducts = products.filter(
        (p) => !result.products.some((existing) => existing.ean === p.ean)
      );
      result.products.push(...newProducts);

      console.log(`found ${newProducts.length} new products (total: ${result.products.length})`);

      // Get pagination links
      const pageLinks = getPaginationLinks(html, basePath);
      for (const link of pageLinks) {
        const fullLink = link.startsWith('/') ? link : `${basePath}${link}`;
        if (!visitedUrls.has(`${CONFIG.baseUrl}${fullLink}`)) {
          urlsToVisit.push(fullLink);
        }
      }

      // Rate limit
      if (urlsToVisit.length > 0) {
        await sleep(CONFIG.requestDelayMs);
      }
    } catch (error) {
      console.log(`ERROR: ${error}`);
    }
  }

  return result;
}

/**
 * Convert bulk scrape results to the format expected by the matcher
 */
function convertToMatcherFormat(
  bulkResult: BulkScrapeResult,
  paints: Paint[]
): Array<{
  paintId: string;
  paintName: string;
  brand: string;
  productLine: string;
  searchQuery: string;
  results: Array<{ ean: string; title: string; brand: string }>;
  scrapedAt: string;
}> {
  // Create a map of product titles to EANs for quick lookup
  const eanByTitle = new Map<string, ScrapedProduct[]>();
  for (const product of bulkResult.products) {
    const titleLower = product.title.toLowerCase();
    const existing = eanByTitle.get(titleLower) || [];
    existing.push(product);
    eanByTitle.set(titleLower, existing);
  }

  // For each paint, try to find matching products
  const results = paints
    .filter((p) => p.brand === bulkResult.brand)
    .map((paint) => {
      const paintNameLower = paint.name.toLowerCase();

      // Find products that contain the paint name
      const matchingProducts: ScrapedProduct[] = [];
      for (const [title, products] of eanByTitle) {
        if (title.includes(paintNameLower) || paintNameLower.includes(title.split(' ').slice(-2).join(' '))) {
          matchingProducts.push(...products);
        }
      }

      return {
        paintId: paint.id,
        paintName: paint.name,
        brand: paint.brand,
        productLine: paint.productLine,
        searchQuery: `${paint.brand} ${paint.name}`,
        results: matchingProducts.map((p) => ({
          ean: p.ean,
          title: p.title,
          brand: p.brand,
        })),
        scrapedAt: bulkResult.scrapedAt,
      };
    });

  return results;
}

/**
 * Main function
 */
async function main(): Promise<void> {
  // Ensure output directory exists
  if (!fs.existsSync(CONFIG.outputDir)) {
    fs.mkdirSync(CONFIG.outputDir, { recursive: true });
  }

  // Load paints database
  console.log('Loading paints database...');
  const database = loadPaintsDatabase();
  console.log(`Loaded ${database.paints.length} paints\n`);

  // Scrape each brand
  for (const brand of Object.keys(BRAND_PAGES)) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`Scraping ${brand}`);
    console.log('='.repeat(60));

    const bulkResult = await scrapeBrand(brand);

    // Save raw bulk results
    const bulkOutputPath = path.join(CONFIG.outputDir, `bulk-${brand}-${new Date().toISOString().split('T')[0]}.json`);
    fs.writeFileSync(bulkOutputPath, JSON.stringify(bulkResult, null, 2));
    console.log(`\nRaw results saved to: ${bulkOutputPath}`);

    // Convert to matcher format and save
    const matcherResults = convertToMatcherFormat(bulkResult, database.paints);
    const matcherOutputPath = path.join(CONFIG.outputDir, `${brand}-${new Date().toISOString().split('T')[0]}.json`);

    const session = {
      brand,
      source: 'upcitemdb-bulk',
      startedAt: bulkResult.scrapedAt,
      lastUpdatedAt: new Date().toISOString(),
      completedCount: matcherResults.length,
      totalCount: database.paints.filter((p) => p.brand === brand).length,
      results: matcherResults,
    };

    fs.writeFileSync(matcherOutputPath, JSON.stringify(session, null, 2));
    console.log(`Matcher-format results saved to: ${matcherOutputPath}`);

    // Stats
    const withMatches = matcherResults.filter((r) => r.results.length > 0).length;
    console.log(`\nMatched ${withMatches}/${matcherResults.length} paints to EAN data`);

    // Delay between brands
    await sleep(CONFIG.requestDelayMs);
  }

  console.log(`\n${'='.repeat(60)}`);
  console.log('BULK SCRAPING COMPLETE');
  console.log('='.repeat(60));
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
