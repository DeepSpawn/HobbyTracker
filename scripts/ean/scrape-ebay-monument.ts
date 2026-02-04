/**
 * eBay Monument Hobbies UPC Scraper
 *
 * Scrapes UPC barcode data from eBay listings for Monument Hobbies products.
 * eBay has excellent coverage of all product lines (Standard, PRIME, Signature, Wash).
 *
 * Strategy:
 * 1. Search eBay for Monument Hobbies products
 * 2. Extract item IDs from search results
 * 3. Fetch individual product pages and extract UPC from structured data
 * 4. Match to our paint database
 *
 * Rate limiting: 2 second delay between requests
 *
 * Usage:
 *   npx tsx scripts/ean/scrape-ebay-monument.ts
 *   npx tsx scripts/ean/scrape-ebay-monument.ts --limit=50
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import type { Paint, PaintDatabase } from '../../src/types/paint';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const CONFIG = {
  baseUrl: 'https://www.ebay.com',
  requestDelayMs: 2000, // 2 second delay between requests
  outputDir: path.join(__dirname, '../../data/ean-scrape'),
  paintsFile: path.join(__dirname, '../../src/data/paints.json'),
  userAgent:
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
};

// Types
interface ScrapedResult {
  paintId: string | null;
  paintName: string;
  brand: string;
  ebayTitle: string;
  ebayItemId: string;
  upc: string | null;
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
    .replace(/signature\s*series\s*/gi, '')
    .replace(/prime\s*/gi, '')
    .replace(/airbrush\s*primers?\s*/gi, '')
    .replace(/22ml/gi, '')
    .replace(/120ml/gi, '')
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Match eBay product to paint database
 */
function matchToPaint(
  ebayTitle: string,
  paints: Paint[]
): { paint: Paint | null; confidence: 'exact' | 'high' | 'low' | 'none' } {
  const normalizedTitle = normalizeName(ebayTitle);

  // Try exact match first
  for (const paint of paints) {
    if (normalizeName(paint.name) === normalizedTitle) {
      return { paint, confidence: 'exact' };
    }
  }

  // Try high confidence match (title contains paint name or vice versa)
  for (const paint of paints) {
    const normalizedPaint = normalizeName(paint.name);
    if (
      normalizedTitle.includes(normalizedPaint) ||
      normalizedPaint.includes(normalizedTitle)
    ) {
      return { paint, confidence: 'high' };
    }
  }

  // Try partial word match (at least 2 significant words match)
  const titleWords = normalizedTitle
    .split(/\s+/)
    .filter((w) => w.length > 2 && !['the', 'and', 'for'].includes(w));
  for (const paint of paints) {
    const paintWords = normalizeName(paint.name)
      .split(/\s+/)
      .filter((w) => w.length > 2);
    const matchCount = titleWords.filter((w) =>
      paintWords.some((pw) => pw.includes(w) || w.includes(pw))
    ).length;
    if (matchCount >= 2) {
      return { paint, confidence: 'low' };
    }
  }

  return { paint: null, confidence: 'none' };
}

/**
 * Search eBay for Monument Hobbies products and get item IDs
 */
async function searchEbay(
  searchTerm: string,
  maxResults: number = 100
): Promise<Array<{ itemId: string; title: string }>> {
  const items: Array<{ itemId: string; title: string }> = [];
  const seenIds = new Set<string>();

  // Search multiple pages
  for (let page = 1; page <= Math.ceil(maxResults / 50); page++) {
    const url = `${CONFIG.baseUrl}/sch/i.html?_nkw=${encodeURIComponent(searchTerm)}&_pgn=${page}&_ipg=50&LH_TitleDesc=0`;

    try {
      console.log(`  Searching page ${page}: ${searchTerm}`);
      const response = await fetch(url, {
        headers: { 'User-Agent': CONFIG.userAgent },
      });

      if (!response.ok) {
        console.error(`  Search failed: ${response.status}`);
        break;
      }

      const html = await response.text();

      // Extract item IDs and titles from search results
      // eBay uses data-view attribute with item info
      const itemMatches = html.matchAll(
        /data-view="\{[^}]*&quot;itemId&quot;:&quot;(\d+)&quot;[^}]*\}"/g
      );
      for (const match of itemMatches) {
        const itemId = match[1];
        if (!seenIds.has(itemId)) {
          seenIds.add(itemId);
          items.push({ itemId, title: '' }); // Title extracted later
        }
      }

      // Also try alternate pattern
      const altMatches = html.matchAll(/href="[^"]*\/itm\/(\d+)[^"]*"/g);
      for (const match of altMatches) {
        const itemId = match[1];
        if (!seenIds.has(itemId)) {
          seenIds.add(itemId);
          items.push({ itemId, title: '' });
        }
      }

      if (items.length >= maxResults) break;
      await sleep(CONFIG.requestDelayMs);
    } catch (error) {
      console.error(`  Search error: ${error}`);
      break;
    }
  }

  return items.slice(0, maxResults);
}

/**
 * Extract UPC from eBay product page
 */
async function extractUpcFromListing(
  itemId: string
): Promise<{ title: string; upc: string | null } | null> {
  const url = `${CONFIG.baseUrl}/itm/${itemId}`;

  try {
    const response = await fetch(url, {
      headers: { 'User-Agent': CONFIG.userAgent },
    });

    if (!response.ok) {
      return null;
    }

    const html = await response.text();

    // Extract title
    const titleMatch = html.match(/<title>([^<]+)<\/title>/i);
    const title = titleMatch
      ? titleMatch[1].replace(/\s*\|\s*eBay.*$/i, '').trim()
      : '';

    // Try multiple UPC extraction patterns

    // Pattern 1: Item specifics UPC field
    let upc: string | null = null;
    const upcPatterns = [
      // JSON-LD structured data
      /"gtin12":\s*"(\d{12})"/,
      /"gtin13":\s*"(\d{13})"/,
      /"gtin":\s*"(\d{12,13})"/,
      // Item specifics table
      /UPC[^>]*>[\s\S]*?<span[^>]*>(\d{12,13})<\/span>/i,
      /itemprop="gtin12"[^>]*>(\d{12})/,
      /itemprop="gtin13"[^>]*>(\d{13})/,
      // Plain text patterns
      /"UPC":\s*"(\d{12,13})"/,
      /UPC:\s*(\d{12,13})/,
    ];

    for (const pattern of upcPatterns) {
      const match = html.match(pattern);
      if (match) {
        upc = match[1];
        break;
      }
    }

    // Filter out "Does not apply" type values
    if (upc && !/^\d{12,13}$/.test(upc)) {
      upc = null;
    }

    return { title, upc };
  } catch (error) {
    console.error(`  Error fetching ${itemId}: ${error}`);
    return null;
  }
}

/**
 * Main function
 */
async function main(): Promise<void> {
  // Parse command line args
  const args = process.argv.slice(2);
  let limit = 200;

  for (const arg of args) {
    if (arg.startsWith('--limit=')) {
      limit = parseInt(arg.split('=')[1], 10);
    }
  }

  console.log('Loading paints database...');
  const database = loadPaintsDatabase();

  // Filter Monument Hobbies paints
  const monumentPaints = database.paints.filter(
    (p) => p.brand === 'monument_hobbies'
  );
  console.log(`Found ${monumentPaints.length} Monument Hobbies paints in DB\n`);

  // Search terms to find all product lines
  const searchTerms = [
    'Monument Hobbies Pro Acryl',
    'Monument Hobbies PRIME',
    'Monument Hobbies Signature Series',
    'Monument Hobbies Wash',
  ];

  // Collect all item IDs
  const allItems: Array<{ itemId: string; title: string }> = [];
  const seenIds = new Set<string>();

  console.log('Searching eBay for Monument Hobbies products...');
  for (const term of searchTerms) {
    const items = await searchEbay(term, Math.ceil(limit / searchTerms.length));
    for (const item of items) {
      if (!seenIds.has(item.itemId)) {
        seenIds.add(item.itemId);
        allItems.push(item);
      }
    }
    await sleep(CONFIG.requestDelayMs);
  }

  console.log(`\nFound ${allItems.length} unique listings\n`);

  if (allItems.length === 0) {
    console.log('No listings found. Exiting.');
    return;
  }

  // Fetch each listing's UPC
  const results: ScrapedResult[] = [];
  const directMapping: Record<string, string> = {};
  let matched = 0;
  let withUpc = 0;

  const itemsToProcess = allItems.slice(0, limit);

  for (let i = 0; i < itemsToProcess.length; i++) {
    const item = itemsToProcess[i];
    console.log(`[${i + 1}/${itemsToProcess.length}] Fetching: ${item.itemId}`);

    const listingData = await extractUpcFromListing(item.itemId);
    if (!listingData) {
      await sleep(CONFIG.requestDelayMs);
      continue;
    }

    // Skip non-Monument products
    if (
      !listingData.title.toLowerCase().includes('monument') &&
      !listingData.title.toLowerCase().includes('pro acryl')
    ) {
      console.log(`  Skipping (not Monument): ${listingData.title.slice(0, 50)}`);
      await sleep(CONFIG.requestDelayMs);
      continue;
    }

    const { paint, confidence } = matchToPaint(listingData.title, monumentPaints);

    const result: ScrapedResult = {
      paintId: paint?.id || null,
      paintName: paint?.name || listingData.title,
      brand: 'monument_hobbies',
      ebayTitle: listingData.title,
      ebayItemId: item.itemId,
      upc: listingData.upc,
      matchConfidence: confidence,
      scrapedAt: new Date().toISOString(),
    };

    results.push(result);

    if (listingData.upc) {
      withUpc++;
      if (paint && confidence !== 'none') {
        // Only add if we don't already have a UPC for this paint
        if (!directMapping[paint.id]) {
          directMapping[paint.id] = listingData.upc;
          matched++;
          console.log(
            `  ✓ ${listingData.title.slice(0, 40)}... → ${listingData.upc} (${confidence})`
          );
        } else {
          console.log(
            `  ○ ${listingData.title.slice(0, 40)}... → ${listingData.upc} (duplicate)`
          );
        }
      } else {
        console.log(
          `  ? ${listingData.title.slice(0, 40)}... → ${listingData.upc} (no match)`
        );
      }
    } else {
      console.log(`  ✗ ${listingData.title.slice(0, 50)}... (no UPC)`);
    }

    await sleep(CONFIG.requestDelayMs);
  }

  // Output stats
  console.log('\n--- Results ---');
  console.log(`Listings scraped: ${results.length}`);
  console.log(`With UPC: ${withUpc}`);
  console.log(`Matched to DB: ${matched}`);
  console.log(`New mappings: ${Object.keys(directMapping).length}`);

  // Ensure output directory exists
  if (!fs.existsSync(CONFIG.outputDir)) {
    fs.mkdirSync(CONFIG.outputDir, { recursive: true });
  }

  // Save direct mapping
  const today = new Date().toISOString().split('T')[0];
  const mappingPath = path.join(
    CONFIG.outputDir,
    `monument_hobbies-ebay-ean-mapping-${today}.json`
  );
  fs.writeFileSync(mappingPath, JSON.stringify(directMapping, null, 2));
  console.log(`\nDirect mapping saved to: ${mappingPath}`);

  // Save full results
  const session = {
    brand: 'monument_hobbies',
    source: 'ebay.com',
    startedAt: new Date().toISOString(),
    lastUpdatedAt: new Date().toISOString(),
    completedCount: withUpc,
    matchedCount: matched,
    totalCount: results.length,
    results,
  };

  const outputPath = path.join(
    CONFIG.outputDir,
    `monument_hobbies-ebay-${today}.json`
  );
  fs.writeFileSync(outputPath, JSON.stringify(session, null, 2));
  console.log(`Full results saved to: ${outputPath}`);

  // Show unmatched products with UPCs for manual review
  const unmatched = results.filter(
    (r) => r.upc && r.matchConfidence === 'none'
  );
  if (unmatched.length > 0) {
    console.log('\n--- Unmatched Products (need manual review) ---');
    for (const r of unmatched.slice(0, 15)) {
      console.log(`  ${r.ebayTitle.slice(0, 60)} → ${r.upc}`);
    }
    if (unmatched.length > 15) {
      console.log(`  ... and ${unmatched.length - 15} more`);
    }
  }

  console.log('\nRun npm run ean:merge to apply scraped UPCs to paints.json');
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
