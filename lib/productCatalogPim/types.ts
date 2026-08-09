export interface ProductCatalogPimOverview {
  products: number;
  active: number;
  drafts: number;
  incomplete: number;
  variants: number;
  brands: number;
  categories: number;
  translations: number;
}

export interface ProductCatalogPimProductRow {
  id: number;
  sku: string;
  parent_sku: string;
  barcode: string;
  brand_id: number | null;
  category_id: number | null;
  product_type: string;
  status: string;
  cost_price: number;
  selling_price: number;
  currency: string;
  tax_class: string;
  stock_qty: number;
  weight_kg: number;
  supplier_id: string;
  supplier_sku: string;
  supplier_feed_ref: string;
  tecdoc_ref: string;
  completeness: number;
  brand_name: string | null;
  category_name: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProductCatalogPimStatus {
  version: string;
  enabled: boolean;
  totals: {
    products: number;
    active: number;
    drafts: number;
    incomplete: number;
    variants: number;
    brands: number;
    categories: number;
    translations: number;
  };
  overview: ProductCatalogPimOverview;
}
