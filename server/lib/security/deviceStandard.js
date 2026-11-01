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
  const missing = [];
  for (const control of CONTROLS) {
    const value = report[control.id];
    if (control.required && value !== true) missing.push(control.id);
    if (control.requiredIfSupported && report.supports && report.supports[control.id] === true && value !== true) {
      missing.push(control.id);
    }
  }
  return {
    ok: missing.length === 0,
    missing,
    biometricClaimed: Boolean(report.unsupportedBiometricClaimed),
    note: "Do not present unsupported biometrics as available.",
  };
}

module.exports = { CONTROLS, evaluateDevice };
