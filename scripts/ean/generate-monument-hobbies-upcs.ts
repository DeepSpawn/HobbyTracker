/**
 * Generate Monument Hobbies UPCs from SKU
 *
 * Monument Hobbies is a US company using UPC-A (12-digit) barcodes.
 * Based on discovered pattern:
 *
 * Confirmed UPCs:
 *   - 030 (Dark Silver)     → 628504411308
 *   - 033 (Metallic Medium) → 628504411339
 *
 * Formula: 62850441 + 1 + [2-digit code] + check_digit
 *   - 62850441 = Company prefix (8 digits)
 *   - 1 = Product line identifier
 *   - 2-digit code = From SKU (030 → 30, 033 → 33)
 *   - check_digit = UPC-A check digit
 *
 * Limitations:
 *   - Only works for numeric SKUs (001-075)
 *   - Signature Series (S##), Fluorescent (F##), PRIME (###P), and
 *     Wash codes (200-202) use unknown patterns
 *
 * Usage:
 *   npm run ean:generate:monument-hobbies
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
  monumentPrefix: '62850441',
  productLineDigit: '1',
};

/**
 * Calculate UPC-A check digit
 * UPC-A: multiply odd positions by 3, even by 1
 */
function calculateUpcCheckDigit(first11: string): number {
  if (first11.length !== 11) {
    throw new Error(`Expected 11 digits, got ${first11.length}`);
  }

  const digits = first11.split('').map(Number);
  let oddSum = 0;
  let evenSum = 0;

  for (let i = 0; i < 11; i++) {
    // Position is 1-indexed, so i=0 is position 1 (odd)
    if ((i + 1) % 2 === 1) {
      oddSum += digits[i];
    } else {
      evenSum += digits[i];
    }
  }

  const total = oddSum * 3 + evenSum;
  return (10 - (total % 10)) % 10;
}

/**
 * Generate UPC-A from Monument Hobbies SKU
 */
function generateMonumentUpc(sku: string): string | null {
  // Only numeric codes 001-099 for now (standard Pro Acryl Paints)
  // Match 3-digit numeric codes like "001", "030", "075"
  const numericMatch = sku.match(/^0(\d{2})$/);
  if (numericMatch) {
    const twoDigitCode = numericMatch[1];
    const first11 = CONFIG.monumentPrefix + CONFIG.productLineDigit + twoDigitCode;
    const checkDigit = calculateUpcCheckDigit(first11);
    return first11 + checkDigit;
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
 * Main function
 */
async function main(): Promise<void> {
  console.log('Loading paints database...');
  const database = loadPaintsDatabase();

  // Filter Monument Hobbies paints
  const monumentPaints = database.paints.filter((p) => p.brand === 'monument_hobbies');
  console.log(`Found ${monumentPaints.length} Monument Hobbies paints\n`);

  // Generate UPCs
  const results: Array<{
    paintId: string;
    paintName: string;
    brand: string;
    productLine: string;
    sku: string | null;
    upc: string | null;
    status: 'generated' | 'unsupported_sku' | 'no_sku';
  }> = [];

  let generated = 0;
  let unsupportedSku = 0;
  let noSku = 0;

  const skuStats = {
    numeric: 0,
    signature: 0,
    fluorescent: 0,
    prime: 0,
    wash: 0,
    other: 0,
  };

  for (const paint of monumentPaints) {
    if (!paint.sku) {
      results.push({
        paintId: paint.id,
        paintName: paint.name,
        brand: paint.brand,
        productLine: paint.productLine,
        sku: null,
        upc: null,
        status: 'no_sku',
      });
      noSku++;
      continue;
    }

    const upc = generateMonumentUpc(paint.sku);

    if (upc) {
      results.push({
        paintId: paint.id,
        paintName: paint.name,
        brand: paint.brand,
        productLine: paint.productLine,
        sku: paint.sku,
        upc,
        status: 'generated',
      });
      generated++;
      skuStats.numeric++;
    } else {
      results.push({
        paintId: paint.id,
        paintName: paint.name,
        brand: paint.brand,
        productLine: paint.productLine,
        sku: paint.sku,
        upc: null,
        status: 'unsupported_sku',
      });
      unsupportedSku++;

      // Track SKU type
      if (paint.sku.startsWith('S')) {
        skuStats.signature++;
      } else if (paint.sku.startsWith('F')) {
        skuStats.fluorescent++;
      } else if (paint.sku.endsWith('P')) {
        skuStats.prime++;
      } else if (paint.sku.startsWith('2')) {
        skuStats.wash++;
      } else {
        skuStats.other++;
      }
    }
  }

  // Output stats
  console.log('Generation Results:');
  console.log(`  Generated: ${generated} (numeric codes 001-099)`);
  console.log(`  Unsupported SKU format: ${unsupportedSku}`);
  console.log(`    - Signature Series (S##): ${skuStats.signature}`);
  console.log(`    - Fluorescent (F##): ${skuStats.fluorescent}`);
  console.log(`    - PRIME (###P): ${skuStats.prime}`);
  console.log(`    - Wash (200-202): ${skuStats.wash}`);
  console.log(`    - Other: ${skuStats.other}`);
  console.log(`  No SKU: ${noSku}`);
  console.log();

  // Show examples
  console.log('Sample generated UPCs:');
  const samples = results.filter((r) => r.status === 'generated').slice(0, 10);
  for (const sample of samples) {
    console.log(`  ${sample.sku} → ${sample.upc} (${sample.paintName})`);
  }
  console.log();

  // Show validation targets
  console.log('VALIDATION TARGETS (please verify against physical products/retailers):');
  const validationTargets = [
    { sku: '001', name: 'Bold Titanium White' },
    { sku: '002', name: 'Coal Black' },
    { sku: '005', name: 'Blue' },
  ];
  for (const target of validationTargets) {
    const result = results.find((r) => r.sku === target.sku);
    if (result && result.upc) {
      console.log(`  ${target.sku} (${target.name}): ${result.upc}`);
    }
  }
  console.log();

  // Ensure output directory exists
  if (!fs.existsSync(CONFIG.outputDir)) {
    fs.mkdirSync(CONFIG.outputDir, { recursive: true });
  }

  // Save direct mapping for merge script (using 'ean' field for compatibility)
  const directMapping: Record<string, string> = {};
  for (const r of results) {
    if (r.status === 'generated' && r.upc) {
      directMapping[r.paintId] = r.upc;
    }
  }

  const mappingPath = path.join(
    CONFIG.outputDir,
    `monument_hobbies-ean-mapping-${new Date().toISOString().split('T')[0]}.json`
  );
  fs.writeFileSync(mappingPath, JSON.stringify(directMapping, null, 2));
  console.log(`Direct mapping saved to: ${mappingPath}`);

  // Save full results
  const session = {
    brand: 'monument_hobbies',
    source: 'sku-generated',
    formula: 'UPC = 62850441 + 1 + [2-digit code] + check',
    startedAt: new Date().toISOString(),
    lastUpdatedAt: new Date().toISOString(),
    completedCount: generated,
    totalCount: monumentPaints.length,
    results: results.filter((r) => r.status === 'generated'),
  };

  const outputPath = path.join(
    CONFIG.outputDir,
    `monument_hobbies-generated-${new Date().toISOString().split('T')[0]}.json`
  );
  fs.writeFileSync(outputPath, JSON.stringify(session, null, 2));
  console.log(`Full results saved to: ${outputPath}`);

  console.log('\nRun npm run ean:merge to apply generated UPCs to paints.json');
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
