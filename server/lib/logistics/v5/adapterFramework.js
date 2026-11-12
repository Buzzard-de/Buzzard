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

const KNOWN_CARRIERS = new Set([
  "dhl",
  "dhl-parcel-de",
  "dpd",
  "dpd-esolutions",
  "dpd-baltic-rest",
  "gls",
  "gls-shipit",
  "hermes",
  "hermes-germany-hsi",
  "ups",
  "ups-developer",
]);

function trackingResult(op, extra = {}) {
  audit("blocked_live_op", { op, ...extra });
  return {
    ok: false,
    live: false,
    mock: false,
    blocked: true,
    status: "BLOCKED_EXTERNAL",
    trackingNumber: null,
    events: [],
    delivered: false,
    shipmentCreated: false,
    operation: op,
    salesEnabled: isSalesEnabled(),
    ...extra,
  };
}

function trackingRequest(id) {
  if (id && typeof id === "object") {
    const response = id.carrierResponse && typeof id.carrierResponse === "object" ? id.carrierResponse : null;
    const events = Array.isArray(id.events) ? id.events : Array.isArray(response?.events) ? response.events : [];
    return {
      trackingNumber: id.trackingNumber || id.id || response?.trackingNumber || null,
      events,
      mock: id.mock === true || id.source === "mock" || String(id.trackingNumber || id.id || "").toUpperCase() === "MOCK",
      delivered: id.delivered === true || id.status === "DELIVERED" || events.some((event) => String(event.code || event.status || "").toUpperCase() === "DELIVERED"),
      timeout: id.timeout === true,
      networkError: id.networkError === true,
      contract: response,
    };
  }
  const text = id == null ? "" : String(id).trim();
  return {
    trackingNumber: text || null,
    events: [],
    mock: text.toUpperCase() === "MOCK",
    delivered: false,
    timeout: false,
    networkError: false,
    contract: null,
  };
}

function duplicateEvents(events) {
  const seen = new Set();
  for (const event of events) {
    const key = `${event.code || event.status || ""}|${event.at || ""}|${event.description || ""}`;
    if (seen.has(key)) return true;
    seen.add(key);
  }
  return false;
}

function resolveTracking(op, carrierId, id, flags = {}) {
  if (flags.forceTimeout) return trackingResult(op, { code: "TIMEOUT" });
  if (flags.networkError || flags.outage) return trackingResult(op, { code: flags.networkError ? "NETWORK_ERROR" : "CARRIER_OUTAGE" });
  const known = KNOWN_CARRIERS.has(String(carrierId || "").toLowerCase());
  if (!known) return trackingResult(op, { code: "CARRIER_UNKNOWN", carrierId: carrierId || null });
  const request = trackingRequest(id);
  if (request.timeout) return trackingResult(op, { code: "TIMEOUT" });
  if (request.networkError) return trackingResult(op, { code: "NETWORK_ERROR" });
  if (request.mock) return trackingResult(op, { code: "MOCK_REJECTED" });
  if (!request.trackingNumber) return trackingResult(op, { code: "MISSING_TRACKING_NUMBER" });
  if (!/^[A-Za-z0-9][A-Za-z0-9-]{5,}$/.test(String(request.trackingNumber))) {
    return trackingResult(op, { code: "INVALID_TRACKING_NUMBER" });
  }
  if (duplicateEvents(request.events)) return trackingResult(op, { code: "DUPLICATE_TRACKING_EVENT" });
  if (request.delivered) return trackingResult(op, { code: "DELIVERY_UNCONFIRMED" });
  const response = request.contract;
  const shape = Boolean(response && response.trackingNumber && response.carrier && response.receivedAt && Array.isArray(response.events) && response.events.length);
  return trackingResult(op, {
    code: shape ? "LIVE_CONNECTION_REQUIRED" : "LIVE_CONNECTION_ABSENT",
    contract: shape ? "VALID_SHAPE" : "NO_LIVE_CONNECTION",
  });
}

function quoteBlocked(op, code, extra = {}) {
  audit("blocked_live_op", { op, code });
  return {
    ok: false,
    live: false,
    mock: false,
    blocked: true,
    status: "BLOCKED_EXTERNAL",
    rates: [],
    validatedAddress: null,
    commercialEligibility: "BLOCKED",
    shippingCost: null,
    operation: op,
    code,
    error: { code },
    salesEnabled: isSalesEnabled(),
    ...extra,
  };
}

function resolveQuote(op, carrierId, req = {}, flags = {}) {
  if (flags.forceTimeout || req.timeout === true) return quoteBlocked(op, "TIMEOUT");
  if (flags.networkError || req.networkError === true) return quoteBlocked(op, "NETWORK_ERROR");
  if (flags.outage) return quoteBlocked(op, CARRIER_ERRORS.CARRIER_OUTAGE);
  if (!KNOWN_CARRIERS.has(String(carrierId || "").toLowerCase())) {
    return quoteBlocked(op, "CARRIER_UNKNOWN", { carrierId: carrierId || null });
  }
  if (req.mock === true || req.source === "mock" || Array.isArray(req.rates)) return quoteBlocked(op, "MOCK_REJECTED");
  if (req.weightKg != null && Number(req.weightKg) > 1000) {
    return quoteBlocked(op, CARRIER_ERRORS.UNSUPPORTED_PARCEL_SIZE);
  }
  const shaped = Boolean(req.origin && req.country && Number(req.weightKg) > 0 && req.dimensions);
  return quoteBlocked(op, shaped ? "LIVE_CONNECTION_REQUIRED" : "LIVE_CONNECTION_ABSENT", {
    contract: shaped ? "VALID_SHAPE" : "NO_LIVE_CONNECTION",
  });
}

function resolveAddress(carrierId, addr, flags = {}) {
  if (flags.forceTimeout || addr?.timeout === true) return quoteBlocked("validateAddress", "TIMEOUT");
  if (flags.networkError || addr?.networkError === true) return quoteBlocked("validateAddress", "NETWORK_ERROR");
  if (flags.outage) return quoteBlocked("validateAddress", CARRIER_ERRORS.CARRIER_OUTAGE);
  if (!KNOWN_CARRIERS.has(String(carrierId || "").toLowerCase())) {
    return quoteBlocked("validateAddress", "CARRIER_UNKNOWN", { carrierId: carrierId || null });
  }
  if (addr?.mock === true || addr?.source === "mock") return quoteBlocked("validateAddress", "MOCK_REJECTED");
  const country = String(addr?.country || "").trim().toUpperCase();
  const postal = String(addr?.postalCode || addr?.postcode || "").trim();
  if (!country || !postal) return quoteBlocked("validateAddress", "MISSING_ADDRESS");
  const { countryList, isValidPostcodeShape } = require("./coverageEngine");
  const iso = country === "GR" ? "EL" : country;
  if (!countryList().includes(iso)) return quoteBlocked("validateAddress", "COUNTRY_UNKNOWN");
  if (!isValidPostcodeShape(iso, postal)) return quoteBlocked("validateAddress", CARRIER_ERRORS.INVALID_ADDRESS);
  return quoteBlocked("validateAddress", "LIVE_CONNECTION_REQUIRED", { contract: "VALID_SHAPE" });
}

function createAdapter({
  carrierId,
  apiLevel = 0,
  apiType = "NOT_VERIFIED",
  outage = false,
  forceTimeout = false,
  networkError = false,
} = {}) {
  const ctx = { carrierId, apiLevel, apiType, contract_status: "NONE", sandbox_status: "NOT_AVAILABLE" };
  return {
    ...ctx,
    getRates: (req = {}) => resolveQuote("getRates", carrierId, req, { forceTimeout, networkError, outage }),
    validateAddress: (addr) => resolveAddress(carrierId, addr, { forceTimeout, networkError, outage }),
    getServiceOptions: () => resolveQuote("getServiceOptions", carrierId, {}, { forceTimeout, networkError, outage }),
    createShipment: (req) => blocked("createShipment", { reason: "Real labels and shipments are disabled.", requestIgnored: Boolean(req) }),
    cancelShipment: () => blocked("cancelShipment"),
    createLabel: () => blocked("createLabel", { errorCode: CARRIER_ERRORS.LABEL_FAILURE }),
    trackShipment: (id) => resolveTracking("trackShipment", carrierId, id, { forceTimeout, networkError, outage }),
    getTrackingEvents: (id) => resolveTracking("getTrackingEvents", carrierId, id, { forceTimeout, networkError, outage }),
    createPickup: () => blocked("createPickup"),
    cancelPickup: () => blocked("cancelPickup"),
    createReturn: () => blocked("createReturn", { label: false, commercialEffect: false }),
    getReturnLabel: () => blocked("getReturnLabel", { errorCode: CARRIER_ERRORS.RETURN_FAILURE }),
    getPickupPoints: () => resolveQuote("getPickupPoints", carrierId, {}, { forceTimeout, networkError, outage }),
    getLockers: () => resolveQuote("getLockers", carrierId, {}, { forceTimeout, networkError, outage }),
    getCoverage: (postalCode, country) => {
      if (forceTimeout) return quoteBlocked("getCoverage", "TIMEOUT");
      if (networkError) return quoteBlocked("getCoverage", "NETWORK_ERROR");
      if (outage) return quoteBlocked("getCoverage", CARRIER_ERRORS.CARRIER_OUTAGE);
      if (!KNOWN_CARRIERS.has(String(carrierId || "").toLowerCase())) {
        return quoteBlocked("getCoverage", "CARRIER_UNKNOWN", { carrierId: carrierId || null });
      }
      if (country && postalCode && postalCode !== "UNKNOWN") {
        const { isValidPostcodeShape } = require("./coverageEngine");
        if (!isValidPostcodeShape(country === "GR" ? "EL" : country, postalCode)) {
          return quoteBlocked("getCoverage", CARRIER_ERRORS.UNSUPPORTED_POSTCODE);
        }
      }
      return quoteBlocked("getCoverage", "LIVE_CONNECTION_ABSENT", { contract: "NO_LIVE_CONNECTION" });
    },
    getDeliveryEstimate: () => resolveQuote("getDeliveryEstimate", carrierId, {}, { forceTimeout, networkError, outage }),
    generateLabel: () => blocked("generateLabel", { errorCode: CARRIER_ERRORS.LABEL_FAILURE }),
    getTracking: (id) => resolveTracking("getTracking", carrierId, id, { forceTimeout, networkError, outage }),
    getServicePoints: () => resolveQuote("getServicePoints", carrierId, {}, { forceTimeout, networkError, outage }),
    getDeliveryOptions: () => resolveQuote("getDeliveryOptions", carrierId, {}, { forceTimeout, networkError, outage }),
    adapterVersion: "v5-mc14",
    retryPolicy: { maxAttempts: 3, backoff: "CODE_READY_MOCK", live: false },
    circuitBreaker: outage ? "OPEN" : "CLOSED_UNKNOWN_HEALTH",
    untrustedExternalPayloads: true,
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
  const capabilityUnknown = {
    rateQuote: "UNKNOWN",
    shipmentCreation: "DOCUMENTED_NOT_SANDBOX_TESTED",
    labelGeneration: "DOCUMENTED_NOT_SANDBOX_TESTED",
    tracking: "DOCUMENTED_NOT_SANDBOX_TESTED",
    cancellation: "UNKNOWN",
    pickup: "UNKNOWN",
    returns: "UNKNOWN",
    webhook: "UNKNOWN",
    authentication: "CONTRACT_REQUIRED",
    sandbox: "CONTRACT_REQUIRED",
    countryRestrictions: "UNKNOWN",
  };
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
      capabilities: capabilityUnknown,
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
      capabilities: capabilityUnknown,
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
      capabilities: capabilityUnknown,
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
      capabilities: capabilityUnknown,
    },
    {
      carrierId: "inpost-group-developers",
      brand: "InPost",
      country: "PL",
      docs: "https://developers.inpost-group.com/shipping-guide",
      apiType: "REST",
      contractRequired: true,
      sandbox_status: "CONTRACT_REQUIRED",
      sandboxVerified: false,
      liveVerified: false,
      apiLevel: 2,
      mc11Maturity: 1,
      accessConditions: "CONTRACT_AND_DEVELOPER_ACCOUNT_REQUIRED",
      capabilities: { ...capabilityUnknown, shipmentCreation: "DOCUMENTED_NOT_SANDBOX_TESTED" },
      note: "Public shipping guide is not nationwide own-fleet proof and not sandbox success.",
    },
    {
      carrierId: "packeta-docs",
      brand: "Packeta",
      country: "CZ",
      docs: "https://docs.packeta.com/cs/docs/introduction",
      apiType: "REST",
      contractRequired: true,
      sandbox_status: "CONTRACT_REQUIRED",
      sandboxVerified: false,
      liveVerified: false,
      apiLevel: 2,
      mc11Maturity: 1,
      accessConditions: "CONTRACT_REQUIRED",
      capabilities: capabilityUnknown,
    },
    {
      carrierId: "postnord-booking",
      brand: "PostNord",
      country: "SE",
      docs: "https://developer.postnord.no/browse-api/api-information/transport-booking-v2",
      apiType: "REST",
      contractRequired: true,
      sandbox_status: "CONTRACT_REQUIRED",
      sandboxVerified: false,
      liveVerified: false,
      apiLevel: 2,
      mc11Maturity: 1,
      accessConditions: "CONTRACT_REQUIRED",
      capabilities: { ...capabilityUnknown, rateQuote: "DOCUMENTED_NOT_SANDBOX_TESTED", pickup: "DOCUMENTED_NOT_SANDBOX_TESTED", returns: "DOCUMENTED_NOT_SANDBOX_TESTED" },
      note: "Booking API documents Nordic booking; country list in docs is not postcode-level coverage ingest.",
    },
    {
      carrierId: "posti-postra",
      brand: "Posti",
      country: "FI",
      docs: "https://api.posti.com/api-postra.html",
      apiType: "REST",
      contractRequired: true,
      sandbox_status: "CONTRACT_REQUIRED",
      sandboxVerified: false,
      liveVerified: false,
      apiLevel: 2,
      mc11Maturity: 1,
      accessConditions: "OAUTH_AND_CONTRACT",
      capabilities: { ...capabilityUnknown, pickup: "DOCUMENTED_NOT_SANDBOX_TESTED", authentication: "OAUTH_DOCUMENTED" },
    },
    {
      carrierId: "ctt-ecommerce-api",
      brand: "CTT",
      country: "PT",
      docs: "https://enviosecommerceapi.ctt.pt/v3/",
      apiType: "REST",
      contractRequired: true,
      sandbox_status: "CONTRACT_REQUIRED",
      sandboxVerified: false,
      liveVerified: false,
      apiLevel: 2,
      mc11Maturity: 1,
      accessConditions: "CONTRACT_REQUIRED",
      capabilities: capabilityUnknown,
    },
    {
      carrierId: "dpd-esolutions",
      brand: "DPD",
      country: "MULTI",
      docs: "https://esolutions.dpd.com/entwickler/dpdwebservices/dokumentationen.aspx",
      apiType: "SOAP_OR_REST",
      contractRequired: true,
      sandbox_status: "CONTRACT_REQUIRED",
      sandboxVerified: false,
      liveVerified: false,
      apiLevel: 2,
      mc11Maturity: 1,
      accessConditions: "CONTRACT_REQUIRED",
      capabilities: capabilityUnknown,
      note: "Public eSolutions docs. Baltic REST also documents sandbox hostnames; no credentials used; sandboxVerified remains false.",
    },
    {
      carrierId: "dpd-baltic-rest",
      brand: "DPD",
      country: "LT",
      docs: "https://www.dpd.com/wp-content/uploads/sites/235/2023/04/DPD-API-documentation-v1-2-1.pdf",
      apiType: "REST",
      contractRequired: true,
      sandbox_status: "URL_DOCUMENTED_NO_CREDENTIALS",
      sandboxHostDocumented: "https://sandbox-esiunta.dpd.lt/api/v1",
      sandboxVerified: false,
      liveVerified: false,
      apiLevel: 2,
      mc11Maturity: 1,
      accessConditions: "CONTRACT_REQUIRED",
      capabilities: { ...capabilityUnknown, sandbox: "URL_DOCUMENTED_NOT_TESTED" },
      note: "Sandbox hostname in public PDF is not a passed sandbox test.",
    },
    {
      carrierId: "austrian-post-group-developer",
      brand: "Österreichische Post",
      country: "AT",
      docs: "https://developer.austrian-post-group.com/",
      apiType: "REST",
      contractRequired: true,
      sandbox_status: "CONTRACT_REQUIRED",
      sandboxVerified: false,
      liveVerified: false,
      apiLevel: 2,
      mc11Maturity: 1,
      accessConditions: "JWT_AND_CONTRACT",
      capabilities: {
        ...capabilityUnknown,
        shipmentCreation: "DOCUMENTED_NOT_SANDBOX_TESTED",
        labelGeneration: "DOCUMENTED_NOT_SANDBOX_TESTED",
        webhook: "DOCUMENTED_NOT_SANDBOX_TESTED",
        authentication: "JWT_DOCUMENTED",
      },
    },
    {
      carrierId: "fan-courier-selfawb",
      brand: "FAN Courier",
      country: "RO",
      docs: "https://fancourier.ro/wp-content/uploads/2023/07/EN_FANCourier_API-2.0-160523.pdf",
      apiType: "REST",
      contractRequired: true,
      sandbox_status: "CONTRACT_REQUIRED",
      sandboxVerified: false,
      liveVerified: false,
      apiLevel: 2,
      mc11Maturity: 1,
      accessConditions: "SELFAWB_CONTRACT_REQUIRED",
      capabilities: {
        ...capabilityUnknown,
        rateQuote: "DOCUMENTED_NOT_SANDBOX_TESTED",
        returns: "DOCUMENTED_NOT_SANDBOX_TESTED",
        pickup: "DOCUMENTED_NOT_SANDBOX_TESTED",
      },
      note: "PDF states signed contract required. No credentials used.",
    },
    {
      carrierId: "hermes-germany-hsi",
      brand: "Hermes Germany",
      country: "DE",
      docs: "https://de-api.hermesworld.com/docs/",
      apiType: "REST",
      contractRequired: true,
      sandbox_status: "SUPERVISED_INTEGRATION_PROJECT",
      sandboxVerified: false,
      liveVerified: false,
      apiLevel: 2,
      mc11Maturity: 1,
      accessConditions: "BUSINESS_CUSTOMER_OR_SOFTWARE_PARTNER_APPROVAL",
      capabilities: {
        ...capabilityUnknown,
        shipmentCreation: "DOCUMENTED_NOT_SANDBOX_TESTED",
        labelGeneration: "DOCUMENTED_NOT_SANDBOX_TESTED",
        tracking: "DOCUMENTED_NOT_SANDBOX_TESTED",
        pickup: "DOCUMENTED_NOT_SANDBOX_TESTED",
        returns: "DOCUMENTED_NOT_SANDBOX_TESTED",
        authentication: "OAUTH2_DOCUMENTED",
      },
      note: "Public HSI docs. Test credentials only via supervised integration. No application made.",
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
  CARRIER_ERRORS,
  normalizeTracking,
  API_LEVELS,
  MC11_MATURITY,
  priorityCatalog,
  documentationCatalog,
  LIVE_BLOCK,
};
