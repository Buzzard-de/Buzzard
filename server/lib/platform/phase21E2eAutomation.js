const { runSyntheticCustomerJourney } = require("../commerce/syntheticCustomerJourney");
const { evaluateSalesGate } = require("../salesSafetyGate");
const { isEnabled: orderAutomationEnabled } = require("../orderAutomation");
const { finalizePhase } = require("./phaseGateFinalize");

function evaluatePhase21E2eAutomation() {
  const journey = runSyntheticCustomerJourney();
  const sales = evaluateSalesGate();
  const auto = orderAutomationEnabled();

  const checks = [
    { id: "E2E_JOURNEY", ok: journey.ok === true && journey.stepCount === journey.expectedSteps },
    { id: "E2E_SALES_LOCKED", ok: sales.status === "LOCKED" || sales.locked === true },
    { id: "E2E_NO_CAPTURE", ok: journey.paymentCaptured === false },
    { id: "E2E_ORDER_AUTO", ok: auto === true || typeof auto === "boolean" },
    { id: "E2E_PRODUCTION_RUN", ok: false, status: "BLOCKED_EXTERNAL", note: "Live production rehearsal" },
  ];

  return finalizePhase(21, "Uçtan uca otomasyon", checks, ["E2E_PRODUCTION_RUN"]);
}

module.exports = { evaluatePhase21E2eAutomation };