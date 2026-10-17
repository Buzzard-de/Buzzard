/**
 * Local operational checks. Never touches production disk or unlocks sales.
 */

const fs = require("fs");
const os = require("os");
const path = require("path");
const { isSalesEnabled } = require("../salesMode");
const { isProductSourceOfTruthActive } = require("../pim/productWriteBoundary");
const { assertRestoreAllowed } = require("./restoreGuard");
const { diagnose } = require("./providerDiagnostics");
const { isEphemeralPath } = require("../dbPaths");

function copyFile(from, to) {
  fs.mkdirSync(path.dirname(to), { recursive: true });
  fs.copyFileSync(from, to);
  return fs.statSync(to).size;
}

function runLocalBackupRestoreRoundtrip(sourceDb) {
  if (!sourceDb || !fs.existsSync(sourceDb)) {
    return { ok: false, status: "NOT_CONFIGURED", reason: "LOCAL_DB_MISSING" };
  }
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "buzzard-ops-"));
  const backup = path.join(dir, "backup.db");
  const restored = path.join(dir, "restored.db");
  const backupBytes = copyFile(sourceDb, backup);
  const restoredBytes = copyFile(backup, restored);
  const sameSize = backupBytes === restoredBytes && restoredBytes > 0;
  return {
    ok: sameSize,
    status: sameSize ? "LOCAL_ROUNDTRIP_OK" : "FAILED",
    production: false,
    backupBytes,
    restoredBytes,
    dir,
  };
}

function inspectIncompleteWork(db) {
  if (!db) return { available: false, staleShipments: 0, queuedMessages: 0 };
  try {
    const staleShipments = db
      .prepare(
        `SELECT COUNT(*) AS n FROM software_shipments
         WHERE last_update IS NULL OR last_update < datetime('now', '-6 hours')`
      )
      .get().n;
    const queuedMessages = db
      .prepare("SELECT COUNT(*) AS n FROM software_message_drafts WHERE status = 'QUEUED'")
      .get().n;
    return { available: true, staleShipments, queuedMessages, executed: false };
  } catch {
    return { available: false, staleShipments: 0, queuedMessages: 0 };
  }
}

function runLocalOperationsPack(options = {}) {
  const sourceDb = options.dbPath || path.join(process.cwd(), "server", "data", "buzzard.db");
  const salesLocked = !isSalesEnabled();
  const sotInactive = isProductSourceOfTruthActive() !== true;
  let restoreBlocked = false;
  try {
    assertRestoreAllowed("/var/data/buzzard.db", { NODE_ENV: "production" });
  } catch (error) {
    restoreBlocked = error.code === "PRODUCTION_RESTORE_BLOCKED";
  }
  const sourceEphemeral = isEphemeralPath(sourceDb);
  const roundtrip = sourceEphemeral
    ? {
        ok: false,
        status: "EPHEMERAL_SOURCE_REFUSED",
        production: false,
        durable: false,
        reason: "LOCAL_OPS_PACK_REFUSES_TMP_SOURCE",
      }
    : runLocalBackupRestoreRoundtrip(sourceDb);
  if (roundtrip && roundtrip.dir) {
    roundtrip.durable = false;
    roundtrip.ephemeralScratch = true;
  }
  const providers = diagnose({ live: false });
  return {
    local: true,
    productionVerified: false,
    salesLocked,
    productSourceOfTruthActive: !sotInactive,
    productionRestoreBlocked: restoreBlocked,
    sourceEphemeral,
    backupRestore: roundtrip,
    providers: {
      total: providers.counts?.total ?? null,
      configured: providers.counts?.configured ?? 0,
      live: providers.counts?.live ?? 0,
    },
    incompleteWork: inspectIncompleteWork(options.db || null),
    pass: salesLocked && sotInactive && restoreBlocked && roundtrip.ok,
  };
}

module.exports = {
  runLocalOperationsPack,
  runLocalBackupRestoreRoundtrip,
  inspectIncompleteWork,
};
