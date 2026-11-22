const { inventory, assignRules } = require("../buzzardNative/core/specialistInventory");
const { dispatch } = require("../buzzardNative/core/specialistDispatch");
const { finalizePhase } = require("./phaseGateFinalize");

function evaluatePhase14AiSpecialists() {
  const inv = inventory();
  const rules = assignRules();
  const refund = dispatch({ agentId: "banu_hanim", kind: "CUSTOMER_REFUND", input: {} });

  const checks = [
    { id: "SPEC_INVENTORY", ok: inv.ok === true && inv.count === 17 },
    { id: "SPEC_NAMESPACES", ok: inv.uniqueNamespaces === true },
    { id: "SPEC_ASSIGN", ok: rules.pusatAssign === true },
    {
      id: "SPEC_REFUND_GATE",
      ok: refund.ok === false
        && refund.code === "HUMAN_GATE_REQUIRED"
        && refund.result?.ok === false
        && refund.result?.action === "CUSTOMER_REFUND"
        && refund.live === false,
    },
    { id: "SPEC_LIVE_COUNCIL", ok: false, status: "BLOCKED_EXTERNAL", note: "LLM council live mode" },
  ];

  return {
    ...finalizePhase(14, "AI uzmanlık modülleri", checks, ["SPEC_LIVE_COUNCIL"]),
    evidence: {
      ok: checks.filter((check) => check.id !== "SPEC_LIVE_COUNCIL").every((check) => check.ok),
      count: inv.count,
      refundCode: refund.code,
      refundOk: refund.ok === true,
      live: refund.live === true,
    },
  };
}

module.exports = { evaluatePhase14AiSpecialists };
