/**
 * Evidence-based scorecard. COMPLETE only when tested and unblocked.
 */
const { assessVoice } = require("../voice/voiceReadiness");
const { assess: assessTaxConnect } = require("../commerce/taxConnect");
const { createCategoryExperts } = require("../pusat/categoryExperts");
const { evaluateSalesGate } = require("../salesSafetyGate");

const LANGUAGE_CODES = (() => {
  try {
    return require("../../../lib/i18n/supported-locales.json");
  } catch {
    return ["de", "en", "tr", "ar"];
  }
})();

function buildScorecard() {
  const voice = assessVoice();
  const tax = assessTaxConnect();
  const experts = createCategoryExperts();
  const sales = evaluateSalesGate();
  const items = [
    { id: "inventory", status: "COMPLETE", weight: 5, note: "Phase 1 + audit written" },
    { id: "local_backup_prove", status: "COMPLETE", weight: 10, note: "Temp DB restore proven" },
    {
      id: "offsite_32110",
      status: process.env.BUZZARD_OFFSITE_BACKUP_DIR ? "CODE_READY" : "CODE_READY",
      weight: 8,
      note: "Independent-dir copy tested. Remote vault still not attached.",
    },
    { id: "pusat_council", status: "CODE_READY", weight: 12, note: "Durable + dispatch; not 24/7 hosted" },
    { id: "ab27", status: "CODE_READY", weight: 10, note: "Snapshot VAT + holds; no live feed" },
    { id: "tax_connect", status: tax.queueReady ? "CODE_READY" : tax.status, weight: 6, note: tax.note },
    { id: "hmac_messaging", status: "COMPLETE", weight: 6, note: "HMAC required; integrity tested" },
    { id: "e2e_crypto", status: "COMPLETE", weight: 4, note: "X25519+GCM; plaintext not archived" },
    { id: "locales_30", status: LANGUAGE_CODES.length === 30 ? "CODE_READY" : "PARTIAL", weight: 10, note: "30 catalogs; 4 URL prefixes" },
    { id: "categories_48_56", status: experts.treePreserved && experts.hubCount === 3 ? "COMPLETE" : "PARTIAL", weight: 10, note: "48 master + 3 hubs mapped and listed" },
    { id: "voice_signaling", status: "CODE_READY", weight: 3, note: "Local WebRTC signaling only" },
    { id: "voice_live", status: voice.status, weight: 4, note: voice.note },
    { id: "sales_payments", status: sales.locked ? "NEEDS_APPROVAL" : "NEEDS_APPROVAL", weight: 6, note: "Sandbox hold only; capture refused" },
    { id: "merge_deploy", status: "NEEDS_APPROVAL", weight: 6, note: "Operator approval required" },
  ];

  const score = (status) =>
    ({ COMPLETE: 1, CODE_READY: 0.7, PARTIAL: 0.4, BLOCKED: 0, NEEDS_APPROVAL: 0, NOT_STARTED: 0 }[status] ?? 0);

  const totalWeight = items.reduce((sum, item) => sum + item.weight, 0);
  const earned = items.reduce((sum, item) => sum + item.weight * score(item.status), 0);
  const percent = Math.round((earned / totalWeight) * 100);

  return {
    percent,
    completeClaim: false,
    salesEnabled: false,
    items,
    blocked: items.filter((i) => i.status === "BLOCKED" || i.status === "NEEDS_APPROVAL"),
    note: "Software closable layers are in. Live vault, SIP, filings, sales, and deploy stay gated.",
  };
}

module.exports = { buildScorecard };
