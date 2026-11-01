/**
 * Managed-device baseline. Unsupported biometrics are not claimed.
 */
const CONTROLS = Object.freeze([
  { id: "full_disk_encryption", required: true },
  { id: "tpm", requiredIfSupported: true },
  { id: "secure_boot", requiredIfSupported: true },
  { id: "strong_pin_or_password", required: true },
  { id: "mfa", required: true },
  { id: "hardware_security_key", recommended: true },
  { id: "windows_hello", requiredIfSupported: true },
  { id: "recovery_keys_in_vault", required: true },
  { id: "remote_lock", required: true },
  { id: "cryptographic_wipe_not_physical_destruction", required: true },
  { id: "session_audit", required: true },
  { id: "backup_restore_test", required: true },
]);

function evaluateDevice(report = {}) {
  const normalized = {
    ...report,
    full_disk_encryption: report.full_disk_encryption === true || report.bitlocker === true,
  };
  const missing = [];
  for (const control of CONTROLS) {
    const value = normalized[control.id];
    if (control.required && value !== true) missing.push(control.id);
    if (control.requiredIfSupported && report.supports && report.supports[control.id] === true && value !== true) {
      missing.push(control.id);
    }
  }
  const checklistOk = missing.length === 0;
  const attested = report.attestedFromDevice === true;
  return {
    ok: checklistOk,
    missing,
    biometricClaimed: Boolean(report.unsupportedBiometricClaimed),
    bitlockerMapped: report.bitlocker === true,
    attestedFromDevice: attested,
    acceptanceStatus: attested && checklistOk ? "SECURITY_REVIEW" : "CODE_READY",
    completeClaim: false,
    note: attested
      ? "Checklist plus device report received. Still not COMPLETE until operator signs the live device."
      : "Policy checklist only. Not live device verification. Not COMPLETE.",
  };
}

module.exports = { CONTROLS, evaluateDevice };
