/**
 * Pusat Orchestrator — single central AI pathway over existing Buzzard modules.
 */

const { migratePusatSchema } = require("./schema");
const { PUSAT_VERSION, AGENT_CODES } = require("./constants");
const { submitTask, getMeta } = require("./submit");
const { executeTask, enqueueTask, cancelTask } = require("./lifecycle");
const memory = require("./memory");
const guardian = require("./guardian");
const approval = require("./approval");
const exceptions = require("./exceptions");
const agents = require("./agents");
const automations = require("./automations");
const integrations = require("./integrations");
const worker = require("./worker");
const circuitBreaker = require("./circuitBreaker");
const events = require("./events");
const taskConflict = require("./taskConflict");
const schedulerBridge = require("./schedulerBridge");
const { getHealth } = require("./health");
const { reportingAutomation } = require("./automations");

function initialize(db) {
  if (db) migratePusatSchema(db);
  agents.ensureSpecialistEmployees();
  return { ok: true, version: PUSAT_VERSION };
}

module.exports = {
  PUSAT_VERSION,
  AGENT_CODES,
  initialize,
  submitTask,
  executeTask,
  enqueueTask,
  cancelTask,
  getMeta,
  getHealth,
  report: reportingAutomation,
  memory,
  guardian,
  approval,
  exceptions,
  agents,
  automations,
  integrations,
  worker,
  circuitBreaker,
  events,
  taskConflict,
  schedulerBridge,
};
