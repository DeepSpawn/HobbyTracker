/**
 * Monument Hobbies Official Store UPC Scraper
 *
 * Scrapes UPC barcode data directly from monumenthobbies.com Shopify store.
 * The products.json listing endpoint doesn't include barcodes, but individual
 * product .json endpoints do include the barcode field on variants.
 *
 * Strategy:
 * 1. Fetch paginated product listings to get all product handles
 * 2. For each paint product, fetch the individual .json endpoint
 * 3. Extract barcode from variant data
 * 4. Match to our paint database by SKU
 *
 * Rate limiting: 1 second delay between requests
 *
 * Usage:
 *   npx tsx scripts/ean/scrape-monumenthobbies-official.ts
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import type { Paint, PaintDatabase } from '../../src/types/paint';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CONFIG = {
  baseUrl: 'https://monumenthobbies.com',
  requestDelayMs: 1000,
  outputDir: path.join(__dirname, '../../data/ean-scrape'),
  paintsFile: path.join(__dirname, '../../src/data/paints.json'),
  userAgent:
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
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
 * Fetch all paint product handles from the products.json listing.
 * Filters for individual paint products (SKU starting with MPA-).
 */
async function fetchProductHandles(): Promise<
  { handle: string; sku: string }[]
> {
  const handles: { handle: string; sku: string }[] = [];
  let page = 1;

  while (true) {
    console.log(`  Fetching product page ${page}...`);
    const url = `${CONFIG.baseUrl}/products.json?limit=250&page=${page}`;

    const response = await fetch(url, {
      headers: { 'User-Agent': CONFIG.userAgent },
    });

    if (!response.ok) {
      console.error(`  Failed: ${response.status}`);
      break;
    }

    const data = (await response.json()) as { products: ShopifyProduct[] };
    if (!data.products || data.products.length === 0) break;

    for (const product of data.products) {
      const sku = product.variants?.[0]?.sku || '';
      // Only include individual paint products (MPA- prefix), exclude sets
      if (sku.startsWith('MPA-') && !sku.includes('SET')) {
        handles.push({ handle: product.handle, sku });
      }
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
 * Match a Shopify product to a paint in our database by SKU.
 * Monument SKU format: MPA-001 to MPA-076, MPA-S01 to MPA-S49, MPA-F01 to MPA-F06, etc.
 */
function matchToPaint(
  shopifySku: string,
  shopifyTitle: string,
  paints: Paint[]
): { paint: Paint | null; confidence: 'exact' | 'high' | 'low' | 'none' } {
  // Extract the paint SKU from the Shopify SKU (e.g., MPA-001 → 001, MPA-S18 → S18)
  const skuMatch = shopifySku.match(/^MPA-(.+)$/i);
  if (skuMatch) {
    const paintSku = skuMatch[1];
    for (const paint of paints) {
      if (paint.sku && paint.sku.toLowerCase() === paintSku.toLowerCase()) {
        return { paint, confidence: 'exact' };
      }
    }

    // Try with leading zeros removed/added
    const numSku = paintSku.replace(/^0+/, '');
    for (const paint of paints) {
      if (paint.sku) {
        const paintNum = paint.sku.replace(/^0+/, '');
        if (paintNum.toLowerCase() === numSku.toLowerCase()) {
          return { paint, confidence: 'exact' };
        }
      }
    }
  }

  // Fallback: name matching
  const normalizedTitle = shopifyTitle
    .toLowerCase()
    .replace(/^\d+-\s*/, '') // Remove leading SKU number
    .replace(/pro\s*acryl\s*/gi, '')
    .replace(/monument\s*/gi, '')
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  for (const paint of paints) {
    const normalizedPaint = paint.name
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .replace(/\s+/g, ' ')
      .trim();

    if (normalizedPaint === normalizedTitle) {
      return { paint, confidence: 'high' };
    }

    // Check if one contains the other
    if (
      normalizedTitle.includes(normalizedPaint) ||
      normalizedPaint.includes(normalizedTitle)
    ) {
      return { paint, confidence: 'high' };
    }
  }

  return { paint: null, confidence: 'none' };
}

async function main(): Promise<void> {
  console.log('Loading paints database...');
  const database = loadPaintsDatabase();

  const monumentPaints = database.paints.filter(
    (p) => p.brand === 'monument_hobbies'
  );
  console.log(`Found ${monumentPaints.length} Monument Hobbies paints in DB`);
  console.log(
    `Currently have UPCs: ${monumentPaints.filter((p) => p.ean).length}/${monumentPaints.length}\n`
  );

  console.log('Fetching product handles from monumenthobbies.com...');
  const handles = await fetchProductHandles();
  console.log(`Found ${handles.length} individual paint products\n`);

  const results: ScrapedResult[] = [];
  const directMapping: Record<string, string> = {};
  let matched = 0;
  let withBarcode = 0;

  for (let i = 0; i < handles.length; i++) {
    const { handle, sku } = handles[i];
    process.stdout.write(
      `[${i + 1}/${handles.length}] ${handle.slice(0, 55)}... `
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
      monumentPaints
    );

    results.push({
      paintId: paint?.id || null,
      paintName: paint?.name || data.title,
      brand: 'monument_hobbies',
      shopifyTitle: data.title,
      shopifyHandle: handle,
      shopifySku: data.sku,
      barcode: data.barcode,
      matchConfidence: confidence,
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
        console.log(`? ${data.barcode} → "${data.title}" (no match)`);
      }
    } else {
      console.log(`no barcode (${data.sku})`);
    }

    await sleep(CONFIG.requestDelayMs);
  }

  // Stats
  console.log('\n--- Results ---');
  console.log(`Products scraped: ${results.length}`);
  console.log(`With barcode: ${withBarcode}`);
  console.log(`Matched to DB: ${matched}`);

  // Ensure output directory
  if (!fs.existsSync(CONFIG.outputDir)) {
    fs.mkdirSync(CONFIG.outputDir, { recursive: true });
  }

  // Save mapping
  const today = new Date().toISOString().split('T')[0];
  const mappingPath = path.join(
    CONFIG.outputDir,
    `monument_hobbies-official-ean-mapping-${today}.json`
  );
  fs.writeFileSync(mappingPath, JSON.stringify(directMapping, null, 2));
  console.log(`\nMapping saved to: ${mappingPath}`);

  // Save full results
  const session = {
    brand: 'monument_hobbies',
    source: 'monumenthobbies.com',
    startedAt: new Date().toISOString(),
    lastUpdatedAt: new Date().toISOString(),
    completedCount: withBarcode,
    matchedCount: matched,
    totalCount: results.length,
    results,
  };

  const outputPath = path.join(
    CONFIG.outputDir,
    `monument_hobbies-official-${today}.json`
  );
  fs.writeFileSync(outputPath, JSON.stringify(session, null, 2));
  console.log(`Full results saved to: ${outputPath}`);

  // Show unmatched
  const unmatched = results.filter(
    (r) => r.barcode && r.matchConfidence === 'none'
  );
  if (unmatched.length > 0) {
    console.log('\n--- Unmatched Products ---');
    for (const r of unmatched) {
      console.log(`  ${r.shopifySku}: ${r.shopifyTitle} → ${r.barcode}`);
    }
  }

  console.log('\nRun npm run ean:merge to apply scraped UPCs to paints.json');
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
