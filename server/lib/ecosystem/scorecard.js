/**
 * Evidence-based scorecard. COMPLETE only when tested and unblocked.
 */
const { assessVoice } = require("../voice/voiceReadiness");
const { assess: assessTaxConnect } = require("../commerce/taxConnect");
const { createCategoryExperts } = require("../pusat/categoryExperts");
const { LANGUAGE_CODES } = (() => {
  try {
    return { LANGUAGE_CODES: require("../../../lib/i18n/supported-locales.json") };
  } catch {
    return { LANGUAGE_CODES: ["de", "en", "tr", "ar"] };
  }
})();

function buildScorecard() {
  const voice = assessVoice();
  const tax = assessTaxConnect();
  const experts = createCategoryExperts();
  const items = [
    { id: "inventory", status: "COMPLETE", weight: 5, note: "Phase 1 + audit written" },
    { id: "local_backup_prove", status: "COMPLETE", weight: 10, note: "Temp DB restore proven" },
    { id: "offsite_32110", status: process.env.BUZZARD_OFFSITE_BACKUP_DIR ? "CODE_READY" : "BLOCKED", weight: 8, note: "Separate host/vault required" },
    { id: "pusat_council", status: "CODE_READY", weight: 12, note: "Durable + dispatch; not 24/7 hosted" },
    { id: "ab27", status: "CODE_READY", weight: 10, note: "Snapshot VAT + holds; no live feed" },
    { id: "tax_connect", status: tax.status, weight: 6, note: tax.note },
    { id: "hmac_messaging", status: "CODE_READY", weight: 6, note: "Integrity only, not E2E" },
    { id: "e2e_crypto", status: "BLOCKED", weight: 4, note: "Needs client-held keys" },
    { id: "locales_30", status: LANGUAGE_CODES.length === 30 ? "CODE_READY" : "PARTIAL", weight: 10, note: "Catalogs loaded; URL prefixes remain 4" },
    { id: "categories_48_56", status: experts.treePreserved && experts.hubCount === 3 ? "CODE_READY" : "PARTIAL", weight: 10, note: "48 master + 3 hubs mapped" },
    { id: "voice", status: voice.status, weight: 7, note: voice.note },
    { id: "sales_payments", status: "NEEDS_APPROVAL", weight: 6, note: "Intentionally off" },
    { id: "merge_deploy", status: "NEEDS_APPROVAL", weight: 6, note: "Operator approval required" },
  ];

  const score = (status) =>
    ({ COMPLETE: 1, CODE_READY: 0.7, PARTIAL: 0.4, BLOCKED: 0, NEEDS_APPROVAL: 0, NOT_STARTED: 0 }[status] ?? 0);

  const totalWeight = items.reduce((sum, item) => sum + item.weight, 0);
  const earned = items.reduce((sum, item) => sum + item.weight * score(item.status), 0);
  const percent = Math.round((earned / totalWeight) * 100);

  return {
    percent,
    completeClaim: percent === 100 && items.every((i) => i.status === "COMPLETE"),
    salesEnabled: false,
    items,
    blocked: items.filter((i) => i.status === "BLOCKED" || i.status === "NEEDS_APPROVAL"),
    note: "Not a production-finished ecosystem. percent is evidence-weighted, not a go-live certificate.",
  };
}

module.exports = { buildScorecard };
