const marketplaceRegistry = require("../marketplace/marketplaceConnectorRegistry");
const { preflightListing } = require("../marketplaceHub");
const { finalizePhase } = require("./phaseGateFinalize");

function evaluatePhase10Marketplace() {
  const snap = marketplaceRegistry.snapshot();
  const pre = preflightListing({
    marketplace: "amazon",
    productSku: "DRY-SKU-001",
    title: "Bremsbelag Set",
    gtin: "5901234123457",
    mpn: "P85073",
    imageLink: "https://cdn.test-supplier.example.de/p85073.jpg",
  });

  const checks = [
    { id: "MKT_REGISTRY", ok: Array.isArray(snap.connectors) || snap.count > 0 || snap.marketplaces != null },
    { id: "MKT_PREFLIGHT", ok: pre.live === false && pre.publishAllowed === false },
    { id: "MKT_VALIDATION", ok: pre.validation != null },
    { id: "MKT_LIVE_PUBLISH", ok: false, status: "BLOCKED_EXTERNAL", note: "Marketplace live credentials" },
  ];

  return finalizePhase(10, "Pazaryeri otomasyonu", checks, ["MKT_LIVE_PUBLISH"]);
}

module.exports = { evaluatePhase10Marketplace };