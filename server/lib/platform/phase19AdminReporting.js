const { getIntegrationStatus } = require("../commercialIntegrations");
const { buildIntegrationSnapshots } = require("../operations/integrationSnapshots");
const { finalizePhase } = require("./phaseGateFinalize");

function evaluatePhase19AdminReporting() {
  const status = getIntegrationStatus();
  const snaps = buildIntegrationSnapshots();

  const checks = [
    { id: "ADM_INTEGRATION_STATUS", ok: status != null && status.salesEnabled === false },
    { id: "ADM_OPERATIONAL", ok: status.operational != null || status.connectors != null },
    { id: "ADM_SNAPSHOTS", ok: snaps.financeOps != null && snaps.hubSeo != null },
    { id: "ADM_LIVE_BI", ok: false, status: "BLOCKED_EXTERNAL", note: "Production BI warehouse" },
  ];

  return finalizePhase(19, "Yönetim ve raporlama", checks, ["ADM_LIVE_BI"]);
}

module.exports = { evaluatePhase19AdminReporting };