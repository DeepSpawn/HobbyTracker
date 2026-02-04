export interface Paint {
  id: string;
  name: string;
  brand: string;
  productLine: string;
  paintType: string;
  sku: string | null;
  hexColor: string;
  rgb: {
    r: number;
    g: number;
    b: number;
  };
  ean?: string | null; // Barcode: EAN-13 (13 digits) or UPC-12 (12 digits), null = not found, undefined = not yet looked up
}

export interface PaintDatabase {
  version: string;
  generatedAt: string;
  counts: {
    total: number;
    byBrand: Record<string, number>;
  };
  paints: Paint[];
}
