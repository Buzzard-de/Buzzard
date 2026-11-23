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

const operatorReviews = new Map();
const MAX_REVIEWS = 64;
let reviewSeq = 0;

/** A checkbox on the report is a claim. Only a desk review id is an attestation record. */
function clientClaim(report = {}) {
  const claimed = report.bitlocker === true || report.attestedFromDevice === true || report.full_disk_encryption === true;
  return {
    attested: false,
    liveDevice: false,
    completeClaim: false,
    code: claimed ? "CLAIM_IS_NOT_ATTESTATION" : "NO_ATTESTATION",
  };
}

function recordOperatorReview({ deviceId, operatorId } = {}) {
  if (typeof deviceId !== "string" || deviceId.trim() === "" || typeof operatorId !== "string" || operatorId.trim() === "") {
    return { ok: false, code: "REVIEW_INCOMPLETE", attested: false, liveDevice: false, completeClaim: false };
  }
  if (operatorReviews.size >= MAX_REVIEWS) {
    const oldest = operatorReviews.keys().next().value;
    operatorReviews.delete(oldest);
  }
  reviewSeq += 1;
  const reviewId = `att_${reviewSeq}`;
  operatorReviews.set(reviewId, { deviceId: deviceId.trim().slice(0, 80), operatorId: operatorId.trim().slice(0, 80) });
  return { ok: true, reviewId, attested: false, liveDevice: false, completeClaim: false };
}

function readAttestation(reviewId) {
  const row = operatorReviews.get(reviewId);
  if (!row) return { ok: false, code: "NO_ATTESTATION", attested: false, liveDevice: false, completeClaim: false };
  return { ok: true, attested: true, liveDevice: false, completeClaim: false, ...row };
}

function lostDeviceProcedure() {
  return [
    "incident_report",
    "device_identification",
    "session_revocation",
    "credential_revocation",
    "remote_lock",
    "authorized_crypto_wipe",
    "recovery_key_protection",
    "evidence_preservation",
    "backup_verification",
    "replacement_enrollment",
  ];
}

module.exports = {
  CONTROLS,
  evaluateDevice,
  clientClaim,
  recordOperatorReview,
  readAttestation,
  lostDeviceProcedure,
};
