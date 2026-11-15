/**
 * Sandbox connection readiness. Does not contact providers without credentials.
 */
function probe({ name, envKeys = [] } = {}) {
  const present = envKeys.filter((key) => Boolean(process.env[key]));
  const missing = envKeys.filter((key) => !process.env[key]);
  return {
    name,
    configured: missing.length === 0 && envKeys.length > 0,
    presentCount: present.length,
    missing,
    reachedNetwork: false,
    sandboxVerified: false,
    liveVerified: false,
    status: missing.length ? "BLOCKED" : "HUMAN_APPROVAL_REQUIRED",
  };
}

function inventory() {
  return [
    probe({ name: "carrier_dhl", envKeys: ["BUZZARD_DHL_SANDBOX_KEY", "BUZZARD_DHL_SANDBOX_URL"] }),
    probe({ name: "tax_connect", envKeys: ["BUZZARD_TAX_CONNECT_URL", "BUZZARD_TAX_CONNECT_KEY"] }),
    probe({ name: "sanctions_feed", envKeys: ["BUZZARD_SANCTIONS_FEED_URL"] }),
    probe({ name: "voice_twilio", envKeys: ["BUZZARD_TWILIO_ACCOUNT_SID", "BUZZARD_TWILIO_AUTH_TOKEN"] }),
  ];
}

module.exports = { probe, inventory };
