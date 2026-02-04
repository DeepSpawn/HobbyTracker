/**
 * Gamersphere.au Monument Hobbies UPC Scraper
 *
 * Scrapes UPC barcode data from gamersphere.au for Monument Hobbies products.
 * Barcode is displayed in the Specifications section as "Barcode #".
 *
 * Rate limiting: 1.5 second delay between requests
 *
 * Usage:
 *   npx tsx scripts/ean/scrape-gamersphere-monument.ts
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import type { Paint, PaintDatabase } from '../../src/types/paint';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const CONFIG = {
  baseUrl: 'https://www.gamersphere.au',
  requestDelayMs: 1500,
  outputDir: path.join(__dirname, '../../data/ean-scrape'),
  paintsFile: path.join(__dirname, '../../src/data/paints.json'),
  userAgent:
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
};

/**
 * Generate URL slug candidates for a paint based on its name and product line.
 * Returns multiple slug variants since gamersphere URL patterns vary.
 */
function generateUrlSlugs(paint: Paint): string[] {
  const slugs: string[] = [];
  const baseName = paint.name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .trim();

  const productLine = paint.productLine || '';

  if (productLine.includes('Primer') || productLine.includes('Prime')) {
    // PRIME products: monument-pro-acryl-prime-{name}-120ml
    const primeName = paint.name
      .replace(/^PRIME\s*/i, '')
      .replace(/^AdeptiCon Spray-Team\s*/i, '')
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-');
    slugs.push(`monument-pro-acryl-prime-${primeName}-120ml`);
    slugs.push(`monument-pro-acryl-prime-${primeName}-60ml`);
    // AdeptiCon spray variants
    if (paint.name.includes('AdeptiCon') || paint.name.includes('Spray-Team')) {
      const sprayName = paint.name
        .replace(/^AdeptiCon Spray-Team\s*/i, '')
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-');
      slugs.push(`monument-pro-acryl-adepticon-spray-team-${sprayName}-120ml`);
      slugs.push(`monument-pro-acryl-prime-adepticon-${sprayName}-120ml`);
    }
  } else if (productLine.includes('Signature')) {
    // Signature Series: monument-pro-acryl-signature-{artist}-{name}-22ml
    const sigName = paint.name.toLowerCase();
    const artistPatterns = [
      { prefix: /^ben komets\s*/i, slug: 'ben-komets' },
      { prefix: /^vince venturella\s*/i, slug: 'vince-venturella' },
      { prefix: /^adepticon\s*/i, slug: 'adepticon' },
      { prefix: /^ninjon\s*/i, slug: 'ninjon' },
      { prefix: /^juan hidalgo\s*/i, slug: 'juan-hidalgo' },
      { prefix: /^sergio calvo\s*/i, slug: 'sergio-calvo' },
      { prefix: /^sam lenz\s*/i, slug: 'sam-lenz' },
      { prefix: /^squidmar\s*/i, slug: 'squidmar' },
    ];

    for (const { prefix, slug: artistSlug } of artistPatterns) {
      if (prefix.test(paint.name)) {
        const colorName = paint.name
          .replace(prefix, '')
          .toLowerCase()
          .replace(/[^a-z0-9\s-]/g, '')
          .replace(/\s+/g, '-');
        slugs.push(`monument-pro-acryl-signature-${artistSlug}-${colorName}-22ml`);
        slugs.push(`monument-pro-acryl-${artistSlug}-${colorName}-22ml`);
        break;
      }
    }

    // Generic signature slug
    const cleanSigName = paint.name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-');
    slugs.push(`monument-pro-acryl-signature-${cleanSigName}-22ml`);
  } else if (productLine.includes('Wash')) {
    // Washes: monument-pro-acryl-washes-{name}-22ml
    const washName = paint.name
      .replace(/\s*wash$/i, '')
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-');
    slugs.push(`monument-pro-acryl-washes-${washName}-wash-22ml`);
    slugs.push(`monument-pro-acryl-${washName}-wash-22ml`);
  } else {
    // Standard line: monument-pro-acryl-{name}-22ml
    slugs.push(`monument-pro-acryl-${baseName}-22ml`);
    // Some have "bold" prefix for bolder colors
    if (paint.name.toLowerCase().includes('bold')) {
      const boldName = paint.name
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-');
      slugs.push(`monument-pro-acryl-${boldName}-22ml`);
    }
  }

  return slugs;
}

interface ScrapedResult {
  paintId: string | null;
  paintName: string;
  brand: string;
  pageTitle: string;
  pageUrl: string;
  modelNumber: string | null;
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

function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .replace(/monument\s*(hobbies?)?\s*/gi, '')
    .replace(/pro\s*acryl(ic)?\s*/gi, '')
    .replace(/standard\s*/gi, '')
    .replace(/signature\s*(series)?\s*/gi, '')
    .replace(/prime\s*/gi, '')
    .replace(/washes?\s*/gi, '')
    .replace(/22ml/gi, '')
    .replace(/120ml/gi, '')
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function matchToPaint(
  title: string,
  modelNumber: string | null,
  paints: Paint[]
): { paint: Paint | null; confidence: 'exact' | 'high' | 'low' | 'none' } {
  const normalizedTitle = normalizeName(title);

  // Try matching by model number (SKU) first - most reliable
  if (modelNumber) {
    for (const paint of paints) {
      if (paint.sku && paint.sku.toLowerCase() === modelNumber.toLowerCase()) {
        return { paint, confidence: 'exact' };
      }
    }
  }

  // Try exact name match
  for (const paint of paints) {
    if (normalizeName(paint.name) === normalizedTitle) {
      return { paint, confidence: 'exact' };
    }
  }

  // Try high confidence (contains)
  for (const paint of paints) {
    const normalizedPaint = normalizeName(paint.name);
    if (
      normalizedTitle.includes(normalizedPaint) ||
      normalizedPaint.includes(normalizedTitle)
    ) {
      return { paint, confidence: 'high' };
    }
  }

  // Try word matching
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

async function scrapeProductPage(
  urlSlug: string
): Promise<{ title: string; modelNumber: string | null; barcode: string | null } | null> {
  const url = `${CONFIG.baseUrl}/${urlSlug}`;

  try {
    const response = await fetch(url, {
      headers: { 'User-Agent': CONFIG.userAgent },
    });

    if (!response.ok) {
      console.error(`  Failed: ${response.status} - ${urlSlug}`);
      return null;
    }

    const html = await response.text();

    // Extract title from <title> tag
    const titleMatch = html.match(/<title>([^<]+)<\/title>/i);
    let title = titleMatch
      ? titleMatch[1].replace(/\s*[-|]\s*Gamer.*$/i, '').trim()
      : '';

    // Fallback: Extract from h1 tag
    if (!title) {
      const h1Match = html.match(/<h1[^>]*>([^<]+)<\/h1>/i);
      if (h1Match) {
        title = h1Match[1].trim();
      }
    }

    // Fallback: Parse from URL slug
    if (!title) {
      title = urlSlug
        .replace(/^monument-pro-acryl-/i, '')
        .replace(/-22ml$|-120ml$/i, '')
        .replace(/-/g, ' ')
        .replace(/\b\w/g, (c) => c.toUpperCase())
        .trim();
    }

    // Extract Model # from specifications
    const modelMatch = html.match(/Model\s*#[^<]*<[^>]*>([^<]+)/i);
    const modelNumber = modelMatch ? modelMatch[1].trim() : null;

    // Try multiple patterns to find the barcode/UPC
    let barcode: string | null = null;

    // Pattern 1: meta itemprop="sku" (most reliable on gamersphere)
    const metaSkuMatch = html.match(/<meta\s+itemprop="sku"\s+content="(\d{12,13})"/i);
    if (metaSkuMatch) {
      barcode = metaSkuMatch[1];
    }

    // Pattern 2: Hidden input with sku value
    if (!barcode) {
      const hiddenSkuMatch = html.match(/id="_jstl__\w+_v\d+"\s+value="(\d{12,13})"/);
      if (hiddenSkuMatch) {
        barcode = hiddenSkuMatch[1];
      }
    }

    // Pattern 3: Barcode # in specifications table
    if (!barcode) {
      const barcodeMatch = html.match(/Barcode\s*#[^<]*<[^>]*>(\d{12,13})/i);
      if (barcodeMatch) {
        barcode = barcodeMatch[1].trim();
      }
    }

    // Pattern 4: Image URL containing barcode
    if (!barcode) {
      const imgMatch = html.match(/\/assets\/\w+\/(\d{12,13})\.webp/);
      if (imgMatch) {
        barcode = imgMatch[1];
      }
    }

    // Validate barcode format
    if (barcode && !/^\d{12,13}$/.test(barcode)) {
      barcode = null;
    }

    return { title, modelNumber, barcode };
  } catch (error) {
    console.error(`  Error: ${error}`);
    return null;
  }
}

/**
 * Try to discover more product URLs by exploring category pages
 */
async function discoverProductUrls(): Promise<string[]> {
  const urls = new Set<string>();

  // Try common category patterns
  const categoryUrls = [
    '/paints',
    '/hobby-supplies',
    '/monument-hobbies',
    '/categories/monument',
  ];

  for (const catUrl of categoryUrls) {
    try {
      const response = await fetch(`${CONFIG.baseUrl}${catUrl}`, {
        headers: { 'User-Agent': CONFIG.userAgent },
      });

      if (response.ok) {
        const html = await response.text();
        // Look for Monument product links
        const matches = html.matchAll(/href="\/([^"]*monument[^"]*pro-acryl[^"]*)"/gi);
        for (const match of matches) {
          const slug = match[1].replace(/^\//, '');
          if (!urls.has(slug)) {
            urls.add(slug);
          }
        }
      }
    } catch {
      // Ignore errors during discovery
    }
    await sleep(500);
  }

  return Array.from(urls);
}

async function main(): Promise<void> {
  console.log('Loading paints database...');
  const database = loadPaintsDatabase();

  const monumentPaints = database.paints.filter(
    (p) => p.brand === 'monument_hobbies'
  );
  console.log(`Found ${monumentPaints.length} Monument Hobbies paints in DB`);

  // Focus on paints missing UPCs
  const missingUpc = monumentPaints.filter((p) => !p.ean);
  console.log(`Missing UPCs: ${missingUpc.length}\n`);

  // Generate URL slugs for all missing paints
  console.log('Generating URL candidates for missing paints...');
  const paintUrlMap: { paint: Paint; slugs: string[] }[] = [];
  for (const paint of missingUpc) {
    const slugs = generateUrlSlugs(paint);
    if (slugs.length > 0) {
      paintUrlMap.push({ paint, slugs });
    }
  }

  // Also try category page discovery
  console.log('Discovering additional product URLs...');
  const discoveredUrls = await discoverProductUrls();
  console.log(`Found ${discoveredUrls.length} discovered URLs\n`);

  // Build deduplicated URL list: paint-targeted URLs first, then discovered
  const seenSlugs = new Set<string>();
  const productUrls: { slug: string; targetPaint: Paint | null }[] = [];

  for (const { paint, slugs } of paintUrlMap) {
    for (const slug of slugs) {
      if (!seenSlugs.has(slug)) {
        seenSlugs.add(slug);
        productUrls.push({ slug, targetPaint: paint });
      }
    }
  }

  for (const slug of discoveredUrls) {
    if (!seenSlugs.has(slug)) {
      seenSlugs.add(slug);
      productUrls.push({ slug, targetPaint: null });
    }
  }

  console.log(`Total URLs to try: ${productUrls.length}\n`);

  const results: ScrapedResult[] = [];
  const directMapping: Record<string, string> = {};
  const foundPaintIds = new Set<string>();
  let matched = 0;
  let withBarcode = 0;
  let tried = 0;
  let notFound = 0;

  for (let i = 0; i < productUrls.length; i++) {
    const { slug: urlSlug, targetPaint } = productUrls[i];

    // Skip if we already found a barcode for this target paint
    if (targetPaint && foundPaintIds.has(targetPaint.id)) {
      continue;
    }

    tried++;
    process.stdout.write(`[${tried}] ${urlSlug.slice(0, 60)}... `);

    const data = await scrapeProductPage(urlSlug);
    if (!data) {
      notFound++;
      await sleep(500); // Shorter delay for 404s
      continue;
    }

    // If we have a target paint from URL generation, use it directly
    let paint: Paint | null = targetPaint;
    let confidence: 'exact' | 'high' | 'low' | 'none' = targetPaint
      ? 'exact'
      : 'none';

    // If no target paint, try matching from page content
    if (!paint) {
      const match = matchToPaint(data.title, data.modelNumber, monumentPaints);
      paint = match.paint;
      confidence = match.confidence;
    }

    const result: ScrapedResult = {
      paintId: paint?.id || null,
      paintName: paint?.name || data.title,
      brand: 'monument_hobbies',
      pageTitle: data.title,
      pageUrl: `${CONFIG.baseUrl}/${urlSlug}`,
      modelNumber: data.modelNumber,
      barcode: data.barcode,
      matchConfidence: confidence,
      scrapedAt: new Date().toISOString(),
    };

    results.push(result);

    if (data.barcode) {
      withBarcode++;
      if (paint && confidence !== 'none') {
        if (!directMapping[paint.id]) {
          directMapping[paint.id] = data.barcode;
          foundPaintIds.add(paint.id);
          matched++;
          console.log(`✓ ${data.barcode} → ${paint.name} (${confidence})`);
        }
      } else {
        console.log(`? ${data.barcode} (no match)`);
      }
    } else {
      console.log('no barcode');
    }

    await sleep(CONFIG.requestDelayMs);
  }

  // Output stats
  console.log('\n--- Results ---');
  console.log(`URLs tried: ${tried}`);
  console.log(`Pages found: ${results.length}`);
  console.log(`Not found (404): ${notFound}`);
  console.log(`With barcode: ${withBarcode}`);
  console.log(`Matched to DB: ${matched}`);

  // Ensure output directory exists
  if (!fs.existsSync(CONFIG.outputDir)) {
    fs.mkdirSync(CONFIG.outputDir, { recursive: true });
  }

  // Save direct mapping
  const today = new Date().toISOString().split('T')[0];
  const mappingPath = path.join(
    CONFIG.outputDir,
    `monument_hobbies-gamersphere-ean-mapping-${today}.json`
  );
  fs.writeFileSync(mappingPath, JSON.stringify(directMapping, null, 2));
  console.log(`\nDirect mapping saved to: ${mappingPath}`);

  // Save full results
  const session = {
    brand: 'monument_hobbies',
    source: 'gamersphere.au',
    startedAt: new Date().toISOString(),
    lastUpdatedAt: new Date().toISOString(),
    completedCount: withBarcode,
    matchedCount: matched,
    totalCount: results.length,
    results,
  };

  const outputPath = path.join(
    CONFIG.outputDir,
    `monument_hobbies-gamersphere-${today}.json`
  );
  fs.writeFileSync(outputPath, JSON.stringify(session, null, 2));
  console.log(`Full results saved to: ${outputPath}`);

  console.log('\nRun npm run ean:merge to apply scraped UPCs to paints.json');
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
