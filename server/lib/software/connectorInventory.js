/**
 * Honest local classification. Not live verification.
 */

function supplierConnectors() {
  return [
    { id: "csv", class: "IMPLEMENTED", live: "BLOCKED_EXTERNAL_DEPENDENCY", note: "Local CSV preview only." },
    { id: "xml", class: "IMPLEMENTED", live: "BLOCKED_EXTERNAL_DEPENDENCY", note: "Local XML preview only." },
    { id: "json", class: "IMPLEMENTED", live: "BLOCKED_EXTERNAL_DEPENDENCY", note: "Local JSON preview only." },
    { id: "mock", class: "IMPLEMENTED", live: "BLOCKED_EXTERNAL_DEPENDENCY", note: "Test adapter. Orders disabled." },
    { id: "api", class: "PARTIAL", live: "BLOCKED_EXTERNAL_DEPENDENCY", note: "Interface exists. Live HTTP blocked without credentials." },
    { id: "real_supplier", class: "PARTIAL", live: "BLOCKED_EXTERNAL_DEPENDENCY", note: "realSupplierConnector dry-run default." },
    { id: "tecdoc", class: "PARTIAL", live: "BLOCKED_EXTERNAL_DEPENDENCY", note: "No live credentials in this environment." },
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

module.exports = { supplierConnectors, marketplaceConnectors };
