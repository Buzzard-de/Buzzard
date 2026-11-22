const { evaluateSalesGate } = require("../salesSafetyGate");
const { runPhase21Evidence } = require("../commerce/phase21Evidence");
const { finalizePhase } = require("./phaseGateFinalize");

function evaluatePhase21E2eAutomation() {
  const evidence = runPhase21Evidence();
  const sales = evaluateSalesGate();
  const checks = [
    {
      id: "E2E_WORKFLOW",
      ok: evidence.workflow.ok === true,
      failed: evidence.workflow.failed,
      missing: evidence.workflow.missing,
    },
    {
      id: "E2E_SALES_LOCKED",
      ok: sales.status === "LOCKED" && sales.allowed !== true && evidence.salesEnabled === false,
      status: sales.status,
    },
    {
      id: "E2E_NO_CAPTURE",
      ok: evidence.payment.captured === false && evidence.payment.moneyMoved === false && evidence.refund.issued === false,
    },
    {
      id: "E2E_AUTOMATION_EXECUTED",
      ok: evidence.automation.executed === true && evidence.automation.recovered === true && evidence.automation.persisted === true && evidence.automation.denied === true,
      taskId: evidence.automation.taskId,
    },
    {
      id: "E2E_CROSS_MODULE",
      ok: evidence.cross.ok === true,
      failed: evidence.cross.failed,
    },
    { id: "E2E_PRODUCTION_RUN", ok: false, status: "BLOCKED_EXTERNAL", note: "Live production rehearsal" },
  ];

  return {
    ...finalizePhase(21, "Uçtan uca otomasyon", checks, ["E2E_PRODUCTION_RUN"]),
    evidence,
  };
}

module.exports = { evaluatePhase21E2eAutomation };
