const { inventory, assignRules } = require("../buzzardNative/core/specialistInventory");
const { finalizePhase } = require("./phaseGateFinalize");

function evaluatePhase14AiSpecialists() {
  const inv = inventory();
  const rules = assignRules();

  const checks = [
    { id: "SPEC_INVENTORY", ok: inv.ok === true && inv.count === 17 },
    { id: "SPEC_NAMESPACES", ok: inv.uniqueNamespaces === true },
    { id: "SPEC_ASSIGN", ok: rules.pusatAssign === true },
    { id: "SPEC_REFUND_GATE", ok: rules.refundsGated === true },
    { id: "SPEC_LIVE_COUNCIL", ok: false, status: "BLOCKED_EXTERNAL", note: "LLM council live mode" },
  ];

  return finalizePhase(14, "AI uzmanlık modülleri", checks, ["SPEC_LIVE_COUNCIL"]);
}

module.exports = { evaluatePhase14AiSpecialists };