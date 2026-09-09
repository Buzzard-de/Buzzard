import type { VatContext } from "@/lib/market-engine/types";

/** Sales channel — direct store or marketplace. */
export type PricingChannel =
  | "direct"
  | "amazon"
  | "ebay"
  | "kaufland"
  | "allegro"
  | "bol"
  | "cdiscount"
  | "otto";

export type PricingStatus =
  | "VALID"
  | "PRICE_TOO_HIGH"
  | "BELOW_MINIMUM_MARGIN"
  | "NO_SUPPLIER_OFFER"
  | "OUT_OF_STOCK"
  | "MISSING_COST"
  | "MISSING_CURRENCY"
  | "MISSING_MARKET"
  | "INVALID_RULE"
  | "REVIEW_REQUIRED";

export type PaymentMethod = "card" | "paypal" | "sepa" | "instant" | "default";

export type RoundingMode = "none" | "nearest" | "psychological_99" | "nearest_49" | "nearest_19";

export interface FeeSchedule {
  feePercent: number;
  fixedFee: number;
  minimumFee?: number;
  maximumFee?: number;
  currency: string;
  status?: "ACTIVE" | "DISABLED";
  effectiveFrom?: string;
  effectiveTo?: string;
}

export interface MarginRule {
  targetMarginPercent: number;
  minimumMarginPercent: number;
}

export interface ReturnReserveConfig {
  returnRate: number;
  refundRate: number;
  averageReturnShippingCost: number;
  averageRefundLoss: number;
  supplierReturnAcceptanceRate: number;
  damagedReturnRate?: number;
}

export interface RoundingRule {
  mode: RoundingMode;
  step?: number;
}

export interface PriceBounds {
  minimumPrice: number;
  maximumPrice: number;
}

/** Input for a single price calculation — supplier offer must come from server-trusted source. */
export interface PricingInput {
  productId: string;
  supplierId: string;
  supplierOfferId?: string;
  marketId: string;
  channel: PricingChannel;
  currency?: string;
  customerType?: "B2C" | "B2B";
  paymentMethod?: PaymentMethod;
  categoryId?: string;
  sellerCountry?: string;
  /** Supplier offer fields — must NOT originate from untrusted client. */
  supplierOffer: {
    supplierPrice: number;
    currency: string;
    stock: number;
    lastUpdated: string;
    supplierSku?: string;
  };
  /** Optional overrides for tests — not accepted from client in production. */
  /** Test-only overrides — never accept from client in production. */
  _testOverrides?: {
    shippingCost?: number;
    targetMarginPercent?: number;
    minimumMarginPercent?: number;
  };
}

/** Canonical pricing result — auditable breakdown. */
export interface PricingResult {
  productId: string;
  supplierId: string;
  supplierOfferId?: string;
  marketId: string;
  channel: PricingChannel;
  currency: string;

  supplierNetPrice: number;
  supplierGrossPrice: number;
  supplierCurrency: string;

  shippingCost: number;
  shippingCurrency: string;

  paymentFee: number;
  marketplaceFee: number;
  marketplaceFixedFee: number;

  returnCostReserve: number;
  refundCostReserve: number;
  otherVariableCosts: number;

  taxContext: VatContext;
  targetMarginPercent: number;
  minimumMarginPercent: number;
  maximumPrice: number;
  minimumPrice: number;

  customerNetPrice: number;
  customerVat: number;
  customerGrossPrice: number;

  buzzardContributionMargin: number;
  pricingStatus: PricingStatus;
  calculatedAt: string;

  /** Total variable cost before margin (net, market currency). */
  totalVariableCost: number;

  /** Extension points for future competitive pricing — not populated yet. */
  competitivePricing?: {
    competitorPrice?: number;
    marketAveragePrice?: number;
    lowestMarketPrice?: number;
    recommendedCompetitivePrice?: number;
  };
}

/** Immutable order-time price snapshot. */
export interface PriceSnapshot {
  snapshotId: string;
  productId: string;
  supplierId: string;
  supplierOfferId?: string;
  marketId: string;
  channel: PricingChannel;
  currency: string;

  supplierCost: number;
  shippingCost: number;
  marketplaceFee: number;
  paymentFee: number;
  returnCostReserve: number;
  refundCostReserve: number;
  otherVariableCosts: number;

  taxContext: VatContext;
  customerNetPrice: number;
  customerVat: number;
  customerGrossPrice: number;
  buzzardContributionMargin: number;

  calculatedAt: string;
  capturedAt: string;
}

export interface PricingAuditEntry {
  productId: string;
  supplierId: string;
  supplierOfferId?: string;
  marketId: string;
  channel: PricingChannel;
  durationMs: number;
  pricingStatus: PricingStatus;
  calculatedPrice: number;
  margin: number;
  timestamp: string;
}

export interface PricingEngineAdminRow {
  productId: string;
  supplierId: string;
  marketId: string;
  channel: PricingChannel;
  supplierCost: string;
  shippingCost: string;
  marketplaceFee: string;
  paymentFee: string;
  returnReserve: string;
  targetMargin: string;
  calculatedPrice: string;
  actualMargin: string;
  pricingStatus: PricingStatus;
  lastCalculation: string;
}
