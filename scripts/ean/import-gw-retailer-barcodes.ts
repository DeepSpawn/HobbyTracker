/**
 * Import GW Retailer Barcodes
 *
 * Imports official Games Workshop barcode data from the retailer spreadsheet.
 * Matches paint names to existing database entries and outputs EAN mappings.
 *
 * Input: GW retailer Excel spreadsheet with columns:
 *   Range, PRODUCT NAME, SIZE, SSC, Pack Code, Barcode (6-Pack), Unit Code, Barcode (Single)
 *
 * Outputs:
 * - data/ean-scrape/gw-retailer-matches-YYYY-MM-DD.json - Successful matches
 * - data/ean-scrape/gw-retailer-unmatched-YYYY-MM-DD.json - New paints to add
 * - data/ean-scrape/citadel-ean-mapping-YYYY-MM-DD.json - Direct paintId→EAN mapping
 *
 * Usage:
 *   npm run ean:import:gw-retailer -- /path/to/spreadsheet.xlsx
 *   npm run ean:import:gw-retailer -- /path/to/spreadsheet.xlsx --merge
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import XLSX from 'xlsx';
import { v4 as uuidv4 } from 'uuid';
import type { Paint, PaintDatabase } from '../../src/types/paint';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const CONFIG = {
  paintsFile: path.join(__dirname, '../../src/data/paints.json'),
  outputDir: path.join(__dirname, '../../data/ean-scrape'),
  backupDir: path.join(__dirname, '../../data/backups'),
};

// Types
interface GWBarcodeEntry {
  range: string;
  productName: string;
  size: string;
  ssc: string;
  packCode: string;
  barcode6Pack: string;
  unitCode: string;
  barcodeSingle: string;
  // Parsed fields
  normalizedName: string;
  productLine: string;
  ean: string;
}

interface MatchResult {
  gwEntry: GWBarcodeEntry;
  paint: Paint;
  matchType: 'exact' | 'fuzzy';
  similarity: number;
}

interface UnmatchedEntry {
  gwEntry: GWBarcodeEntry;
  suggestedPaint: Partial<Paint>;
  candidates: Array<{ paint: Paint; similarity: number }>;
}

// Product line mapping from GW Range to our database format
const RANGE_TO_PRODUCT_LINE: Record<string, string> = {
  'Paint - WH Colour - Base': 'Base',
  'Paint - WH Colour - Layer': 'Layer',
  'Paint - WH Colour - Dry': 'Dry',
  'Paint - WH Colour - Shade': 'Shade',
  'Paint - WH Colour - Technical': 'Technical',
  'Paint - WH Colour - Air': 'Air',
  'Paint - WH Colour - Contrast': 'Contrast',
  'Paint - WH Colour - Spray': 'Spray',
};

// Paint type mapping
const PRODUCT_LINE_TO_PAINT_TYPE: Record<string, string> = {
  Base: 'base',
  Layer: 'layer',
  Dry: 'dry',
  Shade: 'shade',
  Technical: 'technical',
  Air: 'air',
  Contrast: 'contrast',
  Spray: 'spray',
};

/**
 * Parse the barcode from GW format (e.g., "501192118591-7" → "5011921185917")
 */
function parseGWBarcode(barcode: string): string {
  // Remove dash and any whitespace
  const cleaned = barcode.replace(/[-\s]/g, '');
  // Validate it's 13 digits
  if (!/^\d{13}$/.test(cleaned)) {
    console.warn(`Invalid barcode format: ${barcode} → ${cleaned}`);
  }
  return cleaned;
}

/**
 * Normalize product name for matching
 * Removes size, pack info, and standardizes format
 */
function normalizeProductName(name: string): string {
  return name
    .toUpperCase()
    // Remove common pack/size suffixes with various formats
    .replace(/\s*\(6[-\s]?PACK\)/gi, '')
    .replace(/\s*\(6[-\s]?PK\)/gi, '')
    .replace(/\s*\(6\s*PCK\)/gi, '')
    .replace(/\s*\(X6\)/gi, '')
    .replace(/\s*6[-\s]?PACK\s*$/gi, '')  // at end without parens
    .replace(/\s*6[-\s]?PK\s*$/gi, '')
    .replace(/\s*6\s*PCK\s*$/gi, '')
    .replace(/\s*\(12ML\)/gi, '')
    .replace(/\s*\(18ML\)/gi, '')
    .replace(/\s*\(24ML\)/gi, '')
    .replace(/\s*12ML\s*/gi, ' ')
    .replace(/\s*18ML\s*/gi, ' ')
    .replace(/\s*24ML\s*/gi, ' ')
    // Remove product line prefixes (including abbreviated forms)
    .replace(/^BASE:\s*/gi, '')
    .replace(/^LAYER:\s*/gi, '')
    .replace(/^DRY:\s*/gi, '')
    .replace(/^SHADE:\s*/gi, '')
    .replace(/^TECHNICAL:\s*/gi, '')
    .replace(/^T:\s*/gi, '')  // Abbreviated Technical
    .replace(/^AIR:\s*/gi, '')
    .replace(/^CONTRAST:\s*/gi, '')
    .replace(/^SPRAY:\s*/gi, '')
    .replace(/^S\/\s*/gi, '')  // Abbreviated form like "S/SCORPION"
    // Normalize whitespace
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Normalize for comparison (lowercase, remove special chars, handle possessives)
 */
function normalizeForComparison(str: string): string {
  return str
    .toLowerCase()
    // Expand common abbreviations
    .replace(/\bmech\b/g, 'mechanicus')
    .replace(/\bgrn\b/g, 'green')
    // Remove possessive 's (e.g., "bugman's" -> "bugman")
    .replace(/'s\b/g, '')
    .replace(/['`]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Calculate word-based similarity (Jaccard)
 */
function calculateSimilarity(str1: string, str2: string): number {
  const words1 = new Set(normalizeForComparison(str1).split(' ').filter(Boolean));
  const words2 = new Set(normalizeForComparison(str2).split(' ').filter(Boolean));

  if (words1.size === 0 || words2.size === 0) {
    return 0;
  }

  const intersection = new Set([...words1].filter((w) => words2.has(w)));
  const union = new Set([...words1, ...words2]);

  return intersection.size / union.size;
}

/**
 * Read and parse the GW Excel spreadsheet
 */
function parseGWSpreadsheet(filePath: string): GWBarcodeEntry[] {
  const workbook = XLSX.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json<Record<string, string>>(sheet);

  const entries: GWBarcodeEntry[] = [];

  for (const row of rows) {
    const range = row['Range'] || '';
    const productLine = RANGE_TO_PRODUCT_LINE[range];

    if (!productLine) {
      console.warn(`Unknown range: ${range}`);
      continue;
    }

    const productName = row['PRODUCT NAME'] || '';
    const barcodeSingle = row['Barcode (Single)'] || '';

    if (!productName || !barcodeSingle) {
      continue;
    }

    const normalizedName = normalizeProductName(productName);
    const ean = parseGWBarcode(barcodeSingle);

    entries.push({
      range,
      productName,
      size: row['SIZE'] || '',
      ssc: row['SSC'] || '',
      packCode: row['Pack Code'] || '',
      barcode6Pack: row['Barcode (6-Pack)'] || '',
      unitCode: row['Unit Code'] || '',
      barcodeSingle,
      normalizedName,
      productLine,
      ean,
    });
  }

  return entries;
}

/**
 * Load paints database
 */
function loadPaintsDatabase(): PaintDatabase {
  const content = fs.readFileSync(CONFIG.paintsFile, 'utf-8');
  return JSON.parse(content) as PaintDatabase;
}

/**
 * Match GW entries to existing paints
 */
function matchEntries(
  gwEntries: GWBarcodeEntry[],
  citadelPaints: Paint[]
): { matched: MatchResult[]; unmatched: UnmatchedEntry[] } {
  const matched: MatchResult[] = [];
  const unmatched: UnmatchedEntry[] = [];

  // Index paints by normalized name + product line for fast lookup
  const paintIndex = new Map<string, Paint[]>();
  for (const paint of citadelPaints) {
    const key = normalizeForComparison(paint.name);
    const existing = paintIndex.get(key) || [];
    existing.push(paint);
    paintIndex.set(key, existing);
  }

  for (const gwEntry of gwEntries) {
    const gwNormalized = normalizeForComparison(gwEntry.normalizedName);

    // Try exact match by normalized name
    const exactMatches = paintIndex.get(gwNormalized) || [];
    const exactMatch = exactMatches.find((p) => p.productLine === gwEntry.productLine);

    if (exactMatch) {
      matched.push({
        gwEntry,
        paint: exactMatch,
        matchType: 'exact',
        similarity: 1.0,
      });
      continue;
    }

    // Try fuzzy match
    let bestMatch: { paint: Paint; similarity: number } | null = null;
    const candidates: Array<{ paint: Paint; similarity: number }> = [];

    for (const paint of citadelPaints) {
      // Only match within same product line
      if (paint.productLine !== gwEntry.productLine) {
        continue;
      }

      const similarity = calculateSimilarity(gwEntry.normalizedName, paint.name);

      if (similarity > 0.5) {
        candidates.push({ paint, similarity });
      }

      if (similarity > 0.6 && (!bestMatch || similarity > bestMatch.similarity)) {
        bestMatch = { paint, similarity };
      }
    }

    // Sort candidates by similarity
    candidates.sort((a, b) => b.similarity - a.similarity);

    if (bestMatch && bestMatch.similarity > 0.6) {
      matched.push({
        gwEntry,
        paint: bestMatch.paint,
        matchType: 'fuzzy',
        similarity: bestMatch.similarity,
      });
    } else {
      // Create suggested paint for new entry
      const suggestedPaint: Partial<Paint> = {
        id: uuidv4(),
        name: formatPaintName(gwEntry.normalizedName),
        brand: 'citadel',
        productLine: gwEntry.productLine,
        paintType: PRODUCT_LINE_TO_PAINT_TYPE[gwEntry.productLine] || 'base',
        sku: null,
        ean: gwEntry.ean,
        hexColor: '#808080', // Placeholder - needs color data
        rgb: { r: 128, g: 128, b: 128 },
      };

      unmatched.push({
        gwEntry,
        suggestedPaint,
        candidates: candidates.slice(0, 5),
      });
    }
  }

  return { matched, unmatched };
}

/**
 * Format paint name from uppercase to title case
 */
function formatPaintName(name: string): string {
  return name
    .toLowerCase()
    .split(' ')
    .map((word) => {
      // Handle special cases
      if (word === 'xv') return 'XV';
      if (word === 'ii') return 'II';
      if (word === 'iii') return 'III';
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(' ');
}

/**
 * Create backup of paints database
 */
function createBackup(database: PaintDatabase): string {
  if (!fs.existsSync(CONFIG.backupDir)) {
    fs.mkdirSync(CONFIG.backupDir, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupPath = path.join(CONFIG.backupDir, `paints-${timestamp}.json`);
  fs.writeFileSync(backupPath, JSON.stringify(database, null, 2));
  return backupPath;
}

/**
 * Main function
 */
async function main(): Promise<void> {
  const args = process.argv.slice(2);

  // Find spreadsheet path argument
  const spreadsheetPath = args.find((arg) => !arg.startsWith('--'));
  const shouldMerge = args.includes('--merge');

  if (!spreadsheetPath) {
    console.error('Usage: npm run ean:import:gw-retailer -- /path/to/spreadsheet.xlsx [--merge]');
    process.exit(1);
  }

  if (!fs.existsSync(spreadsheetPath)) {
    console.error(`File not found: ${spreadsheetPath}`);
    process.exit(1);
  }

  console.log('='.repeat(60));
  console.log('GW RETAILER BARCODE IMPORT');
  console.log('='.repeat(60));

  // Parse spreadsheet
  console.log(`\nParsing spreadsheet: ${spreadsheetPath}`);
  const gwEntries = parseGWSpreadsheet(spreadsheetPath);
  console.log(`Found ${gwEntries.length} paint entries`);

  // Show breakdown by product line
  const byLine = new Map<string, number>();
  for (const entry of gwEntries) {
    byLine.set(entry.productLine, (byLine.get(entry.productLine) || 0) + 1);
  }
  console.log('\nBy product line:');
  for (const [line, count] of [...byLine.entries()].sort()) {
    console.log(`  ${line}: ${count}`);
  }

  // Load paints database
  console.log('\nLoading paints database...');
  const database = loadPaintsDatabase();
  const citadelPaints = database.paints.filter((p) => p.brand === 'citadel');
  console.log(`Found ${citadelPaints.length} Citadel paints in database`);

  // Match entries
  console.log('\nMatching GW entries to database...');
  const { matched, unmatched } = matchEntries(gwEntries, citadelPaints);

  console.log(`\nResults:`);
  console.log(`  Matched: ${matched.length}`);
  console.log(`  Unmatched (new paints): ${unmatched.length}`);

  // Show match breakdown
  const exactMatches = matched.filter((m) => m.matchType === 'exact').length;
  const fuzzyMatches = matched.filter((m) => m.matchType === 'fuzzy').length;
  console.log(`  - Exact matches: ${exactMatches}`);
  console.log(`  - Fuzzy matches: ${fuzzyMatches}`);

  // Create output directory if needed
  if (!fs.existsSync(CONFIG.outputDir)) {
    fs.mkdirSync(CONFIG.outputDir, { recursive: true });
  }

  const dateStr = new Date().toISOString().split('T')[0];

  // Write matched results
  const matchedPath = path.join(CONFIG.outputDir, `gw-retailer-matches-${dateStr}.json`);
  fs.writeFileSync(
    matchedPath,
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        source: spreadsheetPath,
        stats: {
          total: gwEntries.length,
          matched: matched.length,
          unmatched: unmatched.length,
          exactMatches,
          fuzzyMatches,
        },
        matches: matched.map((m) => ({
          paintId: m.paint.id,
          paintName: m.paint.name,
          productLine: m.paint.productLine,
          gwName: m.gwEntry.normalizedName,
          ean: m.gwEntry.ean,
          matchType: m.matchType,
          similarity: m.similarity,
        })),
      },
      null,
      2
    )
  );
  console.log(`\nMatches saved to: ${matchedPath}`);

  // Write unmatched (new paints) results
  if (unmatched.length > 0) {
    const unmatchedPath = path.join(CONFIG.outputDir, `gw-retailer-unmatched-${dateStr}.json`);
    fs.writeFileSync(
      unmatchedPath,
      JSON.stringify(
        {
          generatedAt: new Date().toISOString(),
          source: spreadsheetPath,
          count: unmatched.length,
          newPaints: unmatched.map((u) => ({
            gwName: u.gwEntry.normalizedName,
            productLine: u.gwEntry.productLine,
            ean: u.gwEntry.ean,
            ssc: u.gwEntry.ssc,
            suggestedPaint: u.suggestedPaint,
            closestMatches: u.candidates.slice(0, 3).map((c) => ({
              name: c.paint.name,
              productLine: c.paint.productLine,
              similarity: c.similarity,
            })),
          })),
        },
        null,
        2
      )
    );
    console.log(`New paints saved to: ${unmatchedPath}`);
  }

  // Write direct EAN mapping (for use with merge script)
  const mappingPath = path.join(CONFIG.outputDir, `citadel-ean-mapping-${dateStr}.json`);
  const eanMapping: Record<string, string> = {};
  for (const m of matched) {
    eanMapping[m.paint.id] = m.gwEntry.ean;
  }
  fs.writeFileSync(mappingPath, JSON.stringify(eanMapping, null, 2));
  console.log(`EAN mapping saved to: ${mappingPath}`);

  // If --merge flag, apply changes directly
  if (shouldMerge) {
    console.log('\n' + '='.repeat(60));
    console.log('MERGING CHANGES');
    console.log('='.repeat(60));

    // Create backup
    console.log('\nCreating backup...');
    const backupPath = createBackup(database);
    console.log(`Backup saved to: ${backupPath}`);

    // Apply EAN updates to matched paints
    let updatedEans = 0;
    let addedPaints = 0;

    for (const m of matched) {
      const paint = database.paints.find((p) => p.id === m.paint.id);
      if (paint) {
        if (!paint.ean || paint.ean !== m.gwEntry.ean) {
          paint.ean = m.gwEntry.ean;
          updatedEans++;
        }
      }
    }

    // Add new paints from unmatched
    for (const u of unmatched) {
      const newPaint: Paint = {
        id: u.suggestedPaint.id!,
        name: u.suggestedPaint.name!,
        brand: 'citadel',
        productLine: u.suggestedPaint.productLine!,
        paintType: u.suggestedPaint.paintType!,
        sku: null,
        hexColor: u.suggestedPaint.hexColor!,
        rgb: u.suggestedPaint.rgb!,
        ean: u.suggestedPaint.ean,
      };
      database.paints.push(newPaint);
      addedPaints++;
    }

    // Update counts
    database.generatedAt = new Date().toISOString();
    database.counts.total = database.paints.length;
    database.counts.byBrand = {};
    for (const paint of database.paints) {
      database.counts.byBrand[paint.brand] = (database.counts.byBrand[paint.brand] || 0) + 1;
    }

    // Write updated database
    fs.writeFileSync(CONFIG.paintsFile, JSON.stringify(database, null, 2));

    console.log(`\nMerge complete:`);
    console.log(`  EANs updated: ${updatedEans}`);
    console.log(`  New paints added: ${addedPaints}`);

    // Print final coverage
    const citadelWithEan = database.paints.filter((p) => p.brand === 'citadel' && p.ean).length;
    const citadelTotal = database.paints.filter((p) => p.brand === 'citadel').length;
    const coverage = ((citadelWithEan / citadelTotal) * 100).toFixed(1);
    console.log(`\nCitadel coverage: ${citadelWithEan}/${citadelTotal} (${coverage}%)`);
  } else {
    console.log('\nTo apply changes, run with --merge flag:');
    console.log(`  npm run ean:import:gw-retailer -- "${spreadsheetPath}" --merge`);
  }

  // Print summary
  console.log('\n' + '='.repeat(60));
  console.log('SUMMARY');
  console.log('='.repeat(60));

  // Coverage by product line
  console.log('\nMatched by product line:');
  const matchedByLine = new Map<string, number>();
  for (const m of matched) {
    matchedByLine.set(m.gwEntry.productLine, (matchedByLine.get(m.gwEntry.productLine) || 0) + 1);
  }
  for (const [line, count] of [...matchedByLine.entries()].sort()) {
    const total = byLine.get(line) || 0;
    const pct = ((count / total) * 100).toFixed(0);
    console.log(`  ${line}: ${count}/${total} (${pct}%)`);
  }

  if (unmatched.length > 0) {
    console.log('\nNew paints to add (samples):');
    for (const u of unmatched.slice(0, 10)) {
      console.log(`  - ${u.gwEntry.normalizedName} (${u.gwEntry.productLine})`);
    }
    if (unmatched.length > 10) {
      console.log(`  ... and ${unmatched.length - 10} more`);
    }
  }
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
