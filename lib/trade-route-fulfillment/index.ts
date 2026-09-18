export type {
  CarrierProfileId,
  CarrierSelectionResult,
  FulfillmentHoldReason,
  FulfillmentOriginResolution,
  FulfillmentOriginSource,
  ShippingQuoteResult,
  TargetCountryResolution,
  TargetCountrySource,
  TradeRouteClassification,
  TradeRouteFlags,
  TradeRouteFulfillmentSnapshot,
  TradeRoutePipelineInput,
  TradeRoutePipelineResult,
  TradeRouteType,
} from "./types";

export { resolveTargetCountry, normalizeCountryCode, isKnownMarketCountry } from "./targetCountry";
export { resolveFulfillmentOrigin } from "./fulfillmentOrigin";
export { classifyTradeRoute } from "./tradeRoute";
export { quoteShipping, estimateParcelWeightKg } from "./shippingQuote";
export { selectCarrier, CARRIER_PROFILES } from "./carrierSelection";
export { runTradeRouteFulfillmentPipeline } from "./orchestrator";
export {
  attachTrackingToOrder,
  type OrderTrackingSnapshot,
} from "./trackingAttach";
export {
  clearTradeRoutePipelineCache,
  getCachedPipelineSnapshot,
  pipelineCacheKey,
} from "./idempotency";
