const { runPhase8Evidence } = require("../logistics/phase8Evidence");
const { finalizePhase } = require("./phaseGateFinalize");

function evaluatePhase8Logistics() {
  const evidence = runPhase8Evidence();
  const checks = [
    { id: "LOG_CARRIER_MASTER", ok: evidence.carriers?.ok === true && evidence.carriers.count >= 5 },
    { id: "LOG_CREATE_SHIPMENT", ok: evidence.carriers?.ok === true },
    { id: "LOG_TRACKING", ok: evidence.carriers?.folded === "FAILED" },
    { id: "LOG_ADDRESS", ok: evidence.country?.ok === true },
    { id: "LOG_RETURN_ENGINE", ok: evidence.country?.returnState === "RETURN_REQUESTED" },
    { id: "LOG_CONNECTOR_SNAPSHOT", ok: evidence.country?.quote === "UNKNOWN" },
    { id: "LOG_LIVE_RATES", ok: false, status: "BLOCKED_EXTERNAL", note: "Dev list #41" },
  ];
  return {
    ...finalizePhase(8, "Kargo ve lojistik", checks, ["LOG_LIVE_RATES"]),
    evidence,
  };
}

module.exports = { evaluatePhase8Logistics };
