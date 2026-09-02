/**
 * Part 20 — Admin / backoffice readiness gate names and incident classification.
 */
const ADMIN_BACKOFFICE_GATES = Object.freeze([
  "SYSTEM_HEALTH",
  "GO_LIVE_READINESS",
  "STOREFRONT",
  "CUSTOMER_EXPERIENCE",
  "OPERATIONS_JOBS",
  "BACKUP",
  "CATALOG",
  "SUPPLIER",
  "COMMERCE_SAFETY",
  "ADMIN_SAFETY",
  "AUDIT",
  "RBAC",
]);

const INCIDENT_LEVEL = Object.freeze({
  INFO: "INFO",
  WARNING: "WARNING",
  CRITICAL: "CRITICAL",
});

const INCIDENT_COMPONENT = Object.freeze({
  DB: "DB",
  BACKUP: "BACKUP",
  CONFIG: "CONFIG",
  SALES: "SALES",
  GO_LIVE_LOCK: "GO_LIVE_LOCK",
  JOBS: "JOBS",
  SUPPLIER: "SUPPLIER",
  PAYMENTS: "PAYMENTS",
  SECURITY: "SECURITY",
});

module.exports = {
  ADMIN_BACKOFFICE_GATES,
  INCIDENT_LEVEL,
  INCIDENT_COMPONENT,
};
