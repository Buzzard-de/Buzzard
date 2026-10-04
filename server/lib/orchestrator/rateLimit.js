const buckets = new Map();

const SCOPE_LIMITS = {
  TEXT: { limit: 30, windowMs: 60_000 },
  VOICE: { limit: 20, windowMs: 60_000 },
  PHONE: { limit: 10, windowMs: 60_000 },
  stt: { limit: 15, windowMs: 60_000 },
  tts: { limit: 15, windowMs: 60_000 },
  phone_inbound: { limit: 10, windowMs: 60_000 },
  phone_outbound: { limit: 5, windowMs: 60_000 },
  webhook: { limit: 60, windowMs: 60_000 },
  text: { limit: 30, windowMs: 60_000 },
  voice: { limit: 20, windowMs: 60_000 },
};

function keyOf({ userId, ip, phone, sessionId, scope }) {
  return [scope || "orch", userId || "", ip || "", phone || "", sessionId || ""].join("|");
}

function checkLimit(identity, opts = {}) {
  const scoped = SCOPE_LIMITS[identity?.scope] || {};
  const limit = opts.limit ?? scoped.limit ?? 30;
  const windowMs = opts.windowMs ?? scoped.windowMs ?? 60_000;
  const key = keyOf(identity);
  const now = Date.now();
  const row = buckets.get(key) || { count: 0, resetAt: now + windowMs };
  if (now > row.resetAt) {
    row.count = 0;
    row.resetAt = now + windowMs;
  }
  row.count += 1;
  buckets.set(key, row);
  if (row.count > limit) {
    return { allowed: false, retryAfterMs: row.resetAt - now };
  }
  return { allowed: true, remaining: limit - row.count };
}

function resetLimits() {
  buckets.clear();
}

module.exports = {
  checkLimit,
  resetLimits,
  SCOPE_LIMITS,
};
