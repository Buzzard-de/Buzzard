const { getIntegrationStatus } = require("../commercialIntegrations");
const { buildIntegrationSnapshots } = require("../operations/integrationSnapshots");
const { finalizePhase } = require("./phaseGateFinalize");

function evaluatePhase19AdminReporting() {
  const status = getIntegrationStatus();
  const snaps = buildIntegrationSnapshots();
  const operational = status.operational || {};

  const checks = [
    { id: "ADM_INTEGRATION_STATUS", ok: status != null && status.salesEnabled === false },
    {
      id: "ADM_OPERATIONAL",
      ok: operational.live === false
        && operational.productionReady === false
        && operational.salesEnabled === false
        && operational.marketplace?.channelCount === 10,
    },
    {
      id: "ADM_SNAPSHOTS",
      ok: snaps.financeOps?.live === false
        && snaps.financeOps?.taxConnect?.filingLive === false
        && snaps.financeOps?.payments?.anyLive === false
        && snaps.hubSeo?.ok === true
        && snaps.hubSeo?.activeHubs === 50
        && snaps.hubSeo?.completeClaim === false,
    },
    { id: "ADM_LIVE_BI", ok: false, status: "BLOCKED_EXTERNAL", note: "Production BI warehouse" },
  ];

  return {
    ...finalizePhase(19, "Yönetim ve raporlama", checks, ["ADM_LIVE_BI"]),
    evidence: {
      ok: checks.filter((check) => check.id !== "ADM_LIVE_BI").every((check) => check.ok),
      salesEnabled: status.salesEnabled === true,
      live: operational.live === true,
      channels: operational.marketplace?.channelCount,
      filingLive: snaps.financeOps?.taxConnect?.filingLive === true,
      hubs: snaps.hubSeo?.activeHubs,
    },
  };
}

module.exports = { evaluatePhase19AdminReporting };
