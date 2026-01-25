/**
 * Generate Vallejo EANs from SKU
 *
 * Vallejo paints have predictable EANs based on their SKU:
 * - Company prefix: 8429551 (Acrylicos Vallejo S.A.)
 * - Item code: SKU with dot removed (e.g., 70.913 → 70913)
 * - Check digit: Calculated using EAN-13 algorithm
 *
 * Example: Model Color Yellow Ochre
 *   SKU: 70.913
 *   EAN: 8429551 + 70913 + check_digit = 8429551709132
 *
 * Usage:
 *   npm run ean:generate:vallejo
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
  vallejoPrefix: '8429551',
};

/**
 * Calculate EAN-13 check digit
 */
function calculateEan13CheckDigit(first12: string): number {
  if (first12.length !== 12) {
    throw new Error(`Expected 12 digits, got ${first12.length}`);
  }

  const digits = first12.split('').map(Number);
  let sum = 0;

  for (let i = 0; i < 12; i++) {
    // Odd positions (0, 2, 4...) multiply by 1
    // Even positions (1, 3, 5...) multiply by 3
    sum += digits[i] * (i % 2 === 0 ? 1 : 3);
  }

  return (10 - (sum % 10)) % 10;
}

/**
 * Generate EAN-13 from Vallejo SKU
 */
function generateVallejoEan(sku: string): string | null {
  // SKU format: XX.XXX (e.g., 70.913, 72.040)
  if (!/^\d{2}\.\d{3}$/.test(sku)) {
    return null;
  }

  // Remove dot to get 5-digit item code
  const itemCode = sku.replace('.', '');

  // Combine prefix + item code
  const first12 = CONFIG.vallejoPrefix + itemCode;

  // Calculate check digit
  const checkDigit = calculateEan13CheckDigit(first12);

  return first12 + checkDigit;
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

  // Filter Vallejo paints
  const vallejoPaints = database.paints.filter((p) => p.brand === 'vallejo');
  console.log(`Found ${vallejoPaints.length} Vallejo paints\n`);

  // Generate EANs
  const results: Array<{
    paintId: string;
    paintName: string;
    brand: string;
    productLine: string;
    sku: string | null;
    ean: string | null;
    status: 'generated' | 'invalid_sku' | 'no_sku';
  }> = [];

  let generated = 0;
  let invalidSku = 0;
  let noSku = 0;

  for (const paint of vallejoPaints) {
    if (!paint.sku) {
      results.push({
        paintId: paint.id,
        paintName: paint.name,
        brand: paint.brand,
        productLine: paint.productLine,
        sku: null,
        ean: null,
        status: 'no_sku',
      });
      noSku++;
      continue;
    }

    const ean = generateVallejoEan(paint.sku);

    if (ean) {
      results.push({
        paintId: paint.id,
        paintName: paint.name,
        brand: paint.brand,
        productLine: paint.productLine,
        sku: paint.sku,
        ean,
        status: 'generated',
      });
      generated++;
    } else {
      results.push({
        paintId: paint.id,
        paintName: paint.name,
        brand: paint.brand,
        productLine: paint.productLine,
        sku: paint.sku,
        ean: null,
        status: 'invalid_sku',
      });
      invalidSku++;
    }
  }

  // Output stats
  console.log('Generation Results:');
  console.log(`  Generated: ${generated}`);
  console.log(`  Invalid SKU format: ${invalidSku}`);
  console.log(`  No SKU: ${noSku}`);
  console.log();

  // Show examples
  console.log('Sample generated EANs:');
  const samples = results.filter((r) => r.status === 'generated').slice(0, 10);
  for (const sample of samples) {
    console.log(`  ${sample.sku} → ${sample.ean} (${sample.paintName})`);
  }
  console.log();

  // Show paints with invalid/missing SKUs
  if (invalidSku > 0) {
    console.log('Paints with invalid SKU format:');
    const invalid = results.filter((r) => r.status === 'invalid_sku').slice(0, 5);
    for (const item of invalid) {
      console.log(`  "${item.sku}" - ${item.paintName} (${item.productLine})`);
    }
    console.log();
  }

  // Save in matcher-compatible format
  const matcherResults = results
    .filter((r) => r.status === 'generated')
    .map((r) => ({
      paintId: r.paintId,
      paintName: r.paintName,
      brand: r.brand,
      productLine: r.productLine,
      searchQuery: `${r.brand} ${r.paintName}`,
      results: [{ ean: r.ean!, title: r.paintName, brand: r.brand }],
      scrapedAt: new Date().toISOString(),
    }));

  const session = {
    brand: 'vallejo',
    source: 'sku-generated',
    startedAt: new Date().toISOString(),
    lastUpdatedAt: new Date().toISOString(),
    completedCount: generated,
    totalCount: vallejoPaints.length,
    results: matcherResults,
  };

  // Ensure output directory exists
  if (!fs.existsSync(CONFIG.outputDir)) {
    fs.mkdirSync(CONFIG.outputDir, { recursive: true });
  }

  const outputPath = path.join(
    CONFIG.outputDir,
    `vallejo-generated-${new Date().toISOString().split('T')[0]}.json`
  );
  fs.writeFileSync(outputPath, JSON.stringify(session, null, 2));
  console.log(`Results saved to: ${outputPath}`);

  // Also save direct mapping for merge script
  const directMapping: Record<string, string> = {};
  for (const r of results) {
    if (r.status === 'generated' && r.ean) {
      directMapping[r.paintId] = r.ean;
    }
  }

  const mappingPath = path.join(
    CONFIG.outputDir,
    `vallejo-ean-mapping-${new Date().toISOString().split('T')[0]}.json`
  );
  fs.writeFileSync(mappingPath, JSON.stringify(directMapping, null, 2));
  console.log(`Direct mapping saved to: ${mappingPath}`);

  console.log('\nRun npm run ean:merge to apply generated EANs to paints.json');
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
