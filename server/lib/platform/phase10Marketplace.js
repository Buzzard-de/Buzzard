const { runPhase10Evidence } = require("../marketplace/phase10Evidence");
const { finalizePhase } = require("./phaseGateFinalize");

function evaluatePhase10Marketplace() {
  const evidence = runPhase10Evidence();
  const checks = [
    { id: "MKT_REGISTRY", ok: evidence.registry.ok === true, count: evidence.registry.count },
    { id: "MKT_ACCOUNT", ok: evidence.account.ok === true },
    { id: "MKT_LISTING", ok: evidence.listing.ok === true && evidence.listing.invalidAccepted === false },
    { id: "MKT_PRICE_VAT", ok: evidence.price.ok === true, deRate: evidence.price.deRate, frRate: evidence.price.frRate },
    { id: "MKT_STOCK_ORDER", ok: evidence.stock.ok === true && evidence.orders.ok === true },
    { id: "MKT_REJECTION", ok: evidence.rejection.ok === true },
    { id: "MKT_RETRY", ok: evidence.retry.ok === true, attempts: evidence.retry.attempts },
    { id: "MKT_LOCALE", ok: evidence.locale.ok === true },
    { id: "MKT_CREDENTIALS", ok: evidence.credentials.ok === true && evidence.credentials.liveSuccess === false && evidence.credentials.armedLive === false },
    { id: "MKT_LIVE_PUBLISH", ok: false, status: "BLOCKED_EXTERNAL", note: "Marketplace live credentials" },
  ];

  return {
    ...finalizePhase(10, "Pazaryeri otomasyonu", checks, ["MKT_LIVE_PUBLISH"]),
    evidence,
  };
}

module.exports = { evaluatePhase10Marketplace };
