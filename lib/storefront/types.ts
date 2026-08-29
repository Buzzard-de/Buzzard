export interface StorefrontProduct {
  id: string;
  sku: string;
  ean?: string | null;
  gtin?: string | null;
  mpn?: string | null;
  title: string;
  description: string;
  shortDescription: string;
  brand?: { id: number; name: string; slug: string } | null;
  categoryId?: string | null;
  categorySlug?: string | null;
  subcategoryId?: string | null;
  attributes: Record<string, unknown>;
  variants: Array<{ id: string; sku?: string; axis: string; value: string; priceDelta?: number; stock?: number }>;
  media: Array<{ url: string; alt: string; primary: boolean; type: string }>;
  images: string[];
  price: number;
  currency: string;
  stock: number;
  stockStatus: string;
  seo: { slug: string; metaTitle?: string; metaDescription?: string; canonical?: string };
  structuredData?: Record<string, unknown>;
  catalogMode: boolean;
  buyNowEnabled: boolean;
  addToCartEnabled: boolean;
  source?: string;
  updatedAt?: string;
}

export interface StorefrontListResult {
  items: StorefrontProduct[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  facets?: {
    brands: Array<{ slug: string; name: string }>;
    priceRange: { min: number; max: number };
    inStockCount: number;
  };
  catalogMode?: boolean;
}

export interface StorefrontCategory {
  id: string;
  slug: string;
  name: string;
  url: string;
  level: number;
  menuOrder?: number;
  visibility: string;
  customerVisible: boolean;
  children?: StorefrontCategory[];
}
