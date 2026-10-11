/**
 * Diagnostic operational report. Does not invent revenue, profit, or shipments.
 */

const { SOFTWARE_VERSION } = require("./constants");

function countSafe(db, sql) {
  try {
    return Number(db.prepare(sql).get()?.n || 0);
  } catch {
    return null;
  }
}

function getOperationalReport(db, { windowMinutes = 60 } = {}) {
  const { getSoftwareHealth } = require("./health");
  const health = getSoftwareHealth();
  const since = new Date(Date.now() - Math.max(1, windowMinutes) * 60_000).toISOString();

  return {
    source: "local_sqlite_diagnostic",
    inventedRevenue: false,
    productionVerified: false,
    window: { minutes: windowMinutes, since, kind: "local_diagnostic" },
    version: SOFTWARE_VERSION,
    generatedAt: new Date().toISOString(),
    tasks: {
      queued: countSafe(db, "SELECT COUNT(*) AS n FROM core_background_jobs WHERE status IN ('PENDING','QUEUED')"),
      running: countSafe(db, "SELECT COUNT(*) AS n FROM core_background_jobs WHERE status = 'RUNNING'"),
    },
    approvals: {
      pending: countSafe(db, "SELECT COUNT(*) AS n FROM core_approvals WHERE status = 'PENDING'"),
    },
    exceptions: {
      open: countSafe(db, "SELECT COUNT(*) AS n FROM core_ai_exceptions WHERE status IN ('OPEN','ESCALATED')"),
      deadLetter: countSafe(db, "SELECT COUNT(*) AS n FROM core_ai_exceptions WHERE status = 'DEAD_LETTER'"),
    },
    reservations: {
      active: countSafe(db, "SELECT COUNT(*) AS n FROM software_reservations WHERE status = 'ACTIVE'"),
    },
    returns: {
      open: countSafe(db, "SELECT COUNT(*) AS n FROM software_return_ledger"),
    },
    security: {
      note: "Counts are local diagnostics, not production SIEM.",
    },
    health: {
      ready: health.ready,
      liveReady: false,
      blocked: health.blocked,
      engines: health.engines || null,
    },
    note: "Not production metrics. Missing tables yield null counts, not zeros invented as business KPIs.",
  };
}

module.exports = { getOperationalReport };
