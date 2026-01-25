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
  ean?: string | null; // EAN-13 barcode (13 digits), null = not found, undefined = not yet looked up
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
