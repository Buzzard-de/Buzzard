/**
 * Part 22 — Product quality hardening constants (supplier-independent).
 */
const QUALITY_STATUS = Object.freeze({
  PASS: "PASS",
  CONDITION: "CONDITION",
  BLOCKED: "BLOCKED",
});

const FINDING_SEVERITY = Object.freeze({
  INFO: "INFO",
  CONDITION: "CONDITION",
  BLOCKED: "BLOCKED",
});

const HARDENING_DIMENSIONS = Object.freeze([
  "IDENTITY",
  "ATTRIBUTES",
  "MANUFACTURER",
  "CATEGORY",
  "IMAGES",
  "TITLE",
  "DESCRIPTION",
  "COMMERCIAL",
]);

const PLACEHOLDER_PATTERNS = Object.freeze([
  /^test$/i,
  /^demo$/i,
  /^mock$/i,
  /^sample$/i,
  /^placeholder$/i,
  /^tbd$/i,
  /^n\/a$/i,
  /^unknown$/i,
  /^lorem ipsum/i,
  /^test product/i,
  /^xxx+$/i,
]);

function buildBlockReason(code, field, message, severity = FINDING_SEVERITY.BLOCKED) {
  return { code, severity, field, message };
}

module.exports = {
  QUALITY_STATUS,
  FINDING_SEVERITY,
  HARDENING_DIMENSIONS,
  PLACEHOLDER_PATTERNS,
  buildBlockReason,
};
