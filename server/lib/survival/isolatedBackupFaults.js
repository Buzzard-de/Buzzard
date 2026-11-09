const crypto = require("crypto");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { restoreProduction } = require("./businessContinuity");

function isolatedBackupFaults() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "buzzard-bak-"));
  const good = path.join(dir, "ok.bin");
  const payload = Buffer.from("synthetic-backup-v4");
  fs.writeFileSync(good, payload);
  const sha = crypto.createHash("sha256").update(payload).digest("hex");
  const interrupted = path.join(dir, "interrupted.bin");
  fs.writeFileSync(interrupted, payload.subarray(0, 4));
  const corrupt = path.join(dir, "corrupt.bin");
  fs.writeFileSync(corrupt, Buffer.from("CORRUPT"));
  const interruptedHash = crypto.createHash("sha256").update(fs.readFileSync(interrupted)).digest("hex");
  const corruptHash = crypto.createHash("sha256").update(fs.readFileSync(corrupt)).digest("hex");
  return {
    dir,
    goodOk: crypto.createHash("sha256").update(fs.readFileSync(good)).digest("hex") === sha,
    interruptedOk: interruptedHash === sha,
    corruptOk: corruptHash === sha,
    restoreProduction: restoreProduction(),
    productionTouched: false,
    productionDrVerified: false,
  };
}

module.exports = { isolatedBackupFaults };
