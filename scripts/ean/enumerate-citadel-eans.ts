/**
 * Enumerate Citadel Paint EANs
 *
 * Since 404s are free on EAN-DB, we can enumerate possible EANs
 * in the known Citadel paint range and see what we find.
 *
 * Known paint EANs:
 * - Abaddon Black: 5011921026524
 * - Administratum Grey: 5011921027798
 * - Blood For The Blood God: 5011921028276
 *
 * These suggest paints are in the 5011921026xxx - 5011921029xxx range
 *
 * Usage:
 *   npm run ean:enumerate:citadel
 *   npm run ean:enumerate:citadel -- --start=026000 --end=026100
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import type { Paint, PaintDatabase } from '../../src/types/paint';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const CONFIG = {
  apiUrl: 'https://ean-db.com/api/v2/product',
  paintsFile: path.join(__dirname, '../../src/data/paints.json'),
  outputDir: path.join(__dirname, '../../data/ean-scrape'),
  requestDelayMs: 300, // Faster since 404s are free
  gwPrefix: '5011921', // Games Workshop GS1 prefix
};

// Types
interface EanDbProduct {
  barcode: string;
  titles: Record<string, string>;
  manufacturer?: { name?: string };
  categories?: Array<{ name: string }>;
}

interface EanDbResponse {
  balance: number;
  product: EanDbProduct;
}

interface FoundProduct {
  ean: string;
  title: string;
  isPaint: boolean;
}

// Utility
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function loadPaintsDatabase(): PaintDatabase {
  const content = fs.readFileSync(CONFIG.paintsFile, 'utf-8');
  return JSON.parse(content) as PaintDatabase;
}

/**
 * Calculate EAN-13 check digit
 */
function calculateEan13CheckDigit(first12: string): number {
  const digits = first12.split('').map(Number);
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    sum += digits[i] * (i % 2 === 0 ? 1 : 3);
  }
  return (10 - (sum % 10)) % 10;
}

/**
 * Generate valid EAN-13 from GW prefix + 5-digit item code
 */
function generateEan(itemCode: string): string {
  const first12 = CONFIG.gwPrefix + itemCode;
  const checkDigit = calculateEan13CheckDigit(first12);
  return first12 + checkDigit;
}

/**
 * Check if a product title looks like a paint
 */
function looksLikePaint(title: string): boolean {
  const paintKeywords = [
    'paint',
    'base',
    'layer',
    'shade',
    'contrast',
    'technical',
    'dry',
    'air',
    'spray',
    'primer',
    'wash',
    'glaze',
    'citadel',
    'colour',
    'color',
  ];
  const titleLower = title.toLowerCase();
  return paintKeywords.some((kw) => titleLower.includes(kw));
}

/**
 * Look up a single EAN
 */
async function lookupEan(
  ean: string,
  jwt: string
): Promise<{ found: boolean; title?: string; balance?: number }> {
  const url = `${CONFIG.apiUrl}/${ean}`;

  try {
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${jwt}`,
        Accept: 'application/json',
      },
    });

    if (response.status === 404) {
      return { found: false };
    }

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`API error ${response.status}: ${text}`);
    }

    const data = (await response.json()) as EanDbResponse;
    const titles = data.product.titles || {};
    const title = titles['en'] || titles['en-US'] || Object.values(titles)[0] || '';

    return { found: true, title, balance: data.balance };
  } catch (error) {
    console.error(`Error: ${error}`);
    return { found: false };
  }
}

/**
 * Match found products to paints
 */
function matchToPaints(
  products: FoundProduct[],
  paints: Paint[]
): Array<{ paintId: string; paintName: string; productLine: string; ean: string; title: string }> {
  const citadelPaints = paints.filter((p) => p.brand === 'citadel');
  const matches: Array<{
    paintId: string;
    paintName: string;
    productLine: string;
    ean: string;
    title: string;
  }> = [];

  for (const product of products) {
    if (!product.isPaint) continue;

    const titleLower = product.title.toLowerCase();
    let bestMatch: Paint | null = null;
    let bestScore = 0;

    for (const paint of citadelPaints) {
      const nameLower = paint.name.toLowerCase();

      // Check for name in title
      if (titleLower.includes(nameLower)) {
        const score = nameLower.length;
        if (score > bestScore) {
          bestMatch = paint;
          bestScore = score;
        }
      }
    }

    if (bestMatch) {
      matches.push({
        paintId: bestMatch.id,
        paintName: bestMatch.name,
        productLine: bestMatch.productLine,
        ean: product.ean,
        title: product.title,
      });
    }
  }

  return matches;
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);

  // Parse range arguments
  const startArg = args.find((a) => a.startsWith('--start='));
  const endArg = args.find((a) => a.startsWith('--end='));

  // Default to the range where we know paints exist: 026000 - 030000
  const startCode = parseInt(startArg?.split('=')[1] || '026000', 10);
  const endCode = parseInt(endArg?.split('=')[1] || '030000', 10);

  const jwt =
    process.env.EAN_DB_JWT ||
    'eyJhbGciOiJIUzUxMiJ9.eyJqdGkiOiI2NjZiZGIzNy01MjdjLTQ3OWItODJjYi0wZTc5ZTMxMTJhOTYiLCJzdWIiOiI2MjRhZTVkZi1mZDE5LTQwMWMtYTJiZC0xYWM4NjMxNWE1MTYiLCJpc3MiOiJjb20uZWFuLWRiIiwiaWF0IjoxNzY5MDI0MTQzLCJleHAiOjE4MDA1NjAxNDMsImlzQXBpIjoidHJ1ZSJ9.Xg7SzgUiCYGEzek6ewTrpNC-pmmSy1pamxZjYM4SCF8olM_Fp1oGJd1NtK1-T4AkO3LSpILlmUg0jXtwVfsKDQ';

  console.log(`Enumerating Citadel EANs from ${startCode.toString().padStart(6, '0')} to ${endCode.toString().padStart(6, '0')}`);
  console.log(`This will check ${endCode - startCode} potential EANs`);
  console.log('404s are FREE - only hits count against balance\n');

  const foundProducts: FoundProduct[] = [];
  let lastBalance: number | undefined;
  let checkedCount = 0;
  let foundCount = 0;
  let paintCount = 0;

  for (let code = startCode; code < endCode; code++) {
    const itemCode = code.toString().padStart(5, '0');
    const ean = generateEan(itemCode);

    checkedCount++;
    if (checkedCount % 100 === 0) {
      process.stdout.write(`\r[${checkedCount}/${endCode - startCode}] Checked... Found: ${foundCount} products, ${paintCount} paints`);
    }

    const result = await lookupEan(ean, jwt);

    if (result.found && result.title) {
      foundCount++;
      const isPaint = looksLikePaint(result.title);
      if (isPaint) paintCount++;

      foundProducts.push({
        ean,
        title: result.title,
        isPaint,
      });

      console.log(`\n  FOUND: ${ean} - "${result.title}" ${isPaint ? '[PAINT]' : ''}`);

      if (result.balance !== undefined) {
        lastBalance = result.balance;
      }
    }

    await sleep(CONFIG.requestDelayMs);

    // Safety: stop if balance gets low
    if (lastBalance !== undefined && lastBalance < 50) {
      console.log(`\n\nStopping - balance low: ${lastBalance}`);
      break;
    }
  }

  console.log('\n\n' + '='.repeat(60));
  console.log('ENUMERATION SUMMARY');
  console.log('='.repeat(60));
  console.log(`EANs checked:     ${checkedCount}`);
  console.log(`Products found:   ${foundCount}`);
  console.log(`Paints found:     ${paintCount}`);
  if (lastBalance !== undefined) {
    console.log(`API balance:      ${lastBalance}`);
  }

  // Show all found products
  if (foundProducts.length > 0) {
    console.log('\nFound products:');
    for (const p of foundProducts) {
      console.log(`  ${p.ean}: ${p.title} ${p.isPaint ? '[PAINT]' : ''}`);
    }
  }

  // Match paints
  if (paintCount > 0) {
    console.log('\nMatching to database...');
    const database = loadPaintsDatabase();
    const matches = matchToPaints(foundProducts, database.paints);

    console.log(`\nMatched ${matches.length} to Citadel paints:`);
    for (const m of matches) {
      console.log(`  ${m.ean} → ${m.paintName} (${m.productLine})`);
    }

    // Save results
    const outputPath = path.join(
      CONFIG.outputDir,
      `eandb-enumerated-${startCode}-${endCode}-${new Date().toISOString().split('T')[0]}.json`
    );

    fs.writeFileSync(
      outputPath,
      JSON.stringify(
        {
          source: 'ean-db-enumeration',
          range: { start: startCode, end: endCode },
          queriedAt: new Date().toISOString(),
          stats: { checked: checkedCount, found: foundCount, paints: paintCount, matched: matches.length },
          foundProducts,
          matches,
        },
        null,
        2
      )
    );
    console.log(`\nResults saved to: ${outputPath}`);

    // Save direct mapping
    if (matches.length > 0) {
      const existingMappingPath = path.join(CONFIG.outputDir, `citadel-ean-mapping-${new Date().toISOString().split('T')[0]}.json`);
      let mapping: Record<string, string> = {};

      if (fs.existsSync(existingMappingPath)) {
        mapping = JSON.parse(fs.readFileSync(existingMappingPath, 'utf-8'));
      }

      for (const m of matches) {
        mapping[m.paintId] = m.ean;
      }

      fs.writeFileSync(existingMappingPath, JSON.stringify(mapping, null, 2));
      console.log(`Mapping updated: ${existingMappingPath}`);
    }
  }
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
