export type CatalogCategory = {
  id: number;
  name: string;
  slug: string;
  active?: number;
};

export type CatalogProduct = {
  id: number;
  sku: string;
  name: string;
  slug: string;
  description: string;
  category_id: number | null;
  category?: string;
  category_slug?: string;
  supplier_cost_eur: number;
  price_eur: number;
  margin_floor: number;
  stock: number;
  active: boolean;
  image_url: string;
  seo_title: string;
  seo_description: string;
  updated_at?: string;
  images?: CatalogProductImage[];
};

export type CatalogProductImage = {
  id: number;
  product_id: number;
  url: string;
  alt_text: string;
  sort_order: number;
};

export type CatalogSeoStatus = {
  version: string;
  enabled: boolean;
  publicBaseUrl: string;
  pricing: {
    defaultMargin: number;
    minMargin: number;
  };
  totals: {
    categories: number;
    products: number;
    images: number;
    auditEntries: number;
  };
};

export type CatalogProductInput = {
  id?: number;
  sku?: string;
  name?: string;
  description?: string;
  categoryId?: number | null;
  supplierCostEur?: number;
  priceEur?: number | "";
  marginFloor?: number;
  stock?: number;
  imageUrl?: string;
  seoTitle?: string;
  seoDescription?: string;
  slug?: string;
  active?: boolean;
};
