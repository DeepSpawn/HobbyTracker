/**
 * EAN-DB API Lookup Script
 *
 * Looks up EANs using the EAN-DB API to get product details.
 * 404 responses do NOT count against the API balance.
 *
 * Usage:
 *   npm run ean:lookup:eandb
 *   npm run ean:lookup:eandb -- --test          # Test with known EANs only
 *   npm run ean:lookup:eandb -- --ean=5011921026524  # Look up single EAN
 *
 * Environment:
 *   EAN_DB_JWT - JWT token for EAN-DB API authentication
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
  bulkFile: path.join(__dirname, '../../data/ean-scrape/bulk-citadel-2026-01-21.json'),
  outputDir: path.join(__dirname, '../../data/ean-scrape'),
  requestDelayMs: 500, // Be polite to the API
};

// Known test EANs for validation
const TEST_EANS = [
  { ean: '5011921026524', expectedName: 'Abaddon Black' },
  { ean: '5011921027798', expectedName: 'Administratum Grey' },
];

// Types
interface EanDbProduct {
  barcode: string;
  titles: Record<string, string>;
  manufacturer?: {
    name?: string;
  };
  categories?: Array<{ name: string }>;
}

interface EanDbResponse {
  balance: number;
  product: EanDbProduct;
}

interface LookupResult {
  ean: string;
  found: boolean;
  title?: string;
  manufacturer?: string;
  category?: string;
  rawResponse?: EanDbProduct;
}

// Utility functions
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function loadPaintsDatabase(): PaintDatabase {
  const content = fs.readFileSync(CONFIG.paintsFile, 'utf-8');
  return JSON.parse(content) as PaintDatabase;
}

interface BulkScrapeData {
  brand: string;
  products: Array<{ ean: string; title: string; url: string }>;
}

function loadBulkEans(): string[] {
  if (!fs.existsSync(CONFIG.bulkFile)) {
    console.warn(`Bulk file not found: ${CONFIG.bulkFile}`);
    return [];
  }
  const content = fs.readFileSync(CONFIG.bulkFile, 'utf-8');
  const data = JSON.parse(content) as BulkScrapeData;
  return data.products.map((p) => p.ean);
}

/**
 * Look up a single EAN via EAN-DB API
 */
async function lookupEan(ean: string, jwt: string): Promise<{ result: LookupResult; balance?: number }> {
  const url = `${CONFIG.apiUrl}/${ean}`;

  try {
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${jwt}`,
        Accept: 'application/json',
      },
    });

    if (response.status === 404) {
      // Not found - doesn't count against balance
      return {
        result: { ean, found: false },
      };
    }

    if (response.status === 403) {
      const text = await response.text();
      throw new Error(`API access denied: ${text}`);
    }

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`API error ${response.status}: ${text}`);
    }

    const data = (await response.json()) as EanDbResponse;

    // Extract the best title (prefer English)
    const titles = data.product.titles || {};
    const title = titles['en'] || titles['en-US'] || titles['en-GB'] || Object.values(titles)[0] || '';

    return {
      result: {
        ean,
        found: true,
        title,
        manufacturer: data.product.manufacturer?.name,
        category: data.product.categories?.[0]?.name,
        rawResponse: data.product,
      },
      balance: data.balance,
    };
  } catch (error) {
    if (error instanceof Error && error.message.includes('API')) {
      throw error;
    }
    console.error(`  Error looking up ${ean}:`, error);
    return {
      result: { ean, found: false },
    };
  }
}

/**
 * Match lookup results to paints
 */
function matchToPaints(
  results: LookupResult[],
  paints: Paint[]
): Array<{
  paintId: string;
  paintName: string;
  productLine: string;
  ean: string;
  matchedTitle: string;
  confidence: 'exact' | 'high' | 'low';
}> {
  const matches: Array<{
    paintId: string;
    paintName: string;
    productLine: string;
    ean: string;
    matchedTitle: string;
    confidence: 'exact' | 'high' | 'low';
  }> = [];

  const citadelPaints = paints.filter((p) => p.brand === 'citadel');

  for (const result of results) {
    if (!result.found || !result.title) continue;

    const titleLower = result.title.toLowerCase();

    // Find best matching paint
    let bestMatch: { paint: Paint; score: number } | null = null;

    for (const paint of citadelPaints) {
      const nameLower = paint.name.toLowerCase();

      // Exact name match
      if (titleLower.includes(nameLower)) {
        const score = nameLower.length; // Longer names are more specific
        if (!bestMatch || score > bestMatch.score) {
          bestMatch = { paint, score: score + 10 }; // Boost for substring match
        }
      }

      // Word overlap matching
      const titleWords = titleLower.split(/[\s\-_,]+/).filter((w) => w.length > 2);
      const nameWords = nameLower.split(/[\s\-_,]+/).filter((w) => w.length > 2);
      const overlap = nameWords.filter((w) => titleWords.includes(w)).length;

      if (overlap >= 2 && (!bestMatch || overlap > bestMatch.score)) {
        bestMatch = { paint, score: overlap };
      }
    }

    if (bestMatch) {
      const confidence = bestMatch.score >= 10 ? 'exact' : bestMatch.score >= 3 ? 'high' : 'low';
      matches.push({
        paintId: bestMatch.paint.id,
        paintName: bestMatch.paint.name,
        productLine: bestMatch.paint.productLine,
        ean: result.ean,
        matchedTitle: result.title,
        confidence,
      });
    }
  }

  return matches;
}

/**
 * Main function
 */
async function main(): Promise<void> {
  // Parse CLI arguments
  const args = process.argv.slice(2);
  const testOnly = args.includes('--test');
  const singleEanArg = args.find((a) => a.startsWith('--ean='));
  const singleEan = singleEanArg?.split('=')[1];

  // Get JWT from environment or use provided one
  const jwt =
    process.env.EAN_DB_JWT ||
    'eyJhbGciOiJIUzUxMiJ9.eyJqdGkiOiI2NjZiZGIzNy01MjdjLTQ3OWItODJjYi0wZTc5ZTMxMTJhOTYiLCJzdWIiOiI2MjRhZTVkZi1mZDE5LTQwMWMtYTJiZC0xYWM4NjMxNWE1MTYiLCJpc3MiOiJjb20uZWFuLWRiIiwiaWF0IjoxNzY5MDI0MTQzLCJleHAiOjE4MDA1NjAxNDMsImlzQXBpIjoidHJ1ZSJ9.Xg7SzgUiCYGEzek6ewTrpNC-pmmSy1pamxZjYM4SCF8olM_Fp1oGJd1NtK1-T4AkO3LSpILlmUg0jXtwVfsKDQ';

  if (!jwt) {
    console.error('EAN_DB_JWT environment variable not set');
    process.exit(1);
  }

  // Determine which EANs to look up
  let eansToLookup: string[] = [];

  if (singleEan) {
    console.log(`Looking up single EAN: ${singleEan}\n`);
    eansToLookup = [singleEan];
  } else if (testOnly) {
    console.log('Running test mode with known EANs...\n');
    eansToLookup = TEST_EANS.map((t) => t.ean);
  } else {
    console.log('Loading bulk-scraped Citadel EANs...');
    eansToLookup = loadBulkEans();
    console.log(`Found ${eansToLookup.length} EANs to look up\n`);
  }

  if (eansToLookup.length === 0) {
    console.log('No EANs to look up');
    return;
  }

  // Look up EANs
  const results: LookupResult[] = [];
  let lastBalance: number | undefined;
  let foundCount = 0;
  let notFoundCount = 0;

  console.log('Looking up EANs via EAN-DB API...\n');

  for (let i = 0; i < eansToLookup.length; i++) {
    const ean = eansToLookup[i];
    process.stdout.write(`[${i + 1}/${eansToLookup.length}] ${ean}... `);

    try {
      const { result, balance } = await lookupEan(ean, jwt);
      results.push(result);

      if (balance !== undefined) {
        lastBalance = balance;
      }

      if (result.found) {
        foundCount++;
        console.log(`FOUND: "${result.title?.substring(0, 50)}..."`);
      } else {
        notFoundCount++;
        console.log('not found (free)');
      }

      // Rate limit
      if (i < eansToLookup.length - 1) {
        await sleep(CONFIG.requestDelayMs);
      }
    } catch (error) {
      console.error(`ERROR: ${error}`);
      if (error instanceof Error && error.message.includes('access denied')) {
        console.error('\nStopping due to API error.');
        break;
      }
    }
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('LOOKUP SUMMARY');
  console.log('='.repeat(60));
  console.log(`Total queried:  ${results.length}`);
  console.log(`Found:          ${foundCount}`);
  console.log(`Not found:      ${notFoundCount} (free)`);
  if (lastBalance !== undefined) {
    console.log(`API balance:    ${lastBalance} remaining`);
  }

  // If test mode, verify results
  if (testOnly) {
    console.log('\nTest validation:');
    for (const test of TEST_EANS) {
      const result = results.find((r) => r.ean === test.ean);
      const passed = result?.found && result.title?.toLowerCase().includes(test.expectedName.toLowerCase());
      console.log(`  ${test.ean}: ${passed ? 'PASS' : 'FAIL'} (expected "${test.expectedName}")`);
      if (result?.title) {
        console.log(`    Got: "${result.title}"`);
      }
    }
    return;
  }

  // Match to paints
  if (foundCount > 0) {
    console.log('\nMatching to Citadel paints...');
    const database = loadPaintsDatabase();
    const matches = matchToPaints(results, database.paints);

    console.log(`\nMatched ${matches.length} EANs to paints:`);
    for (const match of matches) {
      console.log(`  ${match.ean} → ${match.paintName} (${match.productLine}) [${match.confidence}]`);
    }

    // Save results
    const outputPath = path.join(CONFIG.outputDir, `eandb-citadel-${new Date().toISOString().split('T')[0]}.json`);

    const output = {
      source: 'ean-db',
      queriedAt: new Date().toISOString(),
      stats: {
        totalQueried: results.length,
        found: foundCount,
        notFound: notFoundCount,
        matched: matches.length,
        apiBalance: lastBalance,
      },
      results: results.filter((r) => r.found),
      matches,
    };

    fs.writeFileSync(outputPath, JSON.stringify(output, null, 2));
    console.log(`\nResults saved to: ${outputPath}`);

    // Save direct mapping for merge script
    if (matches.length > 0) {
      const mapping: Record<string, string> = {};
      for (const match of matches) {
        mapping[match.paintId] = match.ean;
      }

      const mappingPath = path.join(
        CONFIG.outputDir,
        `citadel-ean-mapping-${new Date().toISOString().split('T')[0]}.json`
      );
      fs.writeFileSync(mappingPath, JSON.stringify(mapping, null, 2));
      console.log(`Direct mapping saved to: ${mappingPath}`);
      console.log('\nRun npm run ean:merge to apply these EANs');
    }
  }
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
