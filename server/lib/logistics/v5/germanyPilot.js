/**
 * Germany pilot readiness. No live/sandbox credentials. No applications filed.
 */
const FN = ["addressValidation", "postcodeCoverage", "carrierCompare", "rateQuote", "createShipment", "label", "tracking", "pickup", "returns", "fallback", "customerNotify", "performanceReport"];

function fnStatus(name) {
  const mock = ["addressValidation", "carrierCompare", "tracking", "returns", "fallback"];
  const blockedLive = ["createShipment", "label", "pickup", "rateQuote"];
  if (blockedLive.includes(name)) return "CODE_READY_MOCK";
  if (mock.includes(name)) return "MOCK_READY";
  if (name === "postcodeCoverage") return "SHAPE_ONLY_COVERAGE_UNKNOWN";
  if (name === "customerNotify") return "CODE_READY_NO_LIVE_SEND";
  if (name === "performanceReport") return "STRUCTURE_UNKNOWN_METRICS";
  return "CODE_READY_MOCK";
}

function germanyPilot() {
  const carriers = [
    {
      brand: "DHL Parcel Germany",
      carrierId: "dhl-parcel-de",
      docs: "https://developer.dhl.com/api-reference/parcel-de-shipping-post-parcel-germany-v2",
      commercialAccount: "CONTRACT_REQUIRED",
      sandbox: "CONTRACT_AND_DEVELOPER_ACCOUNT_REQUIRED",
      postcodeCoverage: "UNKNOWN",
      mc11Maturity: 3,
    },
    {
      brand: "GLS",
      carrierId: "gls-shipit",
      docs: "https://shipit.gls-group.com/documentation/webservices/5_2_5/WS-REST-API/rest_web_service_requests_samples.html",
      commercialAccount: "CONTRACT_REQUIRED",
      sandbox: "CONTRACT_REQUIRED",
      postcodeCoverage: "UNKNOWN",
      mc11Maturity: 3,
    },
    {
      brand: "UPS",
      carrierId: "ups-developer",
      docs: "https://developer.ups.com/api/reference/shipping",
      commercialAccount: "CONTRACT_REQUIRED",
      sandbox: "CONTRACT_REQUIRED",
      postcodeCoverage: "UNKNOWN",
      mc11Maturity: 3,
    },
    {
      brand: "DPD",
      carrierId: "dpd-esolutions",
      docs: "https://esolutions.dpd.com/entwickler/dpdwebservices/dokumentationen.aspx",
      commercialAccount: "CONTRACT_REQUIRED",
      sandbox: "CONTRACT_REQUIRED",
      postcodeCoverage: "UNKNOWN",
      mc11Maturity: 1,
    },
    {
      brand: "Hermes Germany",
      carrierId: "hermes-germany-hsi",
      docs: "https://de-api.hermesworld.com/docs/",
      commercialAccount: "BUSINESS_CUSTOMER_OR_SOFTWARE_PARTNER",
      sandbox: "SUPERVISED_INTEGRATION_PROJECT",
      postcodeCoverage: "UNKNOWN",
      mc11Maturity: 1,
    },
  ];
  return {
    country: "DE",
    liveAuthorized: false,
    salesEnabled: false,
    recommendedFirstSandboxAfterContract: "dhl-parcel-de",
    recommendedReason: "Public Parcel DE Shipping API docs + existing MOCK_TESTED shared adapter. Still CONTRACT_REQUIRED. No credentials.",
    functions: Object.fromEntries(FN.map((n) => [n, fnStatus(n)])),
    carriers: carriers.map((c) => ({
      ...c,
      LIVE_AUTHORIZED: false,
      SANDBOX_READY: false,
      SANDBOX_VERIFIED: false,
      MOCK_TESTED: c.mc11Maturity === 3,
    })),
    regionalLocalVerifiedParcel: 0,
    note: "No applications, contracts, or live labels.",
  };
}

function commercialPrep() {
  const unknown = {
    gruenderkonto: "UNKNOWN",
    volumeMinimum: "UNKNOWN",
    monthlyMinimum: "UNKNOWN",
    fuelSurcharge: "UNKNOWN",
    returnPricing: "UNKNOWN",
    contractTerm: "UNKNOWN",
    termination: "UNKNOWN",
    insurance: "UNKNOWN",
    paymentTerms: "UNKNOWN",
  };
  return ["DHL Parcel Germany", "GLS", "UPS", "DPD"].map((brand) => ({
    brand,
    ...unknown,
    apiAccess: "CONTRACT_REQUIRED",
    applicationFiledByAgent: false,
    live: false,
  }));
}

module.exports = { germanyPilot, commercialPrep, FN };
