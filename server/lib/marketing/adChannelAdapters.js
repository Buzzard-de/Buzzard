/**
 * Dry adapters for the four paid channels. No network call and no spend.
 */
const CHANNELS = Object.freeze(["google", "facebook", "tiktok", "youtube"]);

function prepare(channel) {
  if (!CHANNELS.includes(channel)) return { ok: false, code: "UNKNOWN_CHANNEL", networkCalled: false, live: false };
  return {
    ok: true,
    channel,
    queued: true,
    credentialsPresent: false,
    networkCalled: false,
    live: false,
  };
}

function publish(channel) {
  if (!CHANNELS.includes(channel)) return { ok: false, code: "UNKNOWN_CHANNEL", networkCalled: false, spent: 0, live: false };
  return {
    ok: false,
    channel,
    code: "CREDENTIALS_REQUIRED",
    networkCalled: false,
    spent: 0,
    live: false,
  };
}

module.exports = { CHANNELS, prepare, publish };
