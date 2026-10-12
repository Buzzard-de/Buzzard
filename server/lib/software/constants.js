/**
 * Software-completion constants. Does not replace Pusat or commerce constants.
 * MARKET_UNDERCUT stays unimplemented in this slice.
 */

const SOFTWARE_VERSION = "1.6.7";

const CANONICAL_ENGINES = Object.freeze({
  orchestrator: "pusat",
  pricing: "server/lib/pricing.js",
  productCreate: "server/lib/pim/productCore.createProduct",
  productWriteBoundary: "server/lib/pim/productWriteBoundary",
  productValidate: "server/lib/pim/productValidation + productValidator",
  inventory: "server/lib/operations/stockEngine + server/lib/software/inventory",
  order: "server/lib/commerce/orderService + pusat.automations.orderAutomation",
  supplier: "server/lib/supplier/adapterRegistry",
  payment: "server/lib/commerce/paymentService",
  returns: "server/lib/returnsRma",
  marketplace: "server/lib/software/marketplace",
  shipping: "server/lib/commerce/shippingProvider",
  tracking: "server/lib/software/tracking",
  customer: "server/lib/customer/customerOrderBridge",
  customs: "server/lib/productValidator.validateCustomsDecision",
  memory: "server/lib/pusat/memory",
  guardian: "server/lib/pusat/guardian",
  approval: "server/lib/pusat/approval",
});

const STOCK_SOURCE = Object.freeze({
  SUPPLIER_FEED: "supplier_feed",
  WAREHOUSE: "warehouse",
  ESTIMATE: "estimate",
  FORECAST: "forecast",
  UNVERIFIED: "unverified",
});

const RESERVATION_STATUS = Object.freeze({
  ACTIVE: "ACTIVE",
  RELEASED: "RELEASED",
  EXPIRED: "EXPIRED",
  BLOCKED: "BLOCKED",
});

const TRACKING_STATUS = Object.freeze({
  CREATED: "CREATED",
  IN_TRANSIT: "IN_TRANSIT",
  OUT_FOR_DELIVERY: "OUT_FOR_DELIVERY",
  DELIVERED: "DELIVERED",
  EXCEPTION: "EXCEPTION",
  DELAYED: "DELAYED",
  UNKNOWN: "UNKNOWN",
});

const LOCATION_TYPE = Object.freeze({
  CARRIER_GPS: "carrier_gps",
  CARRIER_EVENT: "carrier_event",
  ESTIMATED: "estimated",
  NOT_AVAILABLE: "not_available",
});

const CONNECTOR_STATUS = Object.freeze({
  NONE: "connector_absent",
  DRAFT: "connector_draft",
  MOCK: "mock_connector",
  INTEGRATION_CODE: "integration_code",
  TESTED: "tested_integration",
  CREDENTIALS_PENDING: "credentials_pending",
  LIVE_VERIFIED: "live_verified",
  BLOCKED: "blocked",
});

const VOICE_ADAPTERS = Object.freeze([
  "twilio",
  "stt",
  "tts",
  "webrtc",
  "realtime",
  "digital_human",
]);

const DEFAULT_STALE_STOCK_MS = 24 * 60 * 60 * 1000;
const DEFAULT_STALE_TRACKING_MS = 6 * 60 * 60 * 1000;

const HEALTH_STATUS = Object.freeze({
  PASS: "PASS",
  PARTIAL: "PARTIAL",
  BLOCKED: "BLOCKED",
  NOT_CONFIGURED: "NOT_CONFIGURED",
  NOT_TESTED: "NOT_TESTED",
  FAILED: "FAILED",
});

const RETURN_SIDE_STATUS = Object.freeze({
  NOT_REQUESTED: "NOT_REQUESTED",
  REQUESTED: "REQUESTED",
  DRAFTED: "DRAFTED",
  APPROVED: "APPROVED",
  REJECTED: "REJECTED",
  PENDING: "PENDING",
  RECEIVED: "RECEIVED",
  BLOCKED: "BLOCKED",
});

const TASK_STATUS_VIEW = Object.freeze({
  QUEUED: "PENDING",
  RUNNING: "RUNNING",
  WAITING_FOR_APPROVAL: "WAITING_APPROVAL",
  COMPLETED: "COMPLETED",
  FAILED: "FAILED",
  CANCELLED: "CANCELLED",
  BLOCKED: "FAILED",
  DEAD_LETTERED: "DEAD_LETTER",
});

module.exports = {
  SOFTWARE_VERSION,
  CANONICAL_ENGINES,
  STOCK_SOURCE,
  RESERVATION_STATUS,
  TRACKING_STATUS,
  LOCATION_TYPE,
  CONNECTOR_STATUS,
  VOICE_ADAPTERS,
  DEFAULT_STALE_STOCK_MS,
  DEFAULT_STALE_TRACKING_MS,
  HEALTH_STATUS,
  RETURN_SIDE_STATUS,
  TASK_STATUS_VIEW,
};
