/**
 * Match Army Painter SKUs to existing paints in database
 *
 * This script:
 * 1. Fetches product pages from Army Painter to get SKU → name mappings
 * 2. Matches those names to existing paints in paints.json
 * 3. Updates paints.json with the matched SKUs
 *
 * Usage:
 *   npm run ean:match:army-painter
 *   npm run ean:match:army-painter -- --dry-run
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
  scrapedSkusFile: path.join(
    __dirname,
    '../../data/ean-scrape/army-painter-skus-scraped-2026-01-24.json'
  ),
  requestDelay: 500,
  userAgent:
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
};

interface ScrapedProduct {
  name: string;
  sku: string;
  url: string;
  collection: string;
}

interface SkuMatch {
  paintId: string;
  paintName: string;
  productLine: string;
  sku: string;
  confidence: 'exact' | 'high' | 'medium' | 'low';
  source: string;
}

/**
 * Delay helper
 */
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
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
    .replace(/[^a-z0-9 '-]/g, '')
    .trim();
}

/**
 * Calculate similarity between two strings (Jaccard similarity on words)
 */
function calculateSimilarity(a: string, b: string): number {
  const wordsA = new Set(normalizeName(a).split(' ').filter(w => w.length > 1));
  const wordsB = new Set(normalizeName(b).split(' ').filter(w => w.length > 1));

  if (wordsA.size === 0 || wordsB.size === 0) return 0;

  const intersection = new Set([...wordsA].filter((x) => wordsB.has(x)));
  const union = new Set([...wordsA, ...wordsB]);

  return intersection.size / union.size;
}

/**
 * Fetch a product page and extract name from it
 */
async function fetchProductName(sku: string): Promise<string | null> {
  // Build URL based on SKU pattern
  let url: string;
  if (sku.startsWith('WP3')) {
    url = `https://thearmypainter.com/products/warpaints-fanatic-${sku.toLowerCase()}p`;
  } else if (sku.startsWith('WP2')) {
    url = `https://thearmypainter.com/products/speedpaint-${sku.toLowerCase()}`;
  } else if (sku.startsWith('AW')) {
    url = `https://thearmypainter.com/products/warpaints-air-${sku.toLowerCase()}`;
  } else {
    return null;
  }

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': CONFIG.userAgent,
        Accept: 'text/html',
      },
    });

    if (!response.ok) {
      // Try alternate URL formats
      const altUrls = [
        `https://thearmypainter.com/products/${sku.toLowerCase()}`,
        `https://thearmypainter.com/products/${sku.toLowerCase()}p`,
      ];
      for (const altUrl of altUrls) {
        const altResponse = await fetch(altUrl, {
          headers: { 'User-Agent': CONFIG.userAgent, Accept: 'text/html' },
        });
        if (altResponse.ok) {
          const html = await altResponse.text();
          return extractNameFromHtml(html);
        }
      }
      return null;
    }

    const html = await response.text();
    return extractNameFromHtml(html);
  } catch (error) {
    console.error(`  Error fetching ${sku}:`, error);
    return null;
  }
}

/**
 * Extract product name from HTML
 */
function extractNameFromHtml(html: string): string | null {
  // Try multiple patterns
  const patterns = [
    /<title>([^|<]+)/i,
    /"name":\s*"([^"]+)"/,
    /"title":\s*"([^"]+)"/,
    /<h1[^>]*>([^<]+)<\/h1>/i,
  ];

  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match) {
      let name = match[1].trim();
      // Clean up common prefixes
      name = name
        .replace(/^Warpaints Fanatic:\s*/i, '')
        .replace(/^Speedpaint[:\s]+/i, '')
        .replace(/^Speedpaint 2\.0[:\s]+/i, '')
        .replace(/^Warpaints Air:\s*/i, '')
        .replace(/\s*[-–|].*$/, '')
        .trim();
      if (name.length > 2 && name.length < 100) {
        return name;
      }
    }
  }

  return null;
}

/**
 * Load paints database
 */
function loadPaintsDatabase(): PaintDatabase {
  const content = fs.readFileSync(CONFIG.paintsFile, 'utf-8');
  return JSON.parse(content) as PaintDatabase;
}

/**
 * Map product lines to SKU prefixes
 */
const PRODUCT_LINE_TO_SKU_PREFIX: Record<string, string[]> = {
  'Warpaints Fanatic': ['WP3'],
  'Warpaints Fanatic Wash': ['WP3'],
  'Speedpaint Set 2.0': ['WP2'],
  'Warpaints Air': ['AW'],
};

/**
 * Main function
 */
async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const fetchNames = args.includes('--fetch-names');

  console.log('Army Painter SKU Matcher');
  console.log('========================');
  if (dryRun) {
    console.log('DRY RUN MODE - no changes will be made\n');
  }

  // Load data
  console.log('Loading paints database...');
  const database = loadPaintsDatabase();

  // Load scraped SKUs
  console.log('Loading scraped SKUs...');
  let scrapedData;
  try {
    scrapedData = JSON.parse(fs.readFileSync(CONFIG.scrapedSkusFile, 'utf-8'));
  } catch (error) {
    console.error('Error loading scraped SKUs file. Run npm run ean:scrape:army-painter first.');
    process.exit(1);
  }

  const scrapedSkus = scrapedData.allProducts as ScrapedProduct[];
  console.log(`Loaded ${scrapedSkus.length} scraped SKUs\n`);

  // Filter Army Painter paints that need SKUs
  const armyPainterPaints = database.paints.filter(
    (p) => p.brand === 'army_painter' && !p.sku
  );
  console.log(`Found ${armyPainterPaints.length} Army Painter paints without SKUs\n`);

  // Group paints by product line
  const paintsByLine: Record<string, Paint[]> = {};
  for (const paint of armyPainterPaints) {
    const line = paint.productLine;
    if (!paintsByLine[line]) {
      paintsByLine[line] = [];
    }
    paintsByLine[line].push(paint);
  }

  // If fetching names, do that first
  const skuToName: Map<string, string> = new Map();
  if (fetchNames) {
    console.log('Fetching product names from Army Painter website...');
    let fetched = 0;
    for (const product of scrapedSkus) {
      if (product.name.startsWith('Unknown')) {
        const name = await fetchProductName(product.sku);
        if (name) {
          skuToName.set(product.sku, name);
          fetched++;
          console.log(`  ${product.sku} → ${name}`);
        }
        await delay(CONFIG.requestDelay);
      } else {
        skuToName.set(product.sku, product.name);
      }
    }
    console.log(`Fetched ${fetched} product names\n`);
  }

  // Match SKUs to paints
  const matches: SkuMatch[] = [];
  const unmatched: ScrapedProduct[] = [];
  const usedSkus = new Set<string>();

  // Process each product line
  for (const [productLine, prefixes] of Object.entries(PRODUCT_LINE_TO_SKU_PREFIX)) {
    const paints = paintsByLine[productLine] || [];
    if (paints.length === 0) continue;

    console.log(`\nMatching ${productLine} (${paints.length} paints)...`);

    // Get SKUs for this product line
    const relevantSkus = scrapedSkus.filter((s) =>
      prefixes.some((prefix) => s.sku.startsWith(prefix))
    );
    console.log(`  ${relevantSkus.length} relevant SKUs available`);

    // Try to match by name
    for (const paint of paints) {
      const normalizedPaintName = normalizeName(paint.name);

      let bestMatch: { sku: string; name: string; similarity: number } | null = null;

      for (const scraped of relevantSkus) {
        if (usedSkus.has(scraped.sku)) continue;

        // Get name from fetched data or scraped data
        let scrapedName = skuToName.get(scraped.sku) || scraped.name;
        if (scrapedName.startsWith('Unknown')) {
          // Try to extract name from SKU context if available
          continue;
        }

        const normalizedScrapedName = normalizeName(scrapedName);
        const similarity = calculateSimilarity(paint.name, scrapedName);

        // Also check for exact substring match
        const exactSubstring =
          normalizedPaintName.includes(normalizedScrapedName) ||
          normalizedScrapedName.includes(normalizedPaintName);

        const effectiveSimilarity = exactSubstring
          ? Math.max(similarity, 0.8)
          : similarity;

        if (effectiveSimilarity > (bestMatch?.similarity || 0.5)) {
          bestMatch = { sku: scraped.sku, name: scrapedName, similarity: effectiveSimilarity };
        }
      }

      if (bestMatch) {
        const confidence: 'exact' | 'high' | 'medium' | 'low' =
          bestMatch.similarity > 0.9
            ? 'exact'
            : bestMatch.similarity > 0.7
              ? 'high'
              : bestMatch.similarity > 0.5
                ? 'medium'
                : 'low';

        matches.push({
          paintId: paint.id,
          paintName: paint.name,
          productLine: paint.productLine,
          sku: bestMatch.sku,
          confidence,
          source: `name-match (${(bestMatch.similarity * 100).toFixed(0)}%)`,
        });
        usedSkus.add(bestMatch.sku);

        if (confidence !== 'exact') {
          console.log(
            `  [${confidence}] "${paint.name}" → ${bestMatch.sku} (from "${bestMatch.name}")`
          );
        }
      }
    }

    // Report unmatched paints for this line
    const matchedPaintIds = new Set(
      matches.filter((m) => m.productLine === productLine).map((m) => m.paintId)
    );
    const unmatchedPaints = paints.filter((p) => !matchedPaintIds.has(p.id));
    if (unmatchedPaints.length > 0) {
      console.log(`  ${unmatchedPaints.length} paints could not be matched`);
    }
  }

  // Summary
  console.log('\n=== Summary ===');
  console.log(`Total matches: ${matches.length}`);
  console.log(`  - Exact: ${matches.filter((m) => m.confidence === 'exact').length}`);
  console.log(`  - High: ${matches.filter((m) => m.confidence === 'high').length}`);
  console.log(`  - Medium: ${matches.filter((m) => m.confidence === 'medium').length}`);
  console.log(`  - Low: ${matches.filter((m) => m.confidence === 'low').length}`);

  // Save matches for review
  const outputPath = path.join(
    CONFIG.outputDir,
    `army-painter-sku-matches-${new Date().toISOString().split('T')[0]}.json`
  );
  fs.writeFileSync(
    outputPath,
    JSON.stringify(
      {
        matchedAt: new Date().toISOString(),
        totalMatches: matches.length,
        matches: matches.sort((a, b) => a.productLine.localeCompare(b.productLine)),
      },
      null,
      2
    )
  );
  console.log(`\nMatches saved to: ${outputPath}`);

  // Apply matches if not dry run
  if (!dryRun && matches.length > 0) {
    console.log('\nApplying matches to paints.json...');

    // Create mapping
    const skuByPaintId = new Map(matches.map((m) => [m.paintId, m.sku]));

    // Update paints
    let updated = 0;
    for (const paint of database.paints) {
      const sku = skuByPaintId.get(paint.id);
      if (sku) {
        paint.sku = sku;
        updated++;
      }
    }

    // Save updated database
    fs.writeFileSync(CONFIG.paintsFile, JSON.stringify(database, null, 2));
    console.log(`Updated ${updated} paints with SKUs`);
    console.log('\nRun npm run ean:generate:army-painter to generate EANs');
  } else if (dryRun) {
    console.log('\nDry run complete. Run without --dry-run to apply changes.');
  }
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
