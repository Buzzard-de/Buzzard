/**
 * Smart carrier selection. Never auto-picks cheapest. Never promises unverified dates.
 */
const { isSalesEnabled } = require("../../salesMode");
const { lookupCoverage } = require("./coverageEngine");
const { createAdapter, priorityCatalog } = require("./adapterFramework");
const { audit } = require("./auditLog");

function iso(code) {
  const c = String(code || "").toUpperCase();
  return c === "GR" ? "EL" : c;
}

function selectCarrier({
  origin,
  destination,
  postalCode,
  weightKg,
  dimensions,
  productType,
  supplierId,
  preferCheapest = false,
} = {}) {
  const dest = iso(destination);
  const cov = lookupCoverage({ country: dest, postalCode });
  audit("select_carrier", { dest, postalCode: postalCode || "UNKNOWN" });

  if (!cov.supported) {
    return {
      status: "HOLD_FOR_REVIEW",
      reason: "UNSUPPORTED_DESTINATION",
      cannotStartShipment: true,
      liveRate: false,
      estimateIsNotPrice: true,
      salesEnabled: isSalesEnabled(),
      coverage: cov,
      selected: null,
      fallback: null,
    };
  }

  const catalog = priorityCatalog();
  const scored = catalog.map((c, i) => ({
    ...c,
    score: 3 - i,
    priceUnknown: true,
    qualityUnknown: true,
    speedUnknown: true,
    reliabilityUnknown: true,
  }));

  const primary = scored[0] || null;
  const fallback = scored[1] || null;
  const capable = Boolean(primary && primary.apiLevel >= 2);
  const secondOk = Boolean(fallback && fallback.apiLevel >= 2);

  let status = "HOLD_FOR_REVIEW";
  let reason = "NO_CONTRACTED_CARRIER";
  if (capable && cov.delivery_available === true) {
    status = "CANDIDATE_NOT_LIVE";
    reason = "DOCS_ONLY";
  } else if (capable) {
    status = "CANDIDATE_COVERAGE_UNKNOWN";
    reason = "POSTCODE_COVERAGE_UNKNOWN";
  } else if (!secondOk) {
    status = "HOLD_FOR_REVIEW";
    reason = "NO_FALLBACK_CAPABLE_CARRIER";
  }

  return {
    status,
    reason,
    origin: origin || "UNKNOWN",
    destination: dest,
    postalCode: postalCode || "UNKNOWN",
    weightKg: weightKg == null ? "UNKNOWN" : weightKg,
    dimensions: dimensions || "UNKNOWN",
    productType: productType || "UNKNOWN",
    supplierId: supplierId || "UNKNOWN",
    supplierIsNotCarrier: supplierId ? supplierId !== (primary && primary.carrierId) : true,
    cheapestNotAutoSelected: true,
    ignoredPreferCheapest: preferCheapest === true,
    cannotStartShipment: true,
    liveRate: false,
    contracted: false,
    estimateIsNotPrice: true,
    customerDeliveryDate: "NOT_PROMISED",
    coverage: cov,
    selected: primary,
    fallback: secondOk ? fallback : null,
    adapter: createAdapter({ carrierId: primary?.carrierId, apiLevel: primary?.apiLevel || 0 }),
    salesEnabled: isSalesEnabled(),
    dropshipping: {
      supplierPreparesGoods: true,
      carrierTransports: true,
      selectionUsesActualOriginAndDestination: true,
    },
  };
}

function mockShipmentLifecycle(selectResult) {
  const adapter = selectResult.adapter || createAdapter({ carrierId: "mock" });
  return {
    live: false,
    createShipment: adapter.createShipment({ mock: true }),
    createLabel: adapter.createLabel(),
    track: adapter.trackShipment("MOCK"),
    returns: adapter.createReturn(),
    returnLabel: adapter.getReturnLabel(),
  };
}

module.exports = { selectCarrier, mockShipmentLifecycle };
