import type { BuzzardProduct } from "@/lib/products/types";

/** Product Engine lifecycle — superset of storefront + PIM statuses. */
export type ProductEngineStatus =
  | "DRAFT"
  | "PENDING_REVIEW"
  | "ACTIVE"
  | "PAUSED"
  | "OUT_OF_STOCK"
  | "DISCONTINUED"
  | "ARCHIVED";

export type ProductType = "automotive" | "general" | "accessory" | string;

export type SupplierSourceType = "API" | "XML" | "CSV" | "MANUAL";

export type ProductImageType = "MAIN" | "GALLERY" | "TECHNICAL" | "PACKAGING";

export type ProductEventType =
  | "PRODUCT_CREATED"
  | "PRODUCT_UPDATED"
  | "PRODUCT_ACTIVATED"
  | "PRODUCT_PAUSED"
  | "PRODUCT_OUT_OF_STOCK"
  | "PRODUCT_BACK_IN_STOCK"
  | "PRODUCT_DISCONTINUED"
  | "SUPPLIER_OFFER_UPDATED"
  | "SUPPLIER_STOCK_UPDATED"
  | "SUPPLIER_PRICE_UPDATED";

export interface ProductTranslation {
  locale: string;
  name: string;
  shortDescription?: string;
  description?: string;
  features?: string[];
  warnings?: string[];
  seoTitle?: string;
  seoDescription?: string;
  slug?: string;
}

/** Technical values are never translated. */
export interface ProductTechnicalData {
  [key: string]: string | number | boolean | null;
}

export interface ProductDimensions {
  length?: number;
  width?: number;
  height?: number;
  unit?: "mm" | "cm" | "m";
}

export interface ProductImage {
  url: string;
  alt?: string;
  sortOrder: number;
  type: ProductImageType;
}

export interface ProductSeoByLocale {
  locale: string;
  seoTitle?: string;
  seoDescription?: string;
  slug: string;
}

export interface AutomotiveCompatibility {
  vehicleId?: string;
  make: string;
  model: string;
  generation?: string;
  engine?: string;
  yearFrom?: number;
  yearTo?: number;
  kw?: number;
  ps?: number;
  oemNumbers?: string[];
  tecdocReference?: string;
  source?: string;
  verified?: boolean;
}

export interface SupplierOffer {
  supplierId: string;
  supplierSku: string;
  supplierEan?: string;
  supplierPrice: number;
  currency: string;
  stock: number;
  leadTimeDays?: number;
  shippingRegions?: string[];
  lastUpdated: string;
  source: string;
  sourceType: SupplierSourceType;
  reliabilityScore?: number;
}

export interface ProductPricing {
  supplierCost: number;
  shippingCost: number;
  marketplaceFee: number;
  paymentFee: number;
  vat: number;
  margin: number;
  customerPrice: number;
  currency: string;
}

export interface ProductStock {
  quantity: number;
  availability: "IN_STOCK" | "LOW_STOCK" | "OUT_OF_STOCK" | "PREORDER" | "UNKNOWN";
  lastUpdated: string;
}

export interface MarketAvailabilityEntry {
  countryCode: string;
  status: "ACTIVE" | "DISABLED" | "REVIEW_REQUIRED";
  reason?: string;
}

export interface ProductEngineProduct {
  productId: string;
  sku: string;
  ean?: string;
  gtin?: string;
  mpn?: string;
  oem?: string;
  brand: string;
  manufacturer?: string;
  categoryId: string;
  subcategoryId?: string;
  productType: ProductType;
  status: ProductEngineStatus;
  weight?: number;
  weightUnit?: "kg" | "g";
  dimensions?: ProductDimensions;
  images: ProductImage[];
  technicalData: ProductTechnicalData;
  compatibility: AutomotiveCompatibility[];
  translations: ProductTranslation[];
  supplierOffers: SupplierOffer[];
  pricing: ProductPricing;
  stock: ProductStock;
  availability: MarketAvailabilityEntry[];
  seo: ProductSeoByLocale[];
  createdAt: string;
  updatedAt: string;
  /** Link to source BuzzardProduct when loaded from static catalog. */
  _source?: BuzzardProduct;
}

export interface ProductSnapshot {
  snapshotId: string;
  productId: string;
  sku: string;
  ean?: string;
  name: string;
  supplierId: string;
  supplierSku: string;
  purchasePrice: number;
  customerPrice: number;
  currency: string;
  taxContext?: {
    rate: number;
    included: boolean;
    reverseCharge: boolean;
    reason: string;
  };
  capturedAt: string;
}

export interface ProductValidationResult {
  valid: boolean;
  status: ProductEngineStatus;
  errors: Array<{ field: string; code: string; message: string }>;
  warnings: Array<{ field: string; code: string; message: string }>;
}

export interface DuplicateMatchResult {
  match: boolean;
  method: "gtin" | "ean" | "mpn_oem" | "brand_mpn" | "attributes" | null;
  existingProductId?: string;
  confidence: number;
}

export interface SupplierSelectionCriteria {
  stockWeight?: number;
  priceWeight?: number;
  leadTimeWeight?: number;
  reliabilityWeight?: number;
  marginWeight?: number;
}

export interface SupplierSelectionResult {
  offer: SupplierOffer;
  score: number;
  reasons: string[];
}

export interface ProductEvent {
  type: ProductEventType;
  productId: string;
  timestamp: string;
  payload?: Record<string, unknown>;
}

export interface NormalizeSupplierInput {
  raw: Record<string, unknown>;
  supplierId: string;
  sourceType: SupplierSourceType;
  sourceProductId?: string;
}

export interface ProductEngineAdminRow {
  productId: string;
  sku: string;
  brand: string;
  name: string;
  status: ProductEngineStatus;
  supplierCount: number;
  stock: number;
  customerPrice: string;
  markets: string;
  categoryId: string;
}
