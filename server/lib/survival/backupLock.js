/**
 * Backup completeness lock. Local copies are not a finished 3-2-1-1-0 claim.
 */
function assessBackupLock({
  offsiteDir = process.env.BUZZARD_OFFSITE_BACKUP_DIR,
  wormConfirmed = process.env.BUZZARD_WORM_CONFIRMED === "1",
} = {}) {
  const missing = [];
  if (!offsiteDir) missing.push("OFFSITE_DIR");
  if (!wormConfirmed) missing.push("WORM_CONFIRMED");
  return {
    ok: false,
    completeClaim: false,
    offsiteConfigured: Boolean(offsiteDir),
    wormConfirmed: Boolean(wormConfirmed),
    missing,
    code: missing.length ? "BACKUP_LOCK" : "BACKUP_OPERATOR_STILL_REQUIRED",
    note: "Local prove is not recovery. Offsite host and real object-lock stay operator-owned.",
  };
}

module.exports = { assessBackupLock };
