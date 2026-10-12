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

module.exports = {
  TASK_STATUSES,
  SCHEMA_TASK,
  SCHEMA_REPORT,
  ALLOWED_TRANSITIONS,
  nowIso,
  newId,
  canTransition,
};
