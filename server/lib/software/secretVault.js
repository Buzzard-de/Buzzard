/**
 * Secret lookup boundary. Values stay in environment / operator store.
 * Never writes secrets to git, logs, or reports.
 */

const KNOWN_NAMES = Object.freeze([
  "STRIPE_WEBHOOK_SECRET",
  "PAYPAL_WEBHOOK_ID",
  "TWILIO_AUTH_TOKEN",
  "OPENAI_API_KEY",
  "DHL_API_KEY",
]);

function getSecret(name) {
  const key = String(name || "").trim();
  if (!key) return { ok: false, present: false, reason: "NAME_REQUIRED" };
  const present = Boolean(process.env[key]);
  return {
    ok: true,
    name: key,
    present,
    value: null,
    source: present ? "environment" : "missing",
    writtenToGit: false,
  };
}

function listKnownNames() {
  return KNOWN_NAMES.map((name) => ({
    name,
    present: Boolean(process.env[name]),
    value: null,
  }));
}

module.exports = {
  KNOWN_NAMES,
  getSecret,
  listKnownNames,
};
