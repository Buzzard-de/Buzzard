import type { CustomsDecision } from "@/lib/customs-fulfillment-gate/types";

export type TradeRouteType =
  | "SAME_COUNTRY"
  | "EU_TO_EU"
  | "EU_TO_NON_EU"
  | "NON_EU_TO_EU"
  | "NON_EU_TO_NON_EU"
  | "UNKNOWN";

export type TargetCountrySource = "shipping_address" | "checkout" | "market";

export type FulfillmentOriginSource =
  | "shippingOrigin"
  | "warehouseCountry"
  | "fulfillmentCountry"
  | "supplierCountry"
  | "supplier.country";

export type FulfillmentHoldReason =
  | "TRADE_ROUTE_COUNTRY_MISMATCH"
  | "ORIGIN_UNKNOWN"
  | "TRADE_ROUTE_UNKNOWN"
  | "CUSTOMS_HOLD"
  | "SHIPPING_HOLD";

export interface TradeRouteFlags {
  requiresExportProcess: boolean;
  requiresImportProcess: boolean;
  requiresCustomsPrecheck: boolean;
  requiresCustomsDocuments: boolean;
  requiresDutyAssessment: boolean;
  requiresVatAssessment: boolean;
}

export interface TargetCountryResolution {
  ok: boolean;
  country?: string;
  source?: TargetCountrySource;
  errorCode?: "INVALID_COUNTRY" | "TRADE_ROUTE_COUNTRY_MISMATCH";
  errorMessage?: string;
  marketId?: string;
  shippingCountry?: string;
}

export interface FulfillmentOriginResolution {
  ok: boolean;
  originCountry?: string;
  source?: FulfillmentOriginSource;
  errorCode?: "ORIGIN_UNKNOWN";
  errorMessage?: string;
}

export interface TradeRouteClassification {
  tradeRoute: TradeRouteType;
  originCountry: string;
  destinationCountry: string;
  flags: TradeRouteFlags;
}

export interface ShippingQuoteResult {
  ok: boolean;
  shippingCost?: number;
  shippingCurrency?: string;
  region?: string;
  source?: string;
  errorCode?: string;
  errorMessage?: string;
}

export type CarrierProfileId = "DHL" | "DPD" | "GLS" | "UPS" | "DHL_EXPRESS";

export interface CarrierSelectionResult {
  ok: boolean;
  carrierId?: CarrierProfileId;
  serviceLevel?: string;
  shippingCost?: number;
  estimatedDelivery?: string;
  trackingSupported?: boolean;
  errorCode?: "NO_CARRIER" | "CARRIER_VALIDATION_FAILED";
  errorMessage?: string;
  evaluatedCarriers?: string[];
}

export interface TradeRouteFulfillmentSnapshot {
  pipelineVersion: string;
  targetCountry: string;
  targetCountrySource: TargetCountrySource;
  originCountry: string;
  originSource?: FulfillmentOriginSource;
  tradeRoute: TradeRouteType;
  tradeRouteFlags: TradeRouteFlags;
  customsDecision?: CustomsDecision;
  customsHold?: boolean;
  customsMissingFields?: string[];
  customsReason?: string;
  dutyEstimate?: number;
  taxEstimate?: number;
  exportRequired?: boolean;
  importRequired?: boolean;
  shippingQuoted?: boolean;
  shippingCost?: number;
  shippingCurrency?: string;
  carrierId?: CarrierProfileId;
  carrierServiceLevel?: string;
  estimatedDelivery?: string;
  trackingSupported?: boolean;
  holdReason?: FulfillmentHoldReason;
  holdMessage?: string;
  completedAt?: string;
  idempotencyKeys: Record<string, string>;
}

export interface TradeRoutePipelineInput {
  orderId: string;
  marketId: string;
  shippingAddress: {
    country: string;
    postalCode: string;
    city: string;
  };
  items: Array<{
    productId: string;
    quantity: number;
    supplierId: string;
    lineGross: number;
    productName: string;
  }>;
  currency: string;
  validatedCheckoutCountry?: string;
  supplier: {
    supplierId: string;
    country?: string;
    region?: string;
    shippingOrigin?: string;
    warehouseCountry?: string;
    fulfillmentCountry?: string;
    supplierCountry?: string;
  };
  weightKg?: number;
  dimensionsCm?: { length: number; width: number; height: number };
  serviceLevel?: string;
  idempotencyKey: string;
}

export interface TradeRoutePipelineResult {
  ok: boolean;
  snapshot?: TradeRouteFulfillmentSnapshot;
  errorCode?: FulfillmentHoldReason | "INVALID_COUNTRY";
  errorMessage?: string;
  events: Array<{ type: string; metadata?: Record<string, unknown> }>;
}
