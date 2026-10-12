const TASK_STATUSES = Object.freeze([
  "DRAFT",
  "READY",
  "RUNNING",
  "WAITING_FOR_APPROVAL",
  "BLOCKED",
  "COMPLETED",
  "FAILED",
]);

const SCHEMA_TASK = "buzzard.desktop-bridge.task.v1";
const SCHEMA_REPORT = "buzzard.desktop-bridge.report.v1";
const SUPPORTED_SCHEMAS = Object.freeze([SCHEMA_TASK, SCHEMA_REPORT]);
const MAX_IMPORT_BYTES = 256 * 1024;

const ALLOWED_TRANSITIONS = Object.freeze({
  DRAFT: ["READY", "BLOCKED", "FAILED"],
  READY: ["WAITING_FOR_APPROVAL", "RUNNING", "BLOCKED", "FAILED"],
  WAITING_FOR_APPROVAL: ["RUNNING", "BLOCKED", "FAILED", "READY"],
  RUNNING: ["COMPLETED", "FAILED", "BLOCKED", "WAITING_FOR_APPROVAL"],
  BLOCKED: ["DRAFT", "READY", "FAILED"],
  COMPLETED: [],
  FAILED: ["DRAFT"],
});

function nowIso() {
  return new Date().toISOString();
}

function newId(prefix = "bb") {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function canTransition(from, to) {
  return (ALLOWED_TRANSITIONS[from] || []).includes(to);
}

function fail(code, message) {
  const error = new Error(message);
  error.code = code;
  return error;
}

function assertSupportedSchema(schema, kind) {
  const expected = kind === "report" ? SCHEMA_REPORT : SCHEMA_TASK;
  if (!schema) {
    throw fail("SCHEMA_REQUIRED", `${kind} schema version is required`);
  }
  if (!SUPPORTED_SCHEMAS.includes(schema)) {
    throw fail("SCHEMA_UNSUPPORTED", `Unsupported schema ${schema}`);
  }
  if (schema !== expected) {
    throw fail("SCHEMA_KIND_MISMATCH", `Expected ${expected}`);
  }
  return schema;
}

function evaluateImportedReport(report = {}, task) {
  const claims = [];
  if (report.productionVerified === true || report.liveVerified === true || report.productionVerification === true) {
    claims.push("UNTRUSTED_PRODUCTION_CLAIM");
  }
  const summary = String(report.summary || report.result || report.body || "").trim();
  if (!summary) claims.push("SUMMARY_MISSING");
  if (!task) claims.push("UNKNOWN_TASK");

  let status = "BLOCKED";
  let reason = claims[0] || "IMPORTED";
  if (!claims.length && report.status === "FAILED") {
    status = "FAILED";
    reason = "REPORT_FAILED";
  } else if (!claims.length) {
    status = "COMPLETED";
    reason = "BRIDGE_EVALUATED";
  }
  return {
    status,
    reason,
    claims,
    summary,
    evaluatedBy: "desktop-bridge",
    importedStatusIgnored: report.status || null,
  };
}

module.exports = {
  TASK_STATUSES,
  SCHEMA_TASK,
  SCHEMA_REPORT,
  SUPPORTED_SCHEMAS,
  MAX_IMPORT_BYTES,
  ALLOWED_TRANSITIONS,
  nowIso,
  newId,
  canTransition,
  assertSupportedSchema,
  evaluateImportedReport,
};
