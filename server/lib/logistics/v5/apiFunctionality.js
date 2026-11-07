/**
 * Public-doc capability matrix. DOCUMENTATION is not a working integration.
 */
const FEATURES = [
  "rateQuote",
  "shipmentCreation",
  "labelGeneration",
  "tracking",
  "cancellation",
  "pickup",
  "returns",
  "webhook",
  "authentication",
  "sandbox",
];

function documented(extra = {}) {
  return {
    rateQuote: "UNKNOWN",
    shipmentCreation: "DOCUMENTED",
    labelGeneration: "DOCUMENTED",
    tracking: "DOCUMENTED",
    cancellation: "UNKNOWN",
    pickup: "UNKNOWN",
    returns: "UNKNOWN",
    webhook: "UNKNOWN",
    authentication: "DOCUMENTED_CONTRACT_REQUIRED",
    sandbox: "CONTRACT_REQUIRED",
    ...extra,
  };
}

function sandboxReadiness(entry) {
  const mock = entry.mc11Maturity === 3;
  const sandboxUrl = Boolean(entry.sandboxHostDocumented);
  return {
    carrierId: entry.carrierId,
    brand: entry.brand,
    DOCUMENTATION_ONLY: !mock,
    ADAPTER_DESIGN_READY: true,
    MOCK_TESTED: mock,
    SANDBOX_CREDENTIALS_REQUIRED: true,
    SANDBOX_READY: false,
    SANDBOX_VERIFIED: false,
    CONTRACT_REQUIRED: true,
    LIVE_CONTRACT_READY: false,
    sandboxUrlDocumented: sandboxUrl,
    note: mock
      ? "Shared mock adapter tests pass. No sandbox credentials."
      : sandboxUrl
        ? "Sandbox hostname appears in public docs. No credentials, not SANDBOX_VERIFIED."
        : "Official docs only. Contract required.",
  };
}

function functionalityFor(entry) {
  const byId = {
    "dhl-parcel-de": documented({
      rateQuote: "DOCUMENTED",
      pickup: "DOCUMENTED",
      returns: "DOCUMENTED",
      authentication: "API_KEY_OR_OAUTH_CONTRACT_REQUIRED",
    }),
    "gls-shipit": documented({ pickup: "UNKNOWN", returns: "UNKNOWN" }),
    "ups-developer": documented({
      rateQuote: "DOCUMENTED",
      pickup: "DOCUMENTED",
      returns: "DOCUMENTED",
      cancellation: "DOCUMENTED",
    }),
    "postnl-developer": documented({ rateQuote: "UNKNOWN" }),
    "laposte-okapi": documented({ rateQuote: "UNKNOWN" }),
    "correos-developer": documented({ authentication: "OAUTH_AND_CORREOS_ID" }),
    "bpost-bpack-manual": documented({ rateQuote: "UNKNOWN" }),
    "inpost-group-developers": documented({ shipmentCreation: "DOCUMENTED" }),
    "packeta-docs": documented(),
    "postnord-booking": documented({
      rateQuote: "DOCUMENTED",
      pickup: "DOCUMENTED",
      returns: "DOCUMENTED",
    }),
    "posti-postra": documented({ pickup: "DOCUMENTED", authentication: "OAUTH_DOCUMENTED" }),
    "ctt-ecommerce-api": documented(),
    "dpd-esolutions": documented(),
    "dpd-baltic-rest": documented({ sandbox: "URL_DOCUMENTED_NOT_TESTED" }),
    "austrian-post-group-developer": documented({
      webhook: "DOCUMENTED",
      authentication: "JWT_DOCUMENTED",
    }),
    "fan-courier-selfawb": documented({
      rateQuote: "DOCUMENTED",
      pickup: "DOCUMENTED",
      returns: "DOCUMENTED",
    }),
  };
  const features = byId[entry.carrierId] || documented();
  return {
    carrierId: entry.carrierId,
    brand: entry.brand,
    country: entry.country,
    docs: entry.docs,
    apiLevel: entry.apiLevel,
    mc11Maturity: entry.mc11Maturity,
    features,
    sandboxReadiness: sandboxReadiness(entry),
  };
}

function functionalityMatrix(catalog) {
  return (catalog || []).map(functionalityFor);
}

module.exports = { FEATURES, documented, sandboxReadiness, functionalityFor, functionalityMatrix };
