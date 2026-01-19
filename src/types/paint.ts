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
