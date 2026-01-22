/**
 * Generate Army Painter EANs from SKU
 *
 * Army Painter paints have predictable EANs based on their SKU:
 * - Company prefix: 5713799 (The Army Painter, Denmark)
 * - Item code: 4-digit SKU number + type digit
 * - Type digit: 0 for WP (Warpaints), 1 for CP (Colour Primer)
 * - Check digit: Calculated using EAN-13 algorithm
 *
 * Examples:
 *   WP1129 (Shining Silver) → 5713799 + 1129 + 0 + 2 = 5713799112902
 *   CP3001 (Matt Black)     → 5713799 + 3001 + 1 + 8 = 5713799300118
 *
 * Usage:
 *   npm run ean:generate:army-painter
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
  armyPainterPrefix: '5713799',
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
 * Generate EAN-13 from Army Painter SKU
 */
function generateArmyPainterEan(sku: string): string | null {
  // WP format: WP1101-WP1731 (Warpaints)
  const wpMatch = sku.match(/^WP(\d{4})$/);
  if (wpMatch) {
    const first12 = CONFIG.armyPainterPrefix + wpMatch[1] + '0';
    const checkDigit = calculateEan13CheckDigit(first12);
    return first12 + checkDigit;
  }

  // CP format: CP3001-CP3027 (Colour Primer)
  const cpMatch = sku.match(/^CP(\d{4})$/);
  if (cpMatch) {
    const first12 = CONFIG.armyPainterPrefix + cpMatch[1] + '1';
    const checkDigit = calculateEan13CheckDigit(first12);
    return first12 + checkDigit;
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

  // Filter Army Painter paints
  const armyPainterPaints = database.paints.filter((p) => p.brand === 'army_painter');
  console.log(`Found ${armyPainterPaints.length} Army Painter paints\n`);

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

  const skuStats = {
    wp: 0,
    cp: 0,
    other: 0,
  };

  for (const paint of armyPainterPaints) {
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

    const ean = generateArmyPainterEan(paint.sku);

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

      // Track SKU type
      if (paint.sku.startsWith('WP')) {
        skuStats.wp++;
      } else if (paint.sku.startsWith('CP')) {
        skuStats.cp++;
      } else {
        skuStats.other++;
      }
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
  console.log(`    - WP (Warpaints): ${skuStats.wp}`);
  console.log(`    - CP (Colour Primer): ${skuStats.cp}`);
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
    brand: 'army_painter',
    source: 'sku-generated',
    startedAt: new Date().toISOString(),
    lastUpdatedAt: new Date().toISOString(),
    completedCount: generated,
    totalCount: armyPainterPaints.length,
    results: matcherResults,
  };

  // Ensure output directory exists
  if (!fs.existsSync(CONFIG.outputDir)) {
    fs.mkdirSync(CONFIG.outputDir, { recursive: true });
  }

  const outputPath = path.join(
    CONFIG.outputDir,
    `army_painter-generated-${new Date().toISOString().split('T')[0]}.json`
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
    `army_painter-ean-mapping-${new Date().toISOString().split('T')[0]}.json`
  );
  fs.writeFileSync(mappingPath, JSON.stringify(directMapping, null, 2));
  console.log(`Direct mapping saved to: ${mappingPath}`);

  console.log('\nRun npm run ean:merge to apply generated EANs to paints.json');
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
