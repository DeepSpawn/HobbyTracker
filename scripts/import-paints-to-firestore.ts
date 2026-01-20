import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { initializeApp, cert, type ServiceAccount } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import type { Paint, PaintDatabase } from '../src/types/paint';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PAINTS_FILE = path.join(__dirname, '../src/data/paints.json');
const BATCH_SIZE = 500; // Firestore batch write limit
const COLLECTION_NAME = 'paints';

// Hex color validation regex
const HEX_COLOR_REGEX = /^#[A-Fa-f0-9]{6}$/;

function validateHexColor(hex: string): boolean {
  return HEX_COLOR_REGEX.test(hex);
}

function loadPaintsDatabase(): PaintDatabase {
  if (!fs.existsSync(PAINTS_FILE)) {
    throw new Error(`Paints file not found: ${PAINTS_FILE}`);
  }

  const content = fs.readFileSync(PAINTS_FILE, 'utf-8');
  return JSON.parse(content) as PaintDatabase;
}

async function importPaintsToFirestore(paints: Paint[]): Promise<void> {
  // Initialize Firebase Admin SDK
  // Uses GOOGLE_APPLICATION_CREDENTIALS environment variable by default
  const credentialsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;

  if (!credentialsPath) {
    throw new Error(
      'GOOGLE_APPLICATION_CREDENTIALS environment variable not set.\n' +
        'Set it to the path of your Firebase service account key JSON file:\n' +
        '  export GOOGLE_APPLICATION_CREDENTIALS="./path-to-service-account.json"'
    );
  }

  if (!fs.existsSync(credentialsPath)) {
    throw new Error(`Service account file not found: ${credentialsPath}`);
  }

  const serviceAccount = JSON.parse(
    fs.readFileSync(credentialsPath, 'utf-8')
  ) as ServiceAccount;

  initializeApp({
    credential: cert(serviceAccount),
  });

  const db = getFirestore();
  const totalBatches = Math.ceil(paints.length / BATCH_SIZE);

  console.log(`Importing in batches of ${BATCH_SIZE}...`);

  for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
    const start = batchIndex * BATCH_SIZE;
    const end = Math.min(start + BATCH_SIZE, paints.length);
    const batchPaints = paints.slice(start, end);

    const batch = db.batch();

    for (const paint of batchPaints) {
      // Use paint.id as document ID for natural deduplication
      const docRef = db.collection(COLLECTION_NAME).doc(paint.id);

      // Store all paint fields except id (since it's the doc ID)
      const { id, ...paintData } = paint;
      batch.set(docRef, paintData);
    }

    await batch.commit();
    console.log(`  Batch ${batchIndex + 1}/${totalBatches}: ${batchPaints.length} paints`);
  }
}

async function main(): Promise<void> {
  console.log('Loading paints database...');
  const database = loadPaintsDatabase();

  console.log(`\nFound ${database.paints.length} paints`);
  console.log('Counts by brand:');
  for (const [brand, count] of Object.entries(database.counts.byBrand)) {
    console.log(`  ${brand}: ${count}`);
  }

  // Validate hex codes
  console.log('\nValidating hex codes...');
  const validPaints: Paint[] = [];
  const invalidPaints: Paint[] = [];

  for (const paint of database.paints) {
    if (validateHexColor(paint.hexColor)) {
      validPaints.push(paint);
    } else {
      invalidPaints.push(paint);
    }
  }

  console.log(`  Valid: ${validPaints.length}`);
  console.log(`  Invalid: ${invalidPaints.length}`);

  if (invalidPaints.length > 0) {
    console.log('\nInvalid hex codes found:');
    for (const paint of invalidPaints.slice(0, 10)) {
      console.log(`  - ${paint.name} (${paint.brand}): "${paint.hexColor}"`);
    }
    if (invalidPaints.length > 10) {
      console.log(`  ... and ${invalidPaints.length - 10} more`);
    }
  }

  if (validPaints.length === 0) {
    console.error('\nNo valid paints to import!');
    process.exit(1);
  }

  // Import to Firestore
  console.log(`\nImporting ${validPaints.length} paints to Firestore...`);

  try {
    await importPaintsToFirestore(validPaints);
    console.log(`\nImport complete: ${validPaints.length} paints imported`);

    if (invalidPaints.length > 0) {
      console.log(`Warning: ${invalidPaints.length} paints skipped due to invalid hex codes`);
    }
  } catch (error) {
    console.error('\nImport failed:', error);
    process.exit(1);
  }
}

main();
