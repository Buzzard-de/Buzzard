const buckets = new Map();

function keyOf({ userId, ip, phone, sessionId, scope }) {
  return [scope || "orch", userId || "", ip || "", phone || "", sessionId || ""].join("|");
}

function checkLimit(identity, { limit = 30, windowMs = 60_000 } = {}) {
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
};
