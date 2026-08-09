export interface PimCategory {
  id: number;
  parent_id: number | null;
  code: string;
  name: string;
  slug: string;
  active: number;
}

export interface PimBrand {
  id: number;
  name: string;
  slug: string;
  active: number;
}

export interface PimProduct {
  id: number;
  sku: string;
  brand_id: number | null;
  category_id: number | null;
  ean: string | null;
  gtin: string | null;
  status: string;
  price: number;
  cost: number;
  weight_kg: number;
  stock: number;
  completeness: number;
  created_at: string;
  updated_at: string;
  brand?: string | null;
  category?: string | null;
}

export interface PimCompletenessStats {
  total: number;
  published: number;
  averageCompleteness: number;
  readyForFeed: number;
}

export interface PimImportJob {
  id: number;
  source_type: string;
  source_name: string;
  status: string;
  items_total: number;
  items_processed: number;
  error_message: string | null;
  created_at: string;
  finished_at: string | null;
}

export interface PimCatalogStatus {
  version: string;
  enabled: boolean;
  totals: {
    categories: number;
    brands: number;
    products: number;
    published: number;
    readyForFeed: number;
    importJobs: number;
    variants: number;
  };
  completeness: PimCompletenessStats;
}

export interface PimProductDetail {
  product: PimProduct;
  translations: Array<{
    id: number;
    product_id: number;
    language: string;
    title: string;
    short_description: string;
    description: string;
  }>;
  attributes: Array<{
    id: number;
    product_id: number;
    attribute_key: string;
    attribute_value: string;
    unit: string | null;
  }>;
  variants: Array<Record<string, unknown>>;
  media: Array<Record<string, unknown>>;
  seo: Record<string, unknown> | null;
}
