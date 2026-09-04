/**
 * Part 26 — Final production hardening constants.
 */
const FINAL_HARDENING_VERSION = "part26";

const FINAL_HARDENING_GATE = Object.freeze({
  CONFIGURATION: "configuration",
  AUTHENTICATION: "authentication",
  AUTHORIZATION: "authorization",
  API_PROTECTION: "apiProtection",
  SECURITY: "security",
  AUDIT: "audit",
  MONITORING: "monitoring",
  ALERTING: "alerting",
  INCIDENT_READINESS: "incidentReadiness",
  BACKUP_READINESS: "backupReadiness",
  DATABASE_READINESS: "databaseReadiness",
  WORKER_READINESS: "workerReadiness",
  SUPPLIER_READINESS: "supplierReadiness",
  PRODUCT_CATALOG_READINESS: "productCatalogReadiness",
  PAYMENT_READINESS: "paymentReadiness",
  COMMERCE_READINESS: "commerceReadiness",
  RELEASE_READINESS: "releaseReadiness",
  ROLLBACK_READINESS: "rollbackReadiness",
  ENVIRONMENT_SAFETY: "environmentSafety",
  GO_LIVE_APPROVAL: "goLiveApproval",
});

const FINAL_GATE_STATUS = Object.freeze({
  PASS: "PASS",
  CONDITION: "CONDITION",
  BLOCKED: "BLOCKED",
  FAIL: "FAIL",
});

const FINAL_DECISION_STATUS = Object.freeze({
  READY: "READY",
  CONDITION: "CONDITION",
  NOT_READY: "NOT_READY",
  BLOCKED: "BLOCKED",
});

const FINAL_HARDENING_POLICY = Object.freeze({
  diagnosticOnly: true,
  autoActivate: false,
  salesActivationAllowed: false,
  supplierActivationAllowed: false,
  paymentActivationAllowed: false,
  publishAllowed: false,
  liveImportAllowed: false,
});

module.exports = {
  FINAL_HARDENING_VERSION,
  FINAL_HARDENING_GATE,
  FINAL_GATE_STATUS,
  FINAL_DECISION_STATUS,
  FINAL_HARDENING_POLICY,
};
