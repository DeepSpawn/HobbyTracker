import path from 'path';

/**
 * Test image paths and expected barcode values
 * Images are real-world photos of paint pot barcodes
 */

const IMAGES_DIR = path.resolve(__dirname, '../../../examples/images');

export const TEST_IMAGES = {
  citadel: {
    /** Clear shot, good lighting - EAN-13 */
    clearShot: path.join(IMAGES_DIR, 'PXL_20260127_195302882.MP.jpg'),
    /** Angled shot - harder to read */
    angledShot: path.join(IMAGES_DIR, 'PXL_20260127_195308221.MP.jpg'),
    /** Another angle */
    alternateAngle: path.join(IMAGES_DIR, 'PXL_20260127_195311118.MP.jpg'),
  },
  monument: {
    /** Clear shot of MPA-006 bottle - UPC-A */
    clearShot: path.join(IMAGES_DIR, 'PXL_20260127_195315729.MP.jpg'),
    /** Alternate angle */
    angledShot: path.join(IMAGES_DIR, 'PXL_20260127_195316855.jpg'),
    /** Another shot */
    alternateShot: path.join(IMAGES_DIR, 'PXL_20260127_195317600.jpg'),
  },
  vallejo: {
    /** Dropper bottle - EAN-13 */
    clearShot: path.join(IMAGES_DIR, 'PXL_20260127_195330624.MP.jpg'),
    /** Alternate shot */
    alternateShot: path.join(IMAGES_DIR, 'PXL_20260127_195331109.jpg'),
    /** Another angle */
    angledShot: path.join(IMAGES_DIR, 'PXL_20260127_195332220.jpg'),
    /** Additional shot */
    additionalShot: path.join(IMAGES_DIR, 'PXL_20260127_195333006.jpg'),
  },
  akInteractive: {
    /** Yellow pot - NOT in database - EAN-13 */
    clearShot: path.join(IMAGES_DIR, 'PXL_20260127_195338680.MP.jpg'),
    /** Upside down - tests rotation handling */
    upsideDown: path.join(IMAGES_DIR, 'PXL_20260127_195340357.MP.jpg'),
    /** Motion blur - may fail to decode */
    blurry: path.join(IMAGES_DIR, 'PXL_20260127_195342515.MP.jpg'),
    /** Additional blurry shot */
    blurry2: path.join(IMAGES_DIR, 'PXL_20260127_195343204.jpg'),
  },
};

export const EXPECTED_BARCODES = {
  /** Citadel paints - Games Workshop EAN-13 */
  citadel: '5011921120963',
  /** Monument Hobbies - UPC-A (12 digits, scanner may return with or without leading 0) */
  monument: '628504411063',
  /** Vallejo paints - EAN-13 */
  vallejo: '8429551708593',
  /** AK Interactive - EAN-13 (NOT in database) */
  akInteractive: '8435568302686',
};

/**
 * Expected results when looking up barcodes
 */
export const EXPECTED_LOOKUP_RESULTS = {
  [EXPECTED_BARCODES.citadel]: { found: true, brand: 'citadel' },
  [EXPECTED_BARCODES.monument]: { found: true, brand: 'monument_hobbies' },
  [EXPECTED_BARCODES.vallejo]: { found: true, brand: 'vallejo' },
  [EXPECTED_BARCODES.akInteractive]: { found: false, brand: null },
};

/**
 * All test image paths for iteration
 */
export function getAllTestImagePaths(): string[] {
  return [
    ...Object.values(TEST_IMAGES.citadel),
    ...Object.values(TEST_IMAGES.monument),
    ...Object.values(TEST_IMAGES.vallejo),
    ...Object.values(TEST_IMAGES.akInteractive),
  ];
}

/**
 * Get expected barcode for an image path
 */
export function getExpectedBarcodeForImage(imagePath: string): string | null {
  const filename = path.basename(imagePath);

  // Map filenames to expected barcodes
  if (
    filename.includes('195302882') ||
    filename.includes('195308221') ||
    filename.includes('195311118')
  ) {
    return EXPECTED_BARCODES.citadel;
  }
  if (
    filename.includes('195315729') ||
    filename.includes('195316855') ||
    filename.includes('195317600')
  ) {
    return EXPECTED_BARCODES.monument;
  }
  if (
    filename.includes('195330624') ||
    filename.includes('195331109') ||
    filename.includes('195332220') ||
    filename.includes('195333006')
  ) {
    return EXPECTED_BARCODES.vallejo;
  }
  if (
    filename.includes('195338680') ||
    filename.includes('195340357') ||
    filename.includes('195342515') ||
    filename.includes('195343204')
  ) {
    return EXPECTED_BARCODES.akInteractive;
  }

  return null;
}
