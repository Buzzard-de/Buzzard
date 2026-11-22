const { decideOutcome } = require("../commerce/sanctionsScreen");
const { estimateVat, AB27 } = require("../commerce/ab27Tax");
const { createGermanyTaxStore, postGermanyNet, submitElster } = require("../commerce/germanyTaxPath");
const { finalizePhase } = require("./phaseGateFinalize");

function isListedPartyBlock(decision) {
  return decision?.outcome === "PROHIBITED" && decision?.code === "LISTED_PARTY";
}

function evaluatePhase16TaxCompliance() {
  const listed = decideOutcome({ retrievedAt: new Date().toISOString(), prohibited: true });
  const unknown = decideOutcome({});
  const loose = { ok: true, blocked: false, status: "CLEARED" };
  const vat = estimateVat({ country: "DE", netAmount: 100 });
  const store = createGermanyTaxStore();
  const posted = postGermanyNet(store, { netIncome: 100, period: "2026-11" });
  const elster = submitElster({ period: "2026-11", dryRun: true });

  const checks = [
    {
      id: "TAX_SANCTIONS",
      ok: isListedPartyBlock(listed)
        && unknown.outcome === "HUMAN_REVIEW"
        && !isListedPartyBlock(unknown)
        && !isListedPartyBlock(loose),
    },
    { id: "TAX_AB27", ok: vat.ok === true && AB27.enabled !== true },
    { id: "TAX_DE_PATH", ok: posted.ok === true && posted.net === 100 && posted.paymentAuthority === false && posted.filing === "WAITING_HUMAN" },
    {
      id: "TAX_ELSTER_DRY",
      ok: elster.ok === false && elster.live === false && elster.filed === false && elster.code === "ELSTER_BLOCKED",
    },
    { id: "TAX_CONNECT_LIVE", ok: false, status: "BLOCKED_EXTERNAL", note: "Dev list #37" },
  ];

  return {
    ...finalizePhase(16, "Vergi, gümrük, yasal", checks, ["TAX_CONNECT_LIVE"]),
    evidence: {
      ok: checks.filter((check) => check.id !== "TAX_CONNECT_LIVE").every((check) => check.ok),
      listed: listed.code,
      unknown: unknown.outcome,
      elster: elster.code,
      elsterFiled: elster.filed === true,
      elsterLive: elster.live === true,
    },
  };
}

module.exports = { evaluatePhase16TaxCompliance };
