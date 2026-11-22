const { runPhase11Evidence } = require("../pim/phase11Evidence");
const { finalizePhase } = require("./phaseGateFinalize");

function evaluatePhase11PimSot() {
  const evidence = runPhase11Evidence();
  const checks = [
    { id: "PIM_SOT_IDENTITY", ok: evidence.identity?.ok === true && evidence.active === false },
    { id: "PIM_SOT_VALIDATION", ok: evidence.validation?.ok === true },
    { id: "PIM_SOT_RECORD", ok: evidence.record?.ok === true },
    { id: "PIM_SOT_PUBLISH_GATE", ok: evidence.record?.publish != null && evidence.record?.publish !== "PUBLISHED" },
    { id: "PIM_LIVE_PUBLISH", ok: false, status: "BLOCKED_EXTERNAL", note: "Sales gate + human approval" },
  ];
  return {
    ...finalizePhase(11, "Ürün yönetimi ve PIM (SoT)", checks, ["PIM_LIVE_PUBLISH"]),
    evidence,
  };
}

module.exports = { evaluatePhase11PimSot };
