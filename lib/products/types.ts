export type StockStatus = "in_stock" | "low_stock" | "out_of_stock" | "preorder";
export type ProductStatus = "draft" | "active" | "paused" | "archived";
export type VariantType = "size" | "color" | "pack" | "model" | "vehicle" | "custom";

export interface MoneyAmount {
  amount: number;
  currency: string;
}

export interface ProductVariant {
  id: string;
  type: VariantType;
  label: string;
  value: string;
  sku?: string;
  price?: MoneyAmount | null;
  stock?: number;
  stock_status?: StockStatus;
}

export interface ProductDocument {
  title: string;
  url: string;
}

export interface ProductShipping {
  weight_kg: number;
  length_cm: number;
  width_cm: number;
  height_cm: number;
  class: string;
}

export interface ProductSeo {
  slug: string;
  title: string;
  description: string;
}

export interface ProductI18nEntry {
  name?: string;
  short_description?: string;
  description?: string;
  seo_title?: string;
  seo_description?: string;
}

export interface VehicleCompatibility {
  brand: string;
  model: string;
  type?: string;
  year_from?: number;
  year_to?: number;
  engine?: string;
  part_reference?: string;
}

export interface ProductCustoms {
  gtip?: string;
  taric?: string;
  origin_country?: string;
  duty_rate?: number;
  import_restricted?: boolean;
  source?: string;
  confidence?: number;
  review_required?: boolean;
}

/** Full catalog record including private supplier fields. */
export interface BuzzardProduct {
  id: string;
  sku: string;
  ean_gtin: string;
  brand: string;
  manufacturer?: string;
  name: string;
  short_description: string;
  description: string;
  category_id: string;
  category_ids: string[];
  images: string[];
  documents: ProductDocument[];
  attributes: Record<string, string>;
  variants: ProductVariant[];
  price: MoneyAmount;
  compare_at_price: MoneyAmount | null;
  vat_rate: number;
  stock: number;
  stock_status: StockStatus;
  supplier_id: string;
  supplier_sku: string;
  supplier_price: MoneyAmount;
  shipping: ProductShipping;
  seo: ProductSeo;
  status: ProductStatus;
  buy_now_enabled?: boolean;
  i18n?: Partial<Record<"de" | "en" | "tr" | "ar", ProductI18nEntry>>;
  vehicle_compatibility?: VehicleCompatibility[];
  customs?: ProductCustoms;
  ai_source?: string;
  ai_confidence?: number;
  created_at: string;
  updated_at: string;
}

export interface BuzzardProductCatalog {
  project: string;
  document: string;
  version: string;
  products: BuzzardProduct[];
}

/** Customer-safe product without supplier/admin fields. */
export interface PublicProduct {
  id: string;
  sku: string;
  eanGtin: string;
  brand: string;
  name: string;
  shortDescription: string;
  description: string;
  categoryId: string;
  categoryIds: string[];
  images: string[];
  imageKey?: string;
  documents: ProductDocument[];
  attributes: Record<string, string>;
  variants: ProductVariant[];
  price: number;
  compareAtPrice?: number;
  vatRate: number;
  stock: number;
  stockStatus: StockStatus;
  shipping: ProductShipping;
  seo: ProductSeo;
  buyNowEnabled: boolean;
  url: string;
}

export interface ProductListResult {
  items: PublicProduct[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}
