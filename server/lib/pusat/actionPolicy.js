/**
 * Explicit action classification. Automatic approval is an allowlist.
 * Caller-supplied risk is not an input to this classification.
 */
const { DANGEROUS } = require("../buzzardNative/core/permissionEngine");

const AUTO_LOW = Object.freeze(["CREATE_REPORTS"]);

const EXTRA_HUMAN_REQUIRED = Object.freeze([
  "LIVE_PAYMENT",
  "FIAT_POLICY_CHANGE",
  "LIVE_CONNECTOR",
  "CARD_STORE",
  "SHIPMENT_CREATE",
  "MERGE",
  "PRODUCTION_RESTORE",
  "LOOSEN_SECURITY",
  "CHANGE_EGRESS_DENY",
  "ENABLE_SALES_OR_PAYMENTS",
  "ENABLE_LIVE_CARRIER",
  "EXPORT_SECRETS",
  "PURCHASE_ANYTHING",
  "DOWNLOAD_OR_HOST_MODELS",
  "HIGH_VALUE_SHIPMENT",
  "TRADE_SCREEN",
  "SANCTIONS_UNCERTAIN",
  "DEPLOYMENT",
  "POLICY_CHANGE",
]);

const HUMAN_REQUIRED = Object.freeze([...new Set([...DANGEROUS, ...EXTRA_HUMAN_REQUIRED])]);

const AUTO_LOW_SET = new Set(AUTO_LOW);
const HUMAN_REQUIRED_SET = new Set(HUMAN_REQUIRED);

function classifyAction(action) {
  const name = String(action || "").trim().toUpperCase();
  if (AUTO_LOW_SET.has(name)) {
    return { action: name, classification: "AUTO_LOW", risk: "LOW", registered: true, autoEligible: true };
  }
  if (HUMAN_REQUIRED_SET.has(name)) {
    return { action: name, classification: "HUMAN_REQUIRED", risk: "CRITICAL", registered: true, autoEligible: false };
  }
  return {
    action: name,
    classification: "UNREGISTERED",
    risk: "CRITICAL",
    registered: false,
    autoEligible: false,
    code: "UNREGISTERED_ACTION",
  };
}

module.exports = { AUTO_LOW, HUMAN_REQUIRED, classifyAction };
