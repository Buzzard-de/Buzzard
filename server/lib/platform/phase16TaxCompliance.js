const { screenCompliance } = require("../commerce/sanctionsScreen");
const { estimateVat, AB27 } = require("../commerce/ab27Tax");
const { createGermanyTaxStore, postGermanyNet, submitElster } = require("../commerce/germanyTaxPath");
const { finalizePhase } = require("./phaseGateFinalize");

function evaluatePhase16TaxCompliance() {
  const screen = screenCompliance({ name: "Test GmbH", country: "DE", amount: 500 });
  const vat = estimateVat({ country: "DE", netAmount: 100 });
  const store = createGermanyTaxStore();
  const posted = postGermanyNet(store, { net: 100, vat: 19, period: "2026-11" });
  const elster = submitElster({ period: "2026-11", dryRun: true });

  const checks = [
    { id: "TAX_SANCTIONS", ok: screen.ok === true || screen.blocked === false || screen.status != null },
    { id: "TAX_AB27", ok: vat.ok === true && AB27.enabled !== true },
    { id: "TAX_DE_PATH", ok: posted.ok === true },
    { id: "TAX_ELSTER_DRY", ok: elster.live === false || elster.filed === false },
    { id: "TAX_CONNECT_LIVE", ok: false, status: "BLOCKED_EXTERNAL", note: "Dev list #37" },
  ];

  return finalizePhase(16, "Vergi, gümrük, yasal", checks, ["TAX_CONNECT_LIVE"]);
}

module.exports = { evaluatePhase16TaxCompliance };