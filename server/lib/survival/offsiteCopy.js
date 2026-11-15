/**
 * Offsite copy to an independent directory (not under the primary work root).
 * A second folder on the same VM is CODE_READY, not a remote vault.
 */
const fs = require("fs");
const path = require("path");
const { sha256File } = require("./copies32110");

function isIndependent(primaryRoot, offsiteRoot) {
  const a = path.resolve(primaryRoot);
  const b = path.resolve(offsiteRoot);
  return b !== a && !b.startsWith(`${a}${path.sep}`) && !a.startsWith(`${b}${path.sep}`);
}

function copyOffsite({ sourcePath, primaryRoot, offsiteRoot = process.env.BUZZARD_OFFSITE_BACKUP_DIR } = {}) {
  if (!offsiteRoot) {
    return { ok: false, status: "OFFSITE_UNCONFIGURED", code: "OFFSITE_UNCONFIGURED" };
  }
  if (!isIndependent(primaryRoot || path.dirname(sourcePath), offsiteRoot)) {
    return { ok: false, status: "OFFSITE_NOT_INDEPENDENT", code: "OFFSITE_NOT_INDEPENDENT" };
  }
  if (!sourcePath || !fs.existsSync(sourcePath)) {
    return { ok: false, code: "SOURCE_MISSING" };
  }
  fs.mkdirSync(offsiteRoot, { recursive: true });
  const dest = path.join(offsiteRoot, path.basename(sourcePath));
  fs.copyFileSync(sourcePath, dest);
  const srcHash = sha256File(sourcePath);
  const destHash = sha256File(dest);
  return {
    ok: srcHash === destHash,
    status: srcHash === destHash ? "COPIED" : "HASH_MISMATCH",
    dest,
    sha256: destHash,
    independent: true,
    remoteVault: false,
  };
}

module.exports = { isIndependent, copyOffsite };
