/**
 * EAN Enrichment Script
 *
 * Takes bulk-scraped EANs and fetches product names from UPCitemdb product pages.
 * Then matches enriched data against our paint database.
 *
 * Usage:
 *   npm run ean:enrich
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
  requestDelayMs: 1500,
  outputDir: path.join(__dirname, '../../data/ean-scrape'),
  paintsFile: path.join(__dirname, '../../src/data/paints.json'),
  userAgent:
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
};

// Types
interface BulkProduct {
  ean: string;
  title: string;
  brand: string;
  url: string;
}

interface EnrichedProduct {
  ean: string;
  title: string;
  brand: string;
  model?: string;
  category?: string;
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
 * Extract product details from UPCitemdb product page
 */
function extractProductDetails(html: string, ean: string): EnrichedProduct {
  const result: EnrichedProduct = {
    ean,
    title: '',
    brand: '',
  };

  // Extract title - look for various patterns
  const titlePatterns = [
    /<h1[^>]*class="[^"]*product-title[^"]*"[^>]*>([^<]+)<\/h1>/i,
    /<title>([^<|]+)/i,
    /<h1[^>]*>([^<]+)<\/h1>/i,
  ];

  for (const pattern of titlePatterns) {
    const match = html.match(pattern);
    if (match && match[1]) {
      result.title = match[1].trim().replace(/\s*\|.*$/, '').replace(/\s*-\s*UPC.*$/i, '');
      break;
    }
  }

  // Extract brand
  const brandPatterns = [
    /Brand[:\s]*<[^>]*>([^<]+)</i,
    /"brand"\s*:\s*"([^"]+)"/i,
    /Manufacturer[:\s]*<[^>]*>([^<]+)</i,
  ];

  for (const pattern of brandPatterns) {
    const match = html.match(pattern);
    if (match && match[1]) {
      result.brand = match[1].trim();
      break;
    }
  }

  // Extract model number
  const modelPatterns = [
    /Model[:\s#]*<[^>]*>([^<]+)</i,
    /"model"\s*:\s*"([^"]+)"/i,
    /Part[:\s#]*<[^>]*>([^<]+)</i,
  ];

  for (const pattern of modelPatterns) {
    const match = html.match(pattern);
    if (match && match[1]) {
      result.model = match[1].trim();
      break;
    }
  }

  return result;
}

/**
 * Load bulk scrape results
 */
function loadBulkResults(): Map<string, BulkProduct[]> {
  const results = new Map<string, BulkProduct[]>();
  const files = fs.readdirSync(CONFIG.outputDir).filter((f) => f.startsWith('bulk-') && f.endsWith('.json'));

  for (const file of files) {
    const content = fs.readFileSync(path.join(CONFIG.outputDir, file), 'utf-8');
    const data = JSON.parse(content);
    const brand = data.brand;
    results.set(brand, data.products);
  }

  return results;
}

/**
 * Match enriched products to paints
 */
function matchToPaints(
  enrichedProducts: EnrichedProduct[],
  paints: Paint[],
  dbBrand: string
): Array<{
  paintId: string;
  paintName: string;
  brand: string;
  productLine: string;
  ean: string | null;
  matchedTitle: string | null;
  confidence: 'exact' | 'high' | 'low' | 'none';
}> {
  const results: Array<{
    paintId: string;
    paintName: string;
    brand: string;
    productLine: string;
    ean: string | null;
    matchedTitle: string | null;
    confidence: 'exact' | 'high' | 'low' | 'none';
  }> = [];

  // Create lookup for enriched products by normalized title words
  const productsByWord = new Map<string, EnrichedProduct[]>();
  for (const product of enrichedProducts) {
    const words = product.title.toLowerCase().split(/\s+/);
    for (const word of words) {
      if (word.length > 3) {
        const existing = productsByWord.get(word) || [];
        existing.push(product);
        productsByWord.set(word, existing);
      }
    }
  }

  // Match each paint
  for (const paint of paints.filter((p) => p.brand === dbBrand)) {
    const paintWords = paint.name.toLowerCase().split(/\s+/);
    const candidates: Array<{ product: EnrichedProduct; score: number }> = [];

    // Find products that share words with paint name
    for (const word of paintWords) {
      if (word.length > 3) {
        const matchingProducts = productsByWord.get(word) || [];
        for (const product of matchingProducts) {
          const existingIdx = candidates.findIndex((c) => c.product.ean === product.ean);
          if (existingIdx >= 0) {
            candidates[existingIdx].score++;
          } else {
            candidates.push({ product, score: 1 });
          }
        }
      }
    }

    // Also check for exact substring match
    for (const product of enrichedProducts) {
      const titleLower = product.title.toLowerCase();
      const nameLower = paint.name.toLowerCase();

      if (titleLower.includes(nameLower)) {
        const existingIdx = candidates.findIndex((c) => c.product.ean === product.ean);
        if (existingIdx >= 0) {
          candidates[existingIdx].score += 5; // Boost for substring match
        } else {
          candidates.push({ product, score: 5 });
        }
      }
    }

    // Sort by score
    candidates.sort((a, b) => b.score - a.score);

    if (candidates.length > 0 && candidates[0].score >= 2) {
      const best = candidates[0];
      const confidence = best.score >= 5 ? 'exact' : best.score >= 3 ? 'high' : 'low';

      results.push({
        paintId: paint.id,
        paintName: paint.name,
        brand: paint.brand,
        productLine: paint.productLine,
        ean: best.product.ean,
        matchedTitle: best.product.title,
        confidence,
      });
    } else {
      results.push({
        paintId: paint.id,
        paintName: paint.name,
        brand: paint.brand,
        productLine: paint.productLine,
        ean: null,
        matchedTitle: null,
        confidence: 'none',
      });
    }
  }

  return results;
}

/**
 * Main function
 */
async function main(): Promise<void> {
  console.log('Loading bulk scrape results...');
  const bulkResults = loadBulkResults();

  if (bulkResults.size === 0) {
    console.log('No bulk results found. Run ean:scrape:bulk first.');
    return;
  }

  console.log(`Found results for ${bulkResults.size} brands\n`);

  console.log('Loading paints database...');
  const database = loadPaintsDatabase();
  console.log(`Loaded ${database.paints.length} paints\n`);

  // Process each brand
  for (const [brand, products] of bulkResults) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`Enriching ${brand}: ${products.length} EANs`);
    console.log('='.repeat(60));

    const enrichedProducts: EnrichedProduct[] = [];

    for (let i = 0; i < products.length; i++) {
      const product = products[i];
      process.stdout.write(`[${i + 1}/${products.length}] Fetching ${product.ean}... `);

      try {
        const response = await fetchWithHeaders(product.url);

        if (!response.ok) {
          console.log(`HTTP ${response.status}`);
          continue;
        }

        const html = await response.text();
        const enriched = extractProductDetails(html, product.ean);
        enrichedProducts.push(enriched);

        if (enriched.title) {
          console.log(`"${enriched.title.substring(0, 50)}..."`);
        } else {
          console.log('no title found');
        }

        // Rate limit
        if (i < products.length - 1) {
          await sleep(CONFIG.requestDelayMs);
        }
      } catch (error) {
        console.log(`ERROR: ${error}`);
      }
    }

    // Save enriched products
    const enrichedPath = path.join(CONFIG.outputDir, `enriched-${brand}-${new Date().toISOString().split('T')[0]}.json`);
    fs.writeFileSync(enrichedPath, JSON.stringify(enrichedProducts, null, 2));
    console.log(`\nEnriched data saved to: ${enrichedPath}`);

    // Match to paints
    console.log('\nMatching to paints...');
    const matches = matchToPaints(enrichedProducts, database.paints, brand);

    // Save in matcher-compatible format
    const matcherResults = matches.map((m) => ({
      paintId: m.paintId,
      paintName: m.paintName,
      brand: m.brand,
      productLine: m.productLine,
      searchQuery: `${m.brand} ${m.paintName}`,
      results: m.ean
        ? [{ ean: m.ean, title: m.matchedTitle || '', brand: m.brand }]
        : [],
      scrapedAt: new Date().toISOString(),
    }));

    const session = {
      brand,
      source: 'upcitemdb-enriched',
      startedAt: new Date().toISOString(),
      lastUpdatedAt: new Date().toISOString(),
      completedCount: matcherResults.length,
      totalCount: database.paints.filter((p) => p.brand === brand).length,
      results: matcherResults,
    };

    const outputPath = path.join(CONFIG.outputDir, `${brand}-${new Date().toISOString().split('T')[0]}.json`);
    fs.writeFileSync(outputPath, JSON.stringify(session, null, 2));

    // Stats
    const withEan = matches.filter((m) => m.ean).length;
    const exact = matches.filter((m) => m.confidence === 'exact').length;
    const high = matches.filter((m) => m.confidence === 'high').length;

    console.log(`\nResults for ${brand}:`);
    console.log(`  Matched: ${withEan}/${matches.length}`);
    console.log(`  Exact: ${exact}, High: ${high}`);
  }

  console.log(`\n${'='.repeat(60)}`);
  console.log('ENRICHMENT COMPLETE');
  console.log('='.repeat(60));
  console.log('\nRun npm run ean:match to finalize matches');
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
