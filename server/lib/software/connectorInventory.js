/**
 * Honest local classification. Not live verification.
 */

const tecdocAdapter = require("../adapters/tecdocAdapter");
const interCarsAdapter = require("../adapters/interCarsAdapter");

function supplierConnectors() {
  const tecdoc = tecdocAdapter.describeStatus();
  const interCars = interCarsAdapter.describeStatus();
  return [
    { id: "csv", class: "IMPLEMENTED", live: "BLOCKED_EXTERNAL_DEPENDENCY", note: "Local CSV preview only." },
    { id: "xml", class: "IMPLEMENTED", live: "BLOCKED_EXTERNAL_DEPENDENCY", note: "Local XML preview only." },
    { id: "json", class: "IMPLEMENTED", live: "BLOCKED_EXTERNAL_DEPENDENCY", note: "Local JSON preview only." },
    { id: "mock", class: "IMPLEMENTED", live: "BLOCKED_EXTERNAL_DEPENDENCY", note: "Test adapter. Orders disabled." },
    { id: "api", class: "PARTIAL", live: "BLOCKED_EXTERNAL_DEPENDENCY", note: "Interface exists. Live HTTP blocked without credentials." },
    { id: "real_supplier", class: "PARTIAL", live: "BLOCKED_EXTERNAL_DEPENDENCY", note: "realSupplierConnector dry-run default." },
    {
      id: "tecdoc",
      class: "PARTIAL",
      live: tecdoc.blocked,
      liveVerified: false,
      httpAttempted: tecdoc.httpAttempted,
      keyPresent: tecdoc.keyPresent,
      note: tecdoc.note,
    },
    {
      id: "inter_cars",
      class: "PARTIAL",
      live: interCars.blocked,
      liveVerified: false,
      httpAttempted: interCars.httpAttempted,
      keyPresent: interCars.keyPresent,
      note: interCars.note,
    },
  ];
}

function marketplaceConnectors() {
  return [
    { id: "amazon", class: "PARTIAL", live: "BLOCKED_EXTERNAL_DEPENDENCY", adapterExists: true },
    { id: "ebay", class: "PARTIAL", live: "BLOCKED_EXTERNAL_DEPENDENCY", adapterExists: true },
    { id: "google_shopping", class: "PARTIAL", live: "BLOCKED_EXTERNAL_DEPENDENCY", adapterExists: true },
    { id: "tiktok_shop", class: "PARTIAL", live: "BLOCKED_EXTERNAL_DEPENDENCY", adapterExists: true },
    { id: "kaufland", class: "PARTIAL", live: "BLOCKED_EXTERNAL_DEPENDENCY", adapterExists: true },
    { id: "allegro", class: "PARTIAL", live: "BLOCKED_EXTERNAL_DEPENDENCY", adapterExists: true },
    { id: "bol", class: "STUB", live: "BLOCKED_EXTERNAL_DEPENDENCY", adapterExists: false, missing: "vendor contract + credentials" },
    { id: "cdiscount", class: "STUB", live: "BLOCKED_EXTERNAL_DEPENDENCY", adapterExists: false, missing: "vendor contract + credentials" },
    { id: "otto", class: "STUB", live: "BLOCKED_EXTERNAL_DEPENDENCY", adapterExists: false, missing: "vendor contract + credentials" },
    { id: "emag", class: "STUB", live: "BLOCKED_EXTERNAL_DEPENDENCY", adapterExists: false, missing: "vendor contract + credentials" },
    { id: "skroutz", class: "STUB", live: "BLOCKED_EXTERNAL_DEPENDENCY", adapterExists: false, missing: "vendor contract + credentials" },
  ].map((row) => ({ ...row, published: false, liveVerified: false }));
}

function paymentBankConnectors() {
  return [
    { id: "stripe", class: "IMPLEMENTED", live: "BLOCKED_EXTERNAL_DEPENDENCY", liveVerified: false, note: "Mock-tested adapter. Not sandbox/live verified." },
    { id: "paypal", class: "IMPLEMENTED", live: "BLOCKED_EXTERNAL_DEPENDENCY", liveVerified: false, note: "Mock-tested adapter. Not sandbox/live verified." },
    { id: "sepa", class: "STUB", live: "BLOCKED_EXTERNAL_DEPENDENCY", liveVerified: false },
    { id: "commercial_bank", class: "NOT_IMPLEMENTED", live: "BLOCKED_EXTERNAL_DEPENDENCY", liveVerified: false },
    { id: "deutsche_bundesbank", class: "NOT_IMPLEMENTED", live: "NOT_IMPLEMENTED", liveVerified: false, note: "No private-account query API assumed." },
    { id: "iban_name_check", class: "NOT_IMPLEMENTED", live: "RESEARCH_REQUIRED", liveVerified: false },
    { id: "mock", class: "CODE_READY", live: "NEVER_LIVE", liveVerified: false },
  ];
}

module.exports = { supplierConnectors, marketplaceConnectors, paymentBankConnectors };
