/**
 * Pusat + automation worker health (dry-run, no live voice/payments).
 */
const { roster, MEMBERS } = require("./council");
const { AGENTS, SEED_IDS } = require("../buzzardNative/core/identityRegistry");
const { listSchedules } = require("../jobScheduler");
const { JOB_TYPES } = require("../../core/jobConstants");

function councilHealth() {
  const members = roster();
  return {
    councilMembers: members.length,
    rosterIds: members.map((m) => m.id),
    nativeIdentities: AGENTS.length,
    seedLocked: SEED_IDS.length,
    liveCallsBlocked: members.every((m) => m.liveCalls !== true),
    paymentExecutionBlocked: members.every((m) => m.cannotExecutePayments !== false || m.role !== "central_coordination"),
    salesEnableBlocked: true,
    live: false,
  };
}

function schedulerHealth() {
  try {
    const enabled = listSchedules({ enabled: true, limit: 100 });
    return {
      ok: true,
      scheduledJobs: enabled.length,
      jobTypesKnown: Object.keys(JOB_TYPES || {}).length,
      liveRunner: false,
    };
  } catch (err) {
    return {
      ok: false,
      code: "SCHEDULER_DB_UNAVAILABLE",
      message: err.message,
      scheduledJobs: 0,
      liveRunner: false,
    };
  }
}

function snapshot() {
  const council = councilHealth();
  const scheduler = schedulerHealth();
  return {
    live: false,
    productionReady: false,
    council,
    scheduler,
    ok: council.councilMembers >= MEMBERS.length && council.nativeIdentities >= 17,
    memberRegistrySize: MEMBERS.length,
  };
}

module.exports = { councilHealth, schedulerHealth, snapshot };