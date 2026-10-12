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
  const roundtrip = runLocalBackupRestoreRoundtrip(sourceDb);
  const providers = diagnose({ live: false });
  return {
    local: true,
    productionVerified: false,
    salesLocked,
    productSourceOfTruthActive: !sotInactive,
    productionRestoreBlocked: restoreBlocked,
    backupRestore: roundtrip,
    providers: {
      total: providers.counts?.total ?? null,
      configured: providers.counts?.configured ?? 0,
      live: providers.counts?.live ?? 0,
    },
    pass: salesLocked && sotInactive && restoreBlocked && roundtrip.ok,
  };
}

module.exports = {
  runLocalOperationsPack,
  runLocalBackupRestoreRoundtrip,
};
