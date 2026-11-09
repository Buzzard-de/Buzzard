/**
 * Honest E2EE assessment. HMAC is integrity. Optional X25519 box is client-held crypto.
 */
function assessMessaging({ hmacOnly = true, boxUsed = false, independentReview = false } = {}) {
  return {
    hmacIsE2ee: false,
    tlsIsE2ee: false,
    boxUsed,
    e2eeClaimAllowed: boxUsed && independentReview,
    independentReview,
    residualRisks: [
      "compromised_device",
      "screenshots",
      "insecure_notifications",
      "insecure_backups",
      "private_key_export",
    ],
    confidentialUseApproved: false,
    status: independentReview ? "HUMAN_APPROVAL_REQUIRED" : hmacOnly ? "TESTED" : "CODE_READY",
  };
}

module.exports = { assessMessaging };
