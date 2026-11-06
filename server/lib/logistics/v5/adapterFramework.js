/**
 * Standard carrier adapter. Live shipment operations stay blocked.
 */
const { isSalesEnabled } = require("../../salesMode");
const { audit } = require("./auditLog");

const LIVE_BLOCK = {
  ok: false,
  live: false,
  blocked: true,
  code: "LIVE_SHIPMENT_DISABLED",
};

function blocked(op, extra = {}) {
  audit("blocked_live_op", { op, ...extra });
  return { ...LIVE_BLOCK, operation: op, salesEnabled: isSalesEnabled(), ...extra };
}

function mockOk(op, data) {
  audit("mock_op", { op });
  return { ok: true, live: false, mock: true, sandboxVerified: false, operation: op, data };
}

function createAdapter({ carrierId, apiLevel = 0, apiType = "NOT_VERIFIED" } = {}) {
  const ctx = { carrierId, apiLevel, apiType, contract_status: "NONE", sandbox_status: "NOT_AVAILABLE" };
  return {
    ...ctx,
    getRates: () => mockOk("getRates", { rates: [], estimateIsNotPrice: true, liveRate: false }),
    validateAddress: (addr) =>
      mockOk("validateAddress", {
        valid: Boolean(addr && addr.country && addr.postalCode),
        postalCode: addr?.postalCode || "UNKNOWN",
      }),
    getServiceOptions: () => mockOk("getServiceOptions", { options: [] }),
    createShipment: (req) => blocked("createShipment", { reason: "Real labels and shipments are disabled.", requestIgnored: Boolean(req) }),
    cancelShipment: () => blocked("cancelShipment"),
    createLabel: () => blocked("createLabel"),
    trackShipment: (id) =>
      mockOk("trackShipment", {
        trackingId: id || "MOCK",
        events: normalizeTracking([{ code: "INFO", description: "Mock only. Not a live scan." }]),
      }),
    getTrackingEvents: (id) => mockOk("getTrackingEvents", { trackingId: id || "MOCK", events: [] }),
    createPickup: () => blocked("createPickup"),
    cancelPickup: () => blocked("cancelPickup"),
    createReturn: () =>
      mockOk("createReturn", { status: "MOCK_RETURN_NOT_LIVE", label: false }),
    getReturnLabel: () => blocked("getReturnLabel"),
    getPickupPoints: () => mockOk("getPickupPoints", { points: [], coverage: "UNKNOWN" }),
    getLockers: () => mockOk("getLockers", { lockers: [], coverage: "UNKNOWN" }),
    getCoverage: (postalCode) =>
      mockOk("getCoverage", {
        postalCode: postalCode || "UNKNOWN",
        delivery_available: "UNKNOWN",
        pickup_available: "UNKNOWN",
        returns_available: "UNKNOWN",
        locker_available: "UNKNOWN",
        PUDO_available: "UNKNOWN",
        rural_delivery: "UNKNOWN",
        confidence_level: "UNKNOWN",
      }),
    getDeliveryEstimate: () =>
      mockOk("getDeliveryEstimate", {
        estimated_delivery_days: "UNKNOWN",
        notACustomerPromise: true,
      }),
  };
}

function normalizeTracking(events) {
  return (events || []).map((e, i) => ({
    seq: i + 1,
    code: e.code || "UNKNOWN",
    description: e.description || "UNKNOWN",
    at: e.at || "UNKNOWN",
    live: false,
  }));
}

const API_LEVELS = Object.freeze({
  0: "NAME_VERIFIED",
  1: "SERVICE_SCOPE_VERIFIED",
  2: "TECHNICAL_DOCS_FOUND",
  3: "ACCESS_CONDITIONS_VERIFIED",
  4: "SANDBOX_ACCESS_OBTAINED",
  5: "SANDBOX_TESTS_PASSED",
  6: "CONTRACT_COMPLETE",
  7: "PRODUCTION_APPROVED",
});

function priorityCatalog() {
  return [
    {
      carrierId: "dhl-parcel-de",
      brand: "DHL Parcel",
      country: "DE",
      apiLevel: 2,
      apiType: "REST",
      sandbox_status: "CONTRACT_REQUIRED",
      contract_status: "NONE",
      docs: "https://developer.dhl.com/api-reference/parcel-de-shipping-post-parcel-germany-v2",
      liveVerified: false,
      sandboxVerified: false,
    },
    {
      carrierId: "gls-shipit",
      brand: "GLS",
      country: "MULTI",
      apiLevel: 2,
      apiType: "REST",
      sandbox_status: "CONTRACT_REQUIRED",
      contract_status: "NONE",
      docs: "https://shipit.gls-group.com/documentation/webservices/5_2_5/WS-REST-API/rest_web_service_requests_samples.html",
      liveVerified: false,
      sandboxVerified: false,
    },
    {
      carrierId: "ups-developer",
      brand: "UPS",
      country: "MULTI",
      apiLevel: 2,
      apiType: "REST",
      sandbox_status: "CONTRACT_REQUIRED",
      contract_status: "NONE",
      docs: "https://developer.ups.com/api/reference/shipping",
      liveVerified: false,
      sandboxVerified: false,
    },
  ];
}

module.exports = {
  createAdapter,
  blocked,
  mockOk,
  normalizeTracking,
  API_LEVELS,
  priorityCatalog,
  LIVE_BLOCK,
};
