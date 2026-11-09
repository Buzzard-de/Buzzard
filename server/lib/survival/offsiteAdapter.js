/**
 * Offsite backup adapter. No credentials → no network copy.
 */
const crypto = require("crypto");
const fs = require("fs");

function configured() {
  return Boolean(process.env.BUZZARD_OFFSITE_BACKUP_DIR || process.env.BUZZARD_OFFSITE_ENDPOINT);
}

function planCopy({ sourcePath, separateCredentials = false } = {}) {
  if (!sourcePath || !fs.existsSync(sourcePath)) {
    return { ok: false, code: "SOURCE_MISSING", copied: false };
  }
  const sha256 = crypto.createHash("sha256").update(fs.readFileSync(sourcePath)).digest("hex");
  if (!configured()) {
    return {
      ok: false,
      copied: false,
      sha256,
      status: "BLOCKED",
      code: "OFFSITE_NOT_CONFIGURED",
      separateCredentials,
    };
  }
  return {
    ok: false,
    copied: false,
    sha256,
    status: "HUMAN_APPROVAL_REQUIRED",
    code: "OFFSITE_NOT_LIVE",
    note: "Directory/endpoint present in env is not a verified independent host.",
    separateCredentials,
  };
}

module.exports = { configured, planCopy };
