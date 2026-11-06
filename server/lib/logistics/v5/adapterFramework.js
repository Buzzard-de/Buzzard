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

const CARRIER_ERRORS = Object.freeze({
  AUTHENTICATION: "AUTHENTICATION_ERROR",
  RATE_LIMIT: "RATE_LIMIT",
  INVALID_ADDRESS: "INVALID_ADDRESS",
  UNSUPPORTED_POSTCODE: "UNSUPPORTED_POSTCODE",
  UNSUPPORTED_PARCEL_SIZE: "UNSUPPORTED_PARCEL_SIZE",
  SERVICE_UNAVAILABLE: "SERVICE_UNAVAILABLE",
  CARRIER_OUTAGE: "CARRIER_OUTAGE",
  TIMEOUT: "TIMEOUT",
  INVALID_TRACKING: "INVALID_TRACKING_NUMBER",
  LABEL_FAILURE: "LABEL_GENERATION_FAILURE",
  RETURN_FAILURE: "RETURN_FAILURE",
});

function error(op, code, extra = {}) {
  audit("adapter_error", { op, code });
  return { ok: false, live: false, mock: true, operation: op, error: { code, ...extra } };
}

function createAdapter({
  carrierId,
  apiLevel = 0,
  apiType = "NOT_VERIFIED",
  outage = false,
  forceTimeout = false,
} = {}) {
  const ctx = { carrierId, apiLevel, apiType, contract_status: "NONE", sandbox_status: "NOT_AVAILABLE" };
  const gate = (op) => {
    if (outage) return error(op, CARRIER_ERRORS.CARRIER_OUTAGE);
    if (forceTimeout) return error(op, CARRIER_ERRORS.TIMEOUT);
    return null;
  };
  return {
    ...ctx,
    getRates: (req = {}) => {
      const g = gate("getRates");
      if (g) return g;
      if (req.weightKg != null && Number(req.weightKg) > 1000) {
        return error("getRates", CARRIER_ERRORS.UNSUPPORTED_PARCEL_SIZE, { weightKg: req.weightKg });
      }
      return mockOk("getRates", { rates: [], estimateIsNotPrice: true, liveRate: false });
    },
    validateAddress: (addr) => {
      const g = gate("validateAddress");
      if (g) return g;
      const valid = Boolean(addr && addr.country && addr.postalCode);
      if (!valid) return error("validateAddress", CARRIER_ERRORS.INVALID_ADDRESS);
      return mockOk("validateAddress", { valid: true, postalCode: addr.postalCode });
    },
    getServiceOptions: () => gate("getServiceOptions") || mockOk("getServiceOptions", { options: [] }),
    createShipment: (req) => blocked("createShipment", { reason: "Real labels and shipments are disabled.", requestIgnored: Boolean(req) }),
    cancelShipment: () => blocked("cancelShipment"),
    createLabel: () => blocked("createLabel", { errorCode: CARRIER_ERRORS.LABEL_FAILURE }),
    trackShipment: (id) => {
      const g = gate("trackShipment");
      if (g) return g;
      if (!id) return error("trackShipment", CARRIER_ERRORS.INVALID_TRACKING);
      return mockOk("trackShipment", {
        trackingId: id,
        events: normalizeTracking([{ code: "INFO", description: "Mock only. Not a live scan." }]),
      });
    },
    getTrackingEvents: (id) => gate("getTrackingEvents") || mockOk("getTrackingEvents", { trackingId: id || "MOCK", events: [] }),
    createPickup: () => blocked("createPickup"),
    cancelPickup: () => blocked("cancelPickup"),
    createReturn: () =>
      gate("createReturn") || mockOk("createReturn", { status: "MOCK_RETURN_NOT_LIVE", label: false }),
    getReturnLabel: () => blocked("getReturnLabel", { errorCode: CARRIER_ERRORS.RETURN_FAILURE }),
    getPickupPoints: () => gate("getPickupPoints") || mockOk("getPickupPoints", { points: [], coverage: "UNKNOWN" }),
    getLockers: () => gate("getLockers") || mockOk("getLockers", { lockers: [], coverage: "UNKNOWN" }),
    getCoverage: (postalCode, country) => {
      const g = gate("getCoverage");
      if (g) return g;
      if (country && postalCode && postalCode !== "UNKNOWN") {
        const { isValidPostcodeShape } = require("./coverageEngine");
        if (!isValidPostcodeShape(country === "GR" ? "EL" : country, postalCode)) {
          return error("getCoverage", CARRIER_ERRORS.UNSUPPORTED_POSTCODE, { postalCode, country });
        }
      }
      return mockOk("getCoverage", {
        postalCode: postalCode || "UNKNOWN",
        delivery_available: "UNKNOWN",
        pickup_available: "UNKNOWN",
        returns_available: "UNKNOWN",
        locker_available: "UNKNOWN",
        PUDO_available: "UNKNOWN",
        rural_delivery: "UNKNOWN",
        confidence_level: "UNKNOWN",
      });
    },
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

const MC11_MATURITY = Object.freeze({
  0: "NO_SOURCE_OR_DOCS",
  1: "OFFICIAL_DOCS_FOUND",
  2: "ADAPTER_SKELETON_READY",
  3: "MOCK_FIXTURE_TESTS_PASSED",
  4: "OFFICIAL_SANDBOX_E2E_PASSED",
  5: "CONTRACT_AND_LIVE_APPROVED",
});

function documentationCatalog() {
  const priority = priorityCatalog().map((c) => ({
    ...c,
    contractRequired: true,
    mc11Maturity: 3,
    mc11MaturityNote: "Existing apiLevel 2 kept. Shared mock adapter tests pass. No sandbox credentials.",
  }));
  const docsOnly = [
    {
      carrierId: "postnl-developer",
      brand: "PostNL",
      country: "NL",
      docs: "https://developer.postnl.nl/docs/",
      apiType: "REST",
      contractRequired: true,
      sandbox_status: "CONTRACT_REQUIRED",
      sandboxVerified: false,
      liveVerified: false,
      apiLevel: 2,
      mc11Maturity: 1,
      accessConditions: "CONTRACT_AND_DEVELOPER_ACCOUNT_REQUIRED",
    },
    {
      carrierId: "laposte-okapi",
      brand: "La Poste",
      country: "FR",
      docs: "https://developer.laposte.fr/",
      apiType: "REST",
      contractRequired: true,
      sandbox_status: "CONTRACT_REQUIRED",
      sandboxVerified: false,
      liveVerified: false,
      apiLevel: 2,
      mc11Maturity: 1,
      accessConditions: "CONTRACT_AND_DEVELOPER_ACCOUNT_REQUIRED",
    },
    {
      carrierId: "correos-developer",
      brand: "Correos",
      country: "ES",
      docs: "https://www.correos.es/es/en/companies/e-commerce/reinforce-your-ecommerce-logistics/api-integration",
      apiType: "REST",
      contractRequired: true,
      sandbox_status: "CONTRACT_REQUIRED",
      sandboxVerified: false,
      liveVerified: false,
      apiLevel: 2,
      mc11Maturity: 1,
      accessConditions: "CORREOS_ID_AND_TRANSPORT_CONTRACT",
    },
    {
      carrierId: "bpost-bpack-manual",
      brand: "bpost",
      country: "BE",
      docs: "https://bpost.freshdesk.com/support/home",
      apiType: "REST",
      contractRequired: true,
      sandbox_status: "CONTRACT_REQUIRED",
      sandboxVerified: false,
      liveVerified: false,
      apiLevel: 2,
      mc11Maturity: 1,
      accessConditions: "CONTRACT_REQUIRED",
      note: "Public integration manual exists; not a sandbox login.",
    },
  ];
  return [...priority, ...docsOnly];
}

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
      accessConditions: "CONTRACT_AND_DEVELOPER_ACCOUNT_REQUIRED",
      authFromPublicDocs: "API_KEY_OR_OAUTH_CONTRACT_REQUIRED",
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
      accessConditions: "CONTRACT_AND_DEVELOPER_ACCOUNT_REQUIRED",
      authFromPublicDocs: "API_KEY_OR_OAUTH_CONTRACT_REQUIRED",
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
      accessConditions: "CONTRACT_AND_DEVELOPER_ACCOUNT_REQUIRED",
      authFromPublicDocs: "API_KEY_OR_OAUTH_CONTRACT_REQUIRED",
    },
  ];
}

module.exports = {
  createAdapter,
  blocked,
  mockOk,
  error,
  CARRIER_ERRORS,
  normalizeTracking,
  API_LEVELS,
  MC11_MATURITY,
  priorityCatalog,
  documentationCatalog,
  LIVE_BLOCK,
};
