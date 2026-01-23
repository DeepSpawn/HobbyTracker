import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { fileURLToPath } from 'url';
import type { Paint, PaintDatabase } from '../src/types/paint';

/**
 * Generate a deterministic UUID v5 from brand + name
 * This ensures paint IDs stay consistent across parses
 */
function generateDeterministicId(brand: string, name: string): string {
  // Use a fixed namespace UUID for paint IDs
  const namespace = '6ba7b810-9dad-11d1-80b4-00c04fd430c8'; // URL namespace
  const data = `paint:${brand}:${name}`;

  // Create a hash and format as UUID v5
  const hash = crypto.createHash('sha1').update(namespace + data).digest();

  // Set version (5) and variant bits
  hash[6] = (hash[6] & 0x0f) | 0x50;
  hash[8] = (hash[8] & 0x3f) | 0x80;

  // Format as UUID string
  const hex = hash.toString('hex');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const MINIATURE_PAINTS_DIR = path.join(__dirname, '../../miniature-paints/paints');
const OUTPUT_FILE = path.join(__dirname, '../src/data/paints.json');

// MVP brands to process
const BRAND_MAP: Record<string, string> = {
  Citadel_Colour: 'citadel',
  Vallejo: 'vallejo',
  Army_Painter: 'army_painter',
  Monument: 'monument_hobbies',
};

// Map product lines to paint types
const PAINT_TYPE_MAP: Record<string, Record<string, string>> = {
  citadel: {
    Base: 'base',
    'Foundation': 'base',
    'Foundation (discontinued)': 'base',
    Layer: 'layer',
    Shade: 'wash',
    Wash: 'wash',
    'Foundation Wash (discontinued)': 'wash',
    Contrast: 'contrast',
    Technical: 'technical',
    Air: 'air',
    Dry: 'dry',
    Spray: 'spray',
    Glaze: 'glaze',
    Edge: 'layer',
    Primer: 'primer',
  },
  vallejo: {
    'Model Color': 'base',
    'Game Color': 'base',
    'Game Color Special FX': 'technical',
    'Model Air': 'air',
    'Game Air': 'air',
    'Xpress Color': 'contrast',
    'Metal Color': 'metallic',
    'Mecha Color': 'base',
    'Panzer Aces': 'base',
    'Surface Primer': 'primer',
    'Hobby Paint': 'base',
    'Arte Deco': 'base',
    'Nocturna Models': 'base',
  },
  army_painter: {
    Warpaints: 'base',
    'Warpaints Fanatic': 'base',
    'Warpaints Wash': 'wash',
    'Warpaints Air': 'air',
    'Warpaints Primer': 'primer',
    Speedpaint: 'contrast',
    'Speedpaint Set': 'contrast',
    'Speedpaint Set 2.0': 'contrast',
    "D&D Nolzur's Marvelous Pigments": 'base',
    "D&D Underdark Set": 'base',
    'Skin Tones Paint Set': 'base',
  },
  monument_hobbies: {
    'Monument Pro Acrylic Paints': 'base',
    'Monument Pro Acrylic Primer': 'primer',
    'Monument Pro Acrylic Wash': 'wash',
    'Monument Pro Signature Series': 'base',
  },
};

function extractHexFromCell(cell: string): string | null {
  // Format: ![#XXXXXX](url) `#XXXXXX`
  const match = cell.match(/`#([A-Fa-f0-9]{6})`/);
  return match ? `#${match[1].toUpperCase()}` : null;
}

function inferPaintType(brand: string, productLine: string): string {
  const brandMap = PAINT_TYPE_MAP[brand];
  if (brandMap && brandMap[productLine]) {
    return brandMap[productLine];
  }
  // Default fallback
  return 'base';
}

function parseMarkdownTable(content: string, brand: string): Paint[] {
  const paints: Paint[] = [];
  const lines = content.split('\n');

  // Find table rows (lines starting with |)
  let hasCodeColumn = false;
  let headerFound = false;

  for (const line of lines) {
    const trimmed = line.trim();

    // Skip empty lines
    if (!trimmed) continue;

    // Skip non-table lines
    if (!trimmed.startsWith('|')) continue;

    // Parse header to determine format
    if (!headerFound && trimmed.includes('Name')) {
      hasCodeColumn = trimmed.includes('|Code|');
      headerFound = true;
      continue;
    }

    // Skip separator row
    if (trimmed.includes('---|')) continue;

    // Parse data rows
    const cells = trimmed
      .split('|')
      .map((c) => c.trim())
      .filter((c) => c !== '');

    if (cells.length < 5) continue;

    let name: string;
    let code: string | null;
    let set: string;
    let r: number;
    let g: number;
    let b: number;
    let hexCell: string;

    if (hasCodeColumn) {
      // Format: |Name|Code|Set|R|G|B|Hex|
      [name, code, set, r, g, b] = [
        cells[0],
        cells[1] === 'null' ? null : cells[1],
        cells[2],
        parseInt(cells[3], 10),
        parseInt(cells[4], 10),
        parseInt(cells[5], 10),
      ];
      hexCell = cells[6] || '';
    } else {
      // Format: |Name|Set|R|G|B|Hex|
      [name, set, r, g, b] = [
        cells[0],
        cells[1],
        parseInt(cells[2], 10),
        parseInt(cells[3], 10),
        parseInt(cells[4], 10),
      ];
      code = null;
      hexCell = cells[5] || '';
    }

    const hexColor = extractHexFromCell(hexCell);
    if (!hexColor) continue;

    // Validate RGB values
    if (isNaN(r) || isNaN(g) || isNaN(b)) continue;

    const trimmedName = name.trim();
    const paint: Paint = {
      id: generateDeterministicId(brand, trimmedName),
      name: trimmedName,
      brand,
      productLine: set.trim(),
      paintType: inferPaintType(brand, set.trim()),
      sku: code,
      hexColor,
      rgb: { r, g, b },
    };

    paints.push(paint);
  }

  return paints;
}

function main(): void {
  console.log('Parsing miniature-paints dataset...\n');

  const allPaints: Paint[] = [];
  const countsByBrand: Record<string, number> = {};

  // Process each MVP brand file
  for (const [filename, brand] of Object.entries(BRAND_MAP)) {
    const filePath = path.join(MINIATURE_PAINTS_DIR, `${filename}.md`);

    if (!fs.existsSync(filePath)) {
      console.error(`Warning: File not found: ${filePath}`);
      continue;
    }

    const content = fs.readFileSync(filePath, 'utf-8');
    const paints = parseMarkdownTable(content, brand);

    allPaints.push(...paints);
    countsByBrand[brand] = paints.length;

    console.log(`  ${brand}: ${paints.length} paints`);
  }

  // Create output directory if it doesn't exist
  const outputDir = path.dirname(OUTPUT_FILE);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Build database object
  const database: PaintDatabase = {
    version: '1.0.0',
    generatedAt: new Date().toISOString(),
    counts: {
      total: allPaints.length,
      byBrand: countsByBrand,
    },
    paints: allPaints,
  };

  // Write output
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(database, null, 2));

  console.log(`\nTotal: ${allPaints.length} paints`);
  console.log(`Output written to: ${OUTPUT_FILE}`);
}

main();
