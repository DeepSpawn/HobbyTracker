/**
 * Army Painter Official Store Barcode Scraper
 *
 * Scrapes barcode data directly from thearmypainter.com Shopify store.
 * The products.json listing endpoint doesn't include barcodes, but individual
 * product .json endpoints do include the barcode field on variants.
 *
 * Strategy:
 * 1. Fetch product handles from multiple Shopify collections
 * 2. For each product, fetch the individual .json endpoint to get barcode
 * 3. Match to our paint database by SKU (stripped trailing P) and name
 *
 * Rate limiting: 1 second delay between requests
 *
 * Usage:
 *   npx tsx scripts/ean/scrape-army-painter-official.ts
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import type { Paint, PaintDatabase } from '../../src/types/paint';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CONFIG = {
  baseUrl: 'https://thearmypainter.com',
  requestDelayMs: 1000,
  outputDir: path.join(__dirname, '../../data/ean-scrape'),
  paintsFile: path.join(__dirname, '../../src/data/paints.json'),
  userAgent:
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  // Collections to scrape — covers individual paints and sets
  collections: [
    'warpaints-fanatic-singles',
    'washes',
    'warpaints-air-singles',
    'speedpaint-singles',
    'warpaints-fanatic',
    'speedpaint',
    'warpaints-air',
    'all-paint-sets',
    'sets-1',
    'primers',
    'all-products',
  ],
};

interface ShopifyVariant {
  id: number;
  sku: string | null;
  barcode: string | null;
  title: string;
  price: string;
}

interface ShopifyProduct {
  id: number;
  title: string;
  handle: string;
  vendor: string;
  variants: ShopifyVariant[];
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
  collection: string;
  scrapedAt: string;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function loadPaintsDatabase(): PaintDatabase {
  const content = fs.readFileSync(CONFIG.paintsFile, 'utf-8');
  return JSON.parse(content) as PaintDatabase;
}

/**
 * Clean Army Painter product name by stripping Shopify prefixes.
 * Reuses patterns from fetch-army-painter-products.ts.
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
    .replace(/^D&D Nolzur's Marvelous Pigments:\s*/i, '')
    .replace(/^Colour Primer:\s*/i, '')
    .trim();
}

/**
 * Normalize SKU by stripping trailing P (Shopify uses WP3012P, our DB uses WP3012).
 */
function normalizeSku(sku: string): string {
  return sku.replace(/P$/, '');
}

/**
 * Normalize a name for fuzzy matching.
 */
function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .replace(/['']/g, "'")
    .replace(/[–—]/g, '-')
    .replace(/[^a-z0-9\s'-]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Fetch all product handles from a collection's products.json listing.
 * Deduplicates by handle across collections.
 */
async function fetchCollectionHandles(
  collection: string,
  seenHandles: Set<string>
): Promise<{ handle: string; sku: string; collection: string }[]> {
  const handles: { handle: string; sku: string; collection: string }[] = [];
  let page = 1;

  while (true) {
    const url = `${CONFIG.baseUrl}/collections/${collection}/products.json?limit=250&page=${page}`;

    const response = await fetch(url, {
      headers: { 'User-Agent': CONFIG.userAgent },
    });

    if (!response.ok) {
      console.error(`  Failed to fetch ${collection} page ${page}: ${response.status}`);
      break;
    }

    const data = (await response.json()) as { products: ShopifyProduct[] };
    if (!data.products || data.products.length === 0) break;

    for (const product of data.products) {
      if (seenHandles.has(product.handle)) continue;
      seenHandles.add(product.handle);

      const sku = product.variants?.[0]?.sku || '';
      handles.push({ handle: product.handle, sku, collection });
    }

    if (data.products.length < 250) break;
    page++;
    await sleep(CONFIG.requestDelayMs);
  }

  return handles;
}

/**
 * Fetch individual product JSON to get barcode data.
 */
async function fetchProductBarcode(
  handle: string
): Promise<{
  title: string;
  sku: string;
  barcode: string | null;
} | null> {
  const url = `${CONFIG.baseUrl}/products/${handle}.json`;

  try {
    const response = await fetch(url, {
      headers: { 'User-Agent': CONFIG.userAgent },
    });

    if (!response.ok) {
      return null;
    }

    const data = (await response.json()) as { product: ShopifyProduct };
    const product = data.product;

    if (!product?.variants?.length) return null;

    const variant = product.variants[0];
    let barcode = variant.barcode || null;

    // Validate barcode format (12-13 digits)
    if (barcode && !/^\d{12,13}$/.test(barcode)) {
      barcode = null;
    }

    return {
      title: product.title,
      sku: variant.sku || '',
      barcode,
    };
  } catch {
    return null;
  }
}

/**
 * Match a Shopify product to a paint in our database.
 *
 * Strategy 1: SKU match (strip trailing P, compare to paint.sku) — exact confidence
 * Strategy 2: Name match (cleaned title vs paint.name) — high/low confidence
 */
function matchToPaint(
  shopifySku: string,
  shopifyTitle: string,
  paints: Paint[]
): { paint: Paint | null; confidence: 'exact' | 'high' | 'low' | 'none' } {
  // Strategy 1: SKU match
  if (shopifySku) {
    const normalizedSku = normalizeSku(shopifySku);

    // Direct SKU match
    for (const paint of paints) {
      if (paint.sku && paint.sku.toLowerCase() === normalizedSku.toLowerCase()) {
        return { paint, confidence: 'exact' };
      }
    }
  }

  // Strategy 2: Name match using cleaned title
  const cleanedTitle = cleanProductName(shopifyTitle);
  const normalizedTitle = normalizeName(cleanedTitle);

  // Exact name match
  for (const paint of paints) {
    const normalizedPaintName = normalizeName(paint.name);
    if (normalizedPaintName === normalizedTitle) {
      return { paint, confidence: 'high' };
    }
  }

  // Substring match — one contains the other (high confidence if long enough)
  for (const paint of paints) {
    const normalizedPaintName = normalizeName(paint.name);

    if (normalizedPaintName.length < 3 || normalizedTitle.length < 3) continue;

    if (
      normalizedTitle === normalizedPaintName ||
      (normalizedTitle.length >= 5 && normalizedPaintName.includes(normalizedTitle)) ||
      (normalizedPaintName.length >= 5 && normalizedTitle.includes(normalizedPaintName))
    ) {
      return { paint, confidence: 'high' };
    }
  }

  // Loose match: compare without hyphens and apostrophes
  const looseTitle = normalizedTitle.replace(/['-]/g, '').replace(/\s+/g, ' ');
  for (const paint of paints) {
    const loosePaint = normalizeName(paint.name).replace(/['-]/g, '').replace(/\s+/g, ' ');
    if (looseTitle === loosePaint) {
      return { paint, confidence: 'low' };
    }
  }

  return { paint: null, confidence: 'none' };
}

async function main(): Promise<void> {
  console.log('Army Painter Official Store Barcode Scraper');
  console.log('='.repeat(50));

  console.log('\nLoading paints database...');
  const database = loadPaintsDatabase();

  const armyPainterPaints = database.paints.filter(
    (p) => p.brand === 'army_painter'
  );
  const missingBarcode = armyPainterPaints.filter((p) => !p.ean);
  console.log(`Found ${armyPainterPaints.length} Army Painter paints in DB`);
  console.log(
    `Currently have barcodes: ${armyPainterPaints.length - missingBarcode.length}/${armyPainterPaints.length}`
  );
  console.log(`Missing barcodes: ${missingBarcode.length}\n`);

  // Phase 1: Fetch product handles from all collections
  console.log('Phase 1: Fetching product handles from collections...');
  const allHandles: { handle: string; sku: string; collection: string }[] = [];
  const seenHandles = new Set<string>();

  for (const collection of CONFIG.collections) {
    process.stdout.write(`  ${collection}... `);
    const handles = await fetchCollectionHandles(collection, seenHandles);
    console.log(`${handles.length} new products`);
    allHandles.push(...handles);
    await sleep(CONFIG.requestDelayMs);
  }
  console.log(`\nTotal unique products to check: ${allHandles.length}\n`);

  // Phase 2: Fetch individual product barcodes
  console.log('Phase 2: Fetching individual product barcodes...');
  const results: ScrapedResult[] = [];
  const directMapping: Record<string, string> = {};
  let matched = 0;
  let withBarcode = 0;

  for (let i = 0; i < allHandles.length; i++) {
    const { handle, collection } = allHandles[i];
    process.stdout.write(
      `[${i + 1}/${allHandles.length}] ${handle.slice(0, 60).padEnd(60)} `
    );

    const data = await fetchProductBarcode(handle);
    if (!data) {
      console.log('fetch failed');
      await sleep(CONFIG.requestDelayMs);
      continue;
    }

    const { paint, confidence } = matchToPaint(
      data.sku,
      data.title,
      armyPainterPaints
    );

    results.push({
      paintId: paint?.id || null,
      paintName: paint?.name || data.title,
      brand: 'army_painter',
      shopifyTitle: data.title,
      shopifyHandle: handle,
      shopifySku: data.sku,
      barcode: data.barcode,
      matchConfidence: confidence,
      collection,
      scrapedAt: new Date().toISOString(),
    });

    if (data.barcode) {
      withBarcode++;
      if (paint && confidence !== 'none') {
        if (!directMapping[paint.id]) {
          directMapping[paint.id] = data.barcode;
          matched++;
          console.log(`✓ ${data.barcode} → ${paint.name} (${confidence})`);
        } else {
          console.log(`= ${data.barcode} (duplicate)`);
        }
      } else {
        console.log(`? ${data.barcode} → "${cleanProductName(data.title)}" (no match)`);
      }
    } else {
      console.log(`no barcode (${data.sku || 'no sku'})`);
    }

    await sleep(CONFIG.requestDelayMs);
  }

  // Stats
  console.log('\n' + '='.repeat(50));
  console.log('SCRAPE RESULTS');
  console.log('='.repeat(50));
  console.log(`Products scraped:        ${results.length}`);
  console.log(`With barcode:            ${withBarcode}`);
  console.log(`Matched to DB:           ${matched}`);
  console.log(`Previously had barcode:  ${armyPainterPaints.length - missingBarcode.length}`);
  console.log(`New barcodes found:      ${Object.keys(directMapping).filter((id) => !armyPainterPaints.find((p) => p.id === id)?.ean).length}`);

  // Ensure output directory
  if (!fs.existsSync(CONFIG.outputDir)) {
    fs.mkdirSync(CONFIG.outputDir, { recursive: true });
  }

  // Save mapping file (consumed by ean:merge)
  const today = new Date().toISOString().split('T')[0];
  const mappingPath = path.join(
    CONFIG.outputDir,
    `army_painter-official-ean-mapping-${today}.json`
  );
  fs.writeFileSync(mappingPath, JSON.stringify(directMapping, null, 2));
  console.log(`\nMapping saved to: ${mappingPath}`);

  // Save full results for debugging
  const session = {
    brand: 'army_painter',
    source: 'thearmypainter.com',
    startedAt: new Date().toISOString(),
    lastUpdatedAt: new Date().toISOString(),
    completedCount: withBarcode,
    matchedCount: matched,
    totalCount: results.length,
    results,
  };

  const outputPath = path.join(
    CONFIG.outputDir,
    `army_painter-official-${today}.json`
  );
  fs.writeFileSync(outputPath, JSON.stringify(session, null, 2));
  console.log(`Full results saved to: ${outputPath}`);

  // Show unmatched products that had barcodes
  const unmatched = results.filter(
    (r) => r.barcode && r.matchConfidence === 'none'
  );
  if (unmatched.length > 0) {
    console.log(`\n--- Unmatched Products with Barcodes (${unmatched.length}) ---`);
    for (const r of unmatched) {
      console.log(`  ${r.shopifySku || 'no-sku'}: "${cleanProductName(r.shopifyTitle)}" → ${r.barcode}`);
    }
  }

  // Show missing paints that were NOT recovered
  const recoveredIds = new Set(Object.keys(directMapping));
  const stillMissing = missingBarcode.filter((p) => !recoveredIds.has(p.id));
  if (stillMissing.length > 0) {
    console.log(`\n--- Still Missing Barcodes (${stillMissing.length}) ---`);
    const byLine: Record<string, string[]> = {};
    for (const p of stillMissing) {
      if (!byLine[p.productLine]) byLine[p.productLine] = [];
      byLine[p.productLine].push(p.name);
    }
    for (const [line, names] of Object.entries(byLine).sort((a, b) => b[1].length - a[1].length)) {
      console.log(`  ${line} (${names.length}):`);
      for (const name of names.slice(0, 5)) {
        console.log(`    - ${name}`);
      }
      if (names.length > 5) {
        console.log(`    ... and ${names.length - 5} more`);
      }
    }
  }

  // Verify barcode prefix
  const armyPainterBarcodes = Object.values(directMapping);
  const withExpectedPrefix = armyPainterBarcodes.filter((b) => b.startsWith('5713799'));
  console.log(`\n--- Barcode Prefix Check ---`);
  console.log(`Expected prefix 5713799: ${withExpectedPrefix.length}/${armyPainterBarcodes.length}`);
  const otherPrefixes = armyPainterBarcodes.filter((b) => !b.startsWith('5713799'));
  if (otherPrefixes.length > 0) {
    console.log('Other prefixes found:');
    for (const b of otherPrefixes.slice(0, 5)) {
      console.log(`  ${b}`);
    }
  }

  console.log('\nRun npm run ean:merge to apply scraped barcodes to paints.json');
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
