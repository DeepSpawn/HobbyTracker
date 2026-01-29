/**
 * Barcode image generation utilities for testing.
 *
 * Implements EAN-13 encoding from scratch since ZXing's JS port
 * doesn't include 1D barcode writers (only QR is available).
 */

// EAN-13 encoding tables
// L-codes (odd parity, left side)
const L_CODES = [
  '0001101', '0011001', '0010011', '0111101', '0100011',
  '0110001', '0101111', '0111011', '0110111', '0001011',
];
// G-codes (even parity, left side)
const G_CODES = [
  '0100111', '0110011', '0011011', '0100001', '0011101',
  '0111001', '0000101', '0010001', '0001001', '0010111',
];
// R-codes (right side)
const R_CODES = [
  '1110010', '1100110', '1101100', '1000010', '1011100',
  '1001110', '1010000', '1000100', '1001000', '1110100',
];

// Parity patterns for the first digit (determines L/G pattern for left 6 digits)
const FIRST_DIGIT_PARITY = [
  'LLLLLL', 'LLGLGG', 'LLGGLG', 'LLGGGL', 'LGLLGG',
  'LGGLLG', 'LGGGLL', 'LGLGLG', 'LGLGGL', 'LGGLGL',
];

/**
 * Encode an EAN-13 barcode as a binary module string (1=black, 0=white).
 * Total: 95 modules (3 + 42 + 5 + 42 + 3)
 */
function encodeEan13(digits: string): string {
  const d = digits.split('').map(Number);
  const parity = FIRST_DIGIT_PARITY[d[0]];

  let modules = '101'; // start guard

  // Left 6 digits (d[1]..d[6])
  for (let i = 0; i < 6; i++) {
    const digit = d[i + 1];
    modules += parity[i] === 'L' ? L_CODES[digit] : G_CODES[digit];
  }

  modules += '01010'; // center guard

  // Right 6 digits (d[7]..d[12])
  for (let i = 7; i <= 12; i++) {
    modules += R_CODES[d[i]];
  }

  modules += '101'; // end guard

  return modules;
}

export interface GeneratedBarcode {
  rgbData: Uint8ClampedArray;
  width: number;
  height: number;
  barcode: string;
}

/**
 * Generate an EAN-13 barcode image as RGB pixel data.
 *
 * @param barcode - 13-digit EAN string
 * @param width - Image width (default: 380, provides ~4px per module with quiet zones)
 * @param height - Image height (default: 150)
 * @returns Generated barcode with RGB pixel data
 */
export function generateBarcodeImage(
  barcode: string,
  width = 380,
  height = 150,
): GeneratedBarcode {
  if (!/^\d{13}$/.test(barcode)) {
    throw new Error(`Invalid EAN-13: "${barcode}" (must be exactly 13 digits)`);
  }

  const modules = encodeEan13(barcode);
  // 95 modules + quiet zones (9 modules each side) = 113 total
  const quietZone = 9;
  const totalModules = modules.length + quietZone * 2;
  const moduleWidth = width / totalModules;

  const rgbData = new Uint8ClampedArray(width * height * 3);
  rgbData.fill(255); // white background

  // Render barcode in the center 80% of height
  const barTop = Math.floor(height * 0.1);
  const barBottom = Math.floor(height * 0.9);

  for (let y = barTop; y < barBottom; y++) {
    for (let m = 0; m < modules.length; m++) {
      if (modules[m] !== '1') continue;

      const xStart = Math.floor((quietZone + m) * moduleWidth);
      const xEnd = Math.floor((quietZone + m + 1) * moduleWidth);

      for (let x = xStart; x < xEnd && x < width; x++) {
        const idx = (y * width + x) * 3;
        rgbData[idx] = 0;     // R
        rgbData[idx + 1] = 0; // G
        rgbData[idx + 2] = 0; // B
      }
    }
  }

  return { rgbData, width, height, barcode };
}

/**
 * Generate RGBA pixel data (compatible with ImageData / canvas).
 */
export function generateBarcodeImageRgba(
  barcode: string,
  width = 380,
  height = 150,
): { rgbaData: Uint8ClampedArray; width: number; height: number } {
  const { rgbData, width: w, height: h } = generateBarcodeImage(barcode, width, height);

  const rgbaData = new Uint8ClampedArray(w * h * 4);
  for (let i = 0; i < w * h; i++) {
    rgbaData[i * 4] = rgbData[i * 3];
    rgbaData[i * 4 + 1] = rgbData[i * 3 + 1];
    rgbaData[i * 4 + 2] = rgbData[i * 3 + 2];
    rgbaData[i * 4 + 3] = 255; // fully opaque
  }

  return { rgbaData, width: w, height: h };
}
