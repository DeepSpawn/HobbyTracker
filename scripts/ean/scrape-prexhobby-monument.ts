/**
 * Prexhobby.com Monument Hobbies UPC Scraper
 *
 * Scrapes UPC barcode data from prexhobby.com Shopify store.
 * Uses Shopify's .json product endpoints to extract barcode data.
 *
 * Strategy:
 * 1. Fetch paginated search results for Monument Hobbies products
 * 2. For each product, fetch the .json endpoint
 * 3. Extract barcode from variant data
 * 4. Match to our paint database
 *
 * Rate limiting: 1 second delay between requests
 *
 * Usage:
 *   npx tsx scripts/ean/scrape-prexhobby-monument.ts
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import type { Paint, PaintDatabase } from '../../src/types/paint';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const CONFIG = {
  baseUrl: 'https://www.prexhobby.com',
  requestDelayMs: 1000, // 1 second delay between requests
  outputDir: path.join(__dirname, '../../data/ean-scrape'),
  paintsFile: path.join(__dirname, '../../src/data/paints.json'),
  userAgent:
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
};

// Types
interface ShopifyProduct {
  id: number;
  title: string;
  handle: string;
  vendor: string;
  product_type: string;
  variants: Array<{
    id: number;
    sku: string;
    barcode: string | null;
    price: string;
  }>;
}

interface ShopifySearchResult {
  products: ShopifyProduct[];
}

interface ScrapedResult {
  paintId: string | null;
  paintName: string;
  brand: string;
  shopifyTitle: string;
  shopifyHandle: string;
  shopifySku: string;
  barcode: string | null;
  matchConfidence: 'exact' | 'high' | 'low' | 'none';
  scrapedAt: string;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Load paints database
 */
function loadPaintsDatabase(): PaintDatabase {
  const content = fs.readFileSync(CONFIG.paintsFile, 'utf-8');
  return JSON.parse(content) as PaintDatabase;
}

/**
 * Normalize paint name for matching
 */
function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .replace(/monument\s*hobbies?\s*/gi, '')
    .replace(/pro\s*acryl(ic)?\s*/gi, '')
    .replace(/standard\s*/gi, '')
    .replace(/22ml/gi, '')
    .replace(/[^a-z0-9]/g, '')
    .trim();
}

/**
 * Match Shopify product to paint database
 */
function matchToPaint(
  shopifyTitle: string,
  paints: Paint[]
): { paint: Paint | null; confidence: 'exact' | 'high' | 'low' | 'none' } {
  const normalizedTitle = normalizeName(shopifyTitle);

  // Try exact match first
  for (const paint of paints) {
    if (normalizeName(paint.name) === normalizedTitle) {
      return { paint, confidence: 'exact' };
    }
  }

  // Try high confidence match (contains key words)
  for (const paint of paints) {
    const normalizedPaint = normalizeName(paint.name);
    if (
      normalizedTitle.includes(normalizedPaint) ||
      normalizedPaint.includes(normalizedTitle)
    ) {
      return { paint, confidence: 'high' };
    }
  }

  // Try partial word match
  const titleWords = normalizedTitle.split(/\s+/).filter((w) => w.length > 2);
  for (const paint of paints) {
    const paintWords = normalizeName(paint.name)
      .split(/\s+/)
      .filter((w) => w.length > 2);
    const matchCount = titleWords.filter((w) => paintWords.includes(w)).length;
    if (matchCount >= 2) {
      return { paint, confidence: 'low' };
    }
  }

  return { paint: null, confidence: 'none' };
}

/**
 * Fetch all Monument Hobbies products from search
 */
async function fetchSearchResults(): Promise<string[]> {
  const handles: string[] = [];
  const searchTerms = [
    'monument hobbies pro acryl',
    'monument hobbies primer',
    'monument hobbies wash',
    'monument hobbies signature',
  ];

  for (const term of searchTerms) {
    console.log(`Searching for: ${term}`);
    let page = 1;

    while (true) {
      const url = `${CONFIG.baseUrl}/search/suggest.json?q=${encodeURIComponent(term)}&resources[type]=product&resources[limit]=50&resources[options][unavailable_products]=last&page=${page}`;

      try {
        const response = await fetch(url, {
          headers: { 'User-Agent': CONFIG.userAgent },
        });

        if (!response.ok) {
          console.error(`Search failed: ${response.status}`);
          break;
        }

        const data = await response.json();
        const products = data.resources?.results?.products || [];

        if (products.length === 0) break;

        for (const product of products) {
          if (
            product.handle &&
            product.title?.toLowerCase().includes('monument')
          ) {
            if (!handles.includes(product.handle)) {
              handles.push(product.handle);
            }
          }
        }

        // If less than limit, we've reached the end
        if (products.length < 50) break;
        page++;
        await sleep(CONFIG.requestDelayMs);
      } catch (error) {
        console.error(`Search error: ${error}`);
        break;
      }
    }
    await sleep(CONFIG.requestDelayMs);
  }

  // Also try collection endpoint
  try {
    console.log('Trying collections endpoint...');
    const collectionsToTry = [
      'monument-hobbies',
      'pro-acryl',
      'monument',
      'paints',
    ];

    for (const collection of collectionsToTry) {
      const url = `${CONFIG.baseUrl}/collections/${collection}/products.json?limit=250`;
      const response = await fetch(url, {
        headers: { 'User-Agent': CONFIG.userAgent },
      });

      if (response.ok) {
        const data = (await response.json()) as ShopifySearchResult;
        for (const product of data.products || []) {
          if (
            product.handle &&
            product.vendor?.toLowerCase().includes('monument')
          ) {
            if (!handles.includes(product.handle)) {
              handles.push(product.handle);
            }
          }
        }
      }
      await sleep(CONFIG.requestDelayMs);
    }
  } catch (error) {
    console.error(`Collection fetch error: ${error}`);
  }

  return handles;
}

/**
 * Fetch product details and extract barcode
 */
async function fetchProductBarcode(
  handle: string
): Promise<{ title: string; sku: string; barcode: string | null } | null> {
  const url = `${CONFIG.baseUrl}/products/${handle}.json`;

  try {
    const response = await fetch(url, {
      headers: { 'User-Agent': CONFIG.userAgent },
    });

    if (!response.ok) {
      console.error(`  Failed to fetch ${handle}: ${response.status}`);
      return null;
    }

    const data = (await response.json()) as { product: ShopifyProduct };
    const product = data.product;

    if (!product || !product.variants || product.variants.length === 0) {
      return null;
    }

    const variant = product.variants[0];
    return {
      title: product.title,
      sku: variant.sku || '',
      barcode: variant.barcode || null,
    };
  } catch (error) {
    console.error(`  Error fetching ${handle}: ${error}`);
    return null;
  }
}

/**
 * Main function
 */
async function main(): Promise<void> {
  console.log('Loading paints database...');
  const database = loadPaintsDatabase();

  // Filter Monument Hobbies paints
  const monumentPaints = database.paints.filter(
    (p) => p.brand === 'monument_hobbies'
  );
  console.log(`Found ${monumentPaints.length} Monument Hobbies paints in DB\n`);

  // Fetch product handles from search
  console.log('Fetching Monument Hobbies products from prexhobby.com...');
  const handles = await fetchSearchResults();
  console.log(`Found ${handles.length} product handles\n`);

  if (handles.length === 0) {
    console.log('No products found. Exiting.');
    return;
  }

  // Fetch each product's barcode
  const results: ScrapedResult[] = [];
  const directMapping: Record<string, string> = {};
  let matched = 0;
  let withBarcode = 0;

  for (let i = 0; i < handles.length; i++) {
    const handle = handles[i];
    console.log(`[${i + 1}/${handles.length}] Fetching: ${handle}`);

    const productData = await fetchProductBarcode(handle);
    if (!productData) {
      await sleep(CONFIG.requestDelayMs);
      continue;
    }

    const { paint, confidence } = matchToPaint(
      productData.title,
      monumentPaints
    );

    const result: ScrapedResult = {
      paintId: paint?.id || null,
      paintName: paint?.name || productData.title,
      brand: 'monument_hobbies',
      shopifyTitle: productData.title,
      shopifyHandle: handle,
      shopifySku: productData.sku,
      barcode: productData.barcode,
      matchConfidence: confidence,
      scrapedAt: new Date().toISOString(),
    };

    results.push(result);

    if (productData.barcode) {
      withBarcode++;
      if (paint && confidence !== 'none') {
        directMapping[paint.id] = productData.barcode;
        matched++;
        console.log(
          `  ✓ ${productData.title} → ${productData.barcode} (${confidence})`
        );
      } else {
        console.log(
          `  ? ${productData.title} → ${productData.barcode} (no match)`
        );
      }
    } else {
      console.log(`  ✗ ${productData.title} (no barcode)`);
    }

    await sleep(CONFIG.requestDelayMs);
  }

  // Output stats
  console.log('\n--- Results ---');
  console.log(`Products scraped: ${results.length}`);
  console.log(`With barcode: ${withBarcode}`);
  console.log(`Matched to DB: ${matched}`);
  console.log(`Unmatched: ${withBarcode - matched}`);

  // Ensure output directory exists
  if (!fs.existsSync(CONFIG.outputDir)) {
    fs.mkdirSync(CONFIG.outputDir, { recursive: true });
  }

  // Save direct mapping
  const today = new Date().toISOString().split('T')[0];
  const mappingPath = path.join(
    CONFIG.outputDir,
    `monument_hobbies-prexhobby-ean-mapping-${today}.json`
  );
  fs.writeFileSync(mappingPath, JSON.stringify(directMapping, null, 2));
  console.log(`\nDirect mapping saved to: ${mappingPath}`);

  // Save full results
  const session = {
    brand: 'monument_hobbies',
    source: 'prexhobby.com',
    startedAt: new Date().toISOString(),
    lastUpdatedAt: new Date().toISOString(),
    completedCount: withBarcode,
    matchedCount: matched,
    totalCount: results.length,
    results,
  };

  const outputPath = path.join(
    CONFIG.outputDir,
    `monument_hobbies-prexhobby-${today}.json`
  );
  fs.writeFileSync(outputPath, JSON.stringify(session, null, 2));
  console.log(`Full results saved to: ${outputPath}`);

  // Show unmatched products for manual review
  const unmatched = results.filter(
    (r) => r.barcode && r.matchConfidence === 'none'
  );
  if (unmatched.length > 0) {
    console.log('\n--- Unmatched Products (need manual review) ---');
    for (const r of unmatched.slice(0, 10)) {
      console.log(`  ${r.shopifyTitle} → ${r.barcode}`);
    }
    if (unmatched.length > 10) {
      console.log(`  ... and ${unmatched.length - 10} more`);
    }
  }

  console.log('\nRun npm run ean:merge to apply scraped UPCs to paints.json');
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
