/**
 * Automotive Production Integration — rate limit, retry, circuit breaker utilities.
 */
const { PRODUCTION_CONFIG } = require("./productionConfig");

const CIRCUIT_STATES = Object.freeze({ CLOSED: "CLOSED", OPEN: "OPEN", HALF_OPEN: "HALF_OPEN" });
const _circuits = new Map();
const _rateBuckets = new Map();

function getCircuit(name) {
  if (!_circuits.has(name)) {
    _circuits.set(name, { state: CIRCUIT_STATES.CLOSED, failures: 0, lastFailure: null, openedAt: null });
  }
  return _circuits.get(name);
}

function recordCircuitSuccess(name) {
  const c = getCircuit(name);
  c.failures = 0;
  c.state = CIRCUIT_STATES.CLOSED;
  c.openedAt = null;
}

function recordCircuitFailure(name, threshold = 5) {
  const c = getCircuit(name);
  c.failures += 1;
  c.lastFailure = Date.now();
  if (c.failures >= threshold) {
    c.state = CIRCUIT_STATES.OPEN;
    c.openedAt = Date.now();
  }
  return c;
}

function isCircuitOpen(name, cooldownMs = 30000) {
  const c = getCircuit(name);
  if (c.state !== CIRCUIT_STATES.OPEN) return false;
  if (c.openedAt && Date.now() - c.openedAt > cooldownMs) {
    c.state = CIRCUIT_STATES.HALF_OPEN;
    return false;
  }
  return true;
}

function checkRateLimit(key, limitPerMinute) {
  const now = Date.now();
  const windowMs = 60000;
  let bucket = _rateBuckets.get(key);
  if (!bucket || now - bucket.start > windowMs) {
    bucket = { start: now, count: 0 };
    _rateBuckets.set(key, bucket);
  }
  bucket.count += 1;
  if (bucket.count > limitPerMinute) {
    return { allowed: false, retryAfterMs: windowMs - (now - bucket.start) };
  }
  return { allowed: true, remaining: limitPerMinute - bucket.count };
}

async function withRetry(fn, options = {}) {
  const maxAttempts = options.maxAttempts || PRODUCTION_CONFIG.maxRetryAttempts();
  const backoff = options.backoff || [1000, 2000, 4000, 8000];
  const idempotent = options.idempotent !== false;
  const unsafeForOrders = options.operation === "createOrder";

  if (unsafeForOrders && !options.idempotencyKey) {
    return { ok: false, error: "ORDER_RETRY_WITHOUT_IDEMPOTENCY_KEY" };
  }

  let lastError = null;
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    try {
      const result = await fn();
      return { ok: true, result, attempts: attempt + 1 };
    } catch (err) {
      lastError = err;
      if (!idempotent || attempt >= maxAttempts - 1) break;
      const delay = backoff[Math.min(attempt, backoff.length - 1)];
      await new Promise((r) => setTimeout(r, delay));
    }
  }
  return { ok: false, error: lastError?.message || "retry_exhausted", attempts: maxAttempts };
}

function resetCircuit(name) {
  _circuits.delete(name);
}

function resetRateLimits() {
  _rateBuckets.clear();
}

module.exports = {
  CIRCUIT_STATES,
  getCircuit,
  recordCircuitSuccess,
  recordCircuitFailure,
  isCircuitOpen,
  checkRateLimit,
  withRetry,
  resetCircuit,
  resetRateLimits,
};
