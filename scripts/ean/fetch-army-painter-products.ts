/**
 * Fetch Army Painter products from Shopify JSON API
 *
 * This script fetches all products with their SKUs and names from Army Painter's
 * Shopify store, which is much more reliable than HTML scraping.
 *
 * Usage:
 *   npm run ean:fetch:army-painter
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import type { Paint, PaintDatabase } from '../../src/types/paint';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const CONFIG = {
  paintsFile: path.join(__dirname, '../../src/data/paints.json'),
  outputDir: path.join(__dirname, '../../data/ean-scrape'),
  collections: [
    {
      name: 'Warpaints Fanatic',
      url: 'https://thearmypainter.com/collections/warpaints-fanatic/products.json',
      skuPrefixes: ['WP3'],
    },
    {
      name: 'Speedpaint 2.0',
      url: 'https://thearmypainter.com/collections/speedpaint/products.json',
      skuPrefixes: ['WP2'],
    },
    {
      name: 'Warpaints Air',
      url: 'https://thearmypainter.com/collections/warpaints-air/products.json',
      skuPrefixes: ['AW'],
    },
  ],
  requestDelay: 1000,
  userAgent:
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
};

interface ShopifyProduct {
  id: number;
  title: string;
  handle: string;
  variants: Array<{
    id: number;
    sku: string;
    title: string;
    price: string;
  }>;
}

interface ShopifyResponse {
  products: ShopifyProduct[];
}

interface FetchedProduct {
  name: string;
  sku: string;
  collection: string;
  shopifyId: number;
}

/**
 * Delay helper
 */
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Clean up product name
 */
function cleanProductName(title: string): string {
  return title
    .replace(/^Warpaints Fanatic:\s*/i, '')
    .replace(/^Warpaints Fanatic Effects:\s*/i, '')
    .replace(/^Warpaints Fanatic Wash:\s*/i, '')
    .replace(/^Warpaints Fanatic Metallic:\s*/i, '')
    .replace(/^Speedpaint:\s*/i, '')
    .replace(/^Speedpaint 2\.0:\s*/i, '')
    .replace(/^Speedpaint Metallic:\s*/i, '')
    .replace(/^Warpaints Air:\s*/i, '')
    .replace(/^Warpaints Air Metallic:\s*/i, '')
    .replace(/^Warpaints Air Fluo:\s*/i, '')
    .trim();
}

/**
 * Normalize SKU (remove trailing P)
 */
function normalizeSku(sku: string): string {
  return sku.replace(/P$/, '');
}

/**
 * Fetch all products from a collection
 */
async function fetchCollection(
  collectionUrl: string,
  collectionName: string
): Promise<FetchedProduct[]> {
  const products: FetchedProduct[] = [];
  let page = 1;
  let hasMore = true;

  while (hasMore) {
    const url = `${collectionUrl}?limit=250&page=${page}`;
    console.log(`  Fetching page ${page}...`);

    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': CONFIG.userAgent,
          Accept: 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = (await response.json()) as ShopifyResponse;

      if (data.products.length === 0) {
        hasMore = false;
      } else {
        for (const product of data.products) {
          // Get SKU from first variant
          const sku = product.variants[0]?.sku;
          if (sku) {
            products.push({
              name: cleanProductName(product.title),
              sku: normalizeSku(sku),
              collection: collectionName,
              shopifyId: product.id,
            });
          }
        }
        console.log(`    Found ${data.products.length} products (${products.length} total)`);
        page++;
        await delay(CONFIG.requestDelay);
      }
    } catch (error) {
      console.error(`  Error fetching page ${page}:`, error);
      hasMore = false;
    }
  }

  return products;
}

/**
 * Normalize a paint name for matching
 */
function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .replace(/['']/g, "'")
    .replace(/[–—]/g, '-')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Load paints database
 */
function loadPaintsDatabase(): PaintDatabase {
  const content = fs.readFileSync(CONFIG.paintsFile, 'utf-8');
  return JSON.parse(content) as PaintDatabase;
}

/**
 * Match products to existing paints
 */
function matchProductsToPaints(
  products: FetchedProduct[],
  paints: Paint[]
): Map<string, string> {
  const matches = new Map<string, string>(); // paintId -> sku

  // Create lookup by normalized name
  const paintsByName = new Map<string, Paint>();
  for (const paint of paints) {
    paintsByName.set(normalizeName(paint.name), paint);
  }

  // Try exact name match
  for (const product of products) {
    const normalizedProductName = normalizeName(product.name);
    const paint = paintsByName.get(normalizedProductName);
    if (paint && !paint.sku) {
      matches.set(paint.id, product.sku);
    }
  }

  return matches;
}

/**
 * Main function
 */
async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const skipFetch = args.includes('--skip-fetch');

  console.log('Army Painter Product Fetcher');
  console.log('============================');
  if (dryRun) {
    console.log('DRY RUN MODE - no changes will be made\n');
  }

  // Ensure output directory exists
  if (!fs.existsSync(CONFIG.outputDir)) {
    fs.mkdirSync(CONFIG.outputDir, { recursive: true });
  }

  // Fetch products from all collections
  let allProducts: FetchedProduct[] = [];
  const cacheFile = path.join(CONFIG.outputDir, 'army-painter-products-cache.json');

  if (skipFetch && fs.existsSync(cacheFile)) {
    console.log('Using cached product data...\n');
    allProducts = JSON.parse(fs.readFileSync(cacheFile, 'utf-8'));
  } else {
    for (const collection of CONFIG.collections) {
      console.log(`\nFetching ${collection.name}...`);
      const products = await fetchCollection(collection.url, collection.name);
      allProducts.push(...products);
      await delay(CONFIG.requestDelay * 2);
    }

    // Save cache
    fs.writeFileSync(cacheFile, JSON.stringify(allProducts, null, 2));
    console.log(`\nCached ${allProducts.length} products to ${cacheFile}`);
  }

  // Summary by collection
  console.log('\n=== Products Fetched ===');
  const byCollection: Record<string, number> = {};
  for (const p of allProducts) {
    byCollection[p.collection] = (byCollection[p.collection] || 0) + 1;
  }
  for (const [col, count] of Object.entries(byCollection)) {
    console.log(`  ${col}: ${count}`);
  }
  console.log(`  Total: ${allProducts.length}`);

  // Load paints database
  console.log('\nLoading paints database...');
  const database = loadPaintsDatabase();

  // Filter Army Painter paints without SKUs
  const armyPainterNoSku = database.paints.filter(
    (p) => p.brand === 'army_painter' && !p.sku
  );
  console.log(`Found ${armyPainterNoSku.length} Army Painter paints without SKUs`);

  // Match products to paints
  console.log('\nMatching products to paints...');
  const matches = matchProductsToPaints(allProducts, armyPainterNoSku);
  console.log(`Found ${matches.size} exact name matches`);

  // Show matches by collection
  const matchesByCollection: Record<string, number> = {};
  for (const [paintId, sku] of matches) {
    const collection = allProducts.find((p) => p.sku === sku)?.collection || 'unknown';
    matchesByCollection[collection] = (matchesByCollection[collection] || 0) + 1;
  }
  console.log('\n=== Matches by Collection ===');
  for (const [col, count] of Object.entries(matchesByCollection)) {
    console.log(`  ${col}: ${count}`);
  }

  // Show some example matches
  console.log('\n=== Sample Matches ===');
  let shown = 0;
  for (const [paintId, sku] of matches) {
    if (shown >= 10) break;
    const paint = database.paints.find((p) => p.id === paintId);
    console.log(`  "${paint?.name}" → ${sku}`);
    shown++;
  }

  // Show unmatched paints
  const unmatchedPaints = armyPainterNoSku.filter((p) => !matches.has(p.id));
  console.log(`\n${unmatchedPaints.length} paints could not be matched`);

  // Group unmatched by product line
  const unmatchedByLine: Record<string, string[]> = {};
  for (const paint of unmatchedPaints) {
    if (!unmatchedByLine[paint.productLine]) {
      unmatchedByLine[paint.productLine] = [];
    }
    unmatchedByLine[paint.productLine].push(paint.name);
  }
  console.log('\nUnmatched by product line:');
  for (const [line, names] of Object.entries(unmatchedByLine)) {
    console.log(`  ${line}: ${names.length}`);
  }

  // Save match results
  const matchResults = {
    fetchedAt: new Date().toISOString(),
    totalProducts: allProducts.length,
    totalMatches: matches.size,
    matchesByCollection,
    matches: Array.from(matches.entries()).map(([paintId, sku]) => {
      const paint = database.paints.find((p) => p.id === paintId);
      return {
        paintId,
        paintName: paint?.name,
        productLine: paint?.productLine,
        sku,
      };
    }),
    unmatched: unmatchedPaints.map((p) => ({
      paintId: p.id,
      paintName: p.name,
      productLine: p.productLine,
    })),
  };

  const matchOutputPath = path.join(
    CONFIG.outputDir,
    `army-painter-matches-${new Date().toISOString().split('T')[0]}.json`
  );
  fs.writeFileSync(matchOutputPath, JSON.stringify(matchResults, null, 2));
  console.log(`\nMatch results saved to: ${matchOutputPath}`);

  // Apply matches if not dry run
  if (!dryRun && matches.size > 0) {
    console.log('\nApplying matches to paints.json...');

    let updated = 0;
    for (const paint of database.paints) {
      const sku = matches.get(paint.id);
      if (sku) {
        paint.sku = sku;
        updated++;
      }
    }

    // Save updated database
    fs.writeFileSync(CONFIG.paintsFile, JSON.stringify(database, null, 2));
    console.log(`Updated ${updated} paints with SKUs`);
    console.log('\nNext steps:');
    console.log('  1. npm run ean:generate:army-painter  # Generate EANs');
    console.log('  2. npm run ean:merge                  # Merge into paints.json');
    console.log('  3. npm run import-paints              # Update Firestore');
  } else if (dryRun) {
    console.log('\nDry run complete. Run without --dry-run to apply changes.');
  }
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
