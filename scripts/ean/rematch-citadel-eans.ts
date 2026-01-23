/**
 * Re-match Citadel EANs from cached enumeration results
 *
 * This script reads the previously discovered EAN products and re-matches
 * them to the current paints database. Useful when paint IDs change.
 *
 * Usage:
 *   npm run ean:rematch:citadel
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import type { Paint, PaintDatabase } from '../../src/types/paint';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CONFIG = {
  paintsFile: path.join(__dirname, '../../src/data/paints.json'),
  outputDir: path.join(__dirname, '../../data/ean-scrape'),
};

interface FoundProduct {
  ean: string;
  title: string;
  isPaint: boolean;
}

interface EnumeratedResults {
  foundProducts: FoundProduct[];
}

function loadPaintsDatabase(): PaintDatabase {
  const content = fs.readFileSync(CONFIG.paintsFile, 'utf-8');
  return JSON.parse(content) as PaintDatabase;
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
  console.log('Re-matching Citadel EANs from cached enumeration results...\n');

  // Load paints database
  const database = loadPaintsDatabase();
  console.log(`Loaded ${database.paints.length} paints`);

  // Find all enumerated result files
  const files = fs.readdirSync(CONFIG.outputDir).filter((f) => f.startsWith('eandb-enumerated-'));
  console.log(`Found ${files.length} enumeration result files\n`);

  // Collect all found products
  const allProducts: FoundProduct[] = [];

  for (const file of files) {
    const filePath = path.join(CONFIG.outputDir, file);
    const content = fs.readFileSync(filePath, 'utf-8');
    const data = JSON.parse(content) as EnumeratedResults;

    if (data.foundProducts) {
      const paints = data.foundProducts.filter((p) => p.isPaint);
      console.log(`  ${file}: ${paints.length} paint products`);
      allProducts.push(...paints);
    }
  }

  console.log(`\nTotal paint products to match: ${allProducts.length}`);

  // Remove duplicates by EAN
  const uniqueProducts = Array.from(new Map(allProducts.map((p) => [p.ean, p])).values());
  console.log(`Unique paint products: ${uniqueProducts.length}`);

  // Match to paints
  const matches = matchToPaints(uniqueProducts, database.paints);
  console.log(`\nMatched ${matches.length} to Citadel paints:`);

  for (const m of matches) {
    console.log(`  ${m.ean} → ${m.paintName} (${m.productLine})`);
  }

  // Save direct mapping
  const mapping: Record<string, string> = {};
  for (const m of matches) {
    mapping[m.paintId] = m.ean;
  }

  const mappingPath = path.join(CONFIG.outputDir, `citadel-ean-mapping-${new Date().toISOString().split('T')[0]}.json`);
  fs.writeFileSync(mappingPath, JSON.stringify(mapping, null, 2));
  console.log(`\nMapping saved to: ${mappingPath}`);
  console.log(`\nRun npm run ean:merge to apply EANs to paints.json`);
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
