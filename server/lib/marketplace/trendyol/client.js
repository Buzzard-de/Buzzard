const { LIMITS, RETRYABLE_STATUS } = require("./contract");

function createRateLimiter({ limits = {}, now = () => Date.now() } = {}) {
  const active = { ...LIMITS, ...limits };
  const buckets = new Map();
  function take(group, key = group) {
    const limit = active[group];
    if (!limit) return { ok: true };
    const stamp = now();
    const id = `${group}:${key}`;
    const hits = (buckets.get(id) || []).filter((at) => stamp - at < 60_000);
    if (hits.length >= limit) {
      buckets.set(id, hits);
      return { ok: false, code: "RATE_LIMITED", group, live: false, network: false };
    }
    hits.push(stamp);
    buckets.set(id, hits);
    return { ok: true };
  }
  return { take };
}

function createIdempotency() {
  const seen = new Map();
  return {
    claim(scope, key) {
      const id = `${scope}:${key}`;
      if (seen.has(id)) return { duplicate: true, previous: seen.get(id) };
      seen.set(id, { inFlight: true });
      return { duplicate: false, id };
    },
    finish(id, value) {
      seen.set(id, value);
    },
    remember(scope, key, value) {
      const id = `${scope}:${key}`;
      if (seen.has(id)) return { duplicate: true, previous: seen.get(id) };
      seen.set(id, value);
      return { duplicate: false };
    },
  };
}

function authorizationHeader(apiKey, apiSecret) {
  return `Basic ${Buffer.from(`${apiKey}:${apiSecret}`).toString("base64")}`;
}

function redact(entry) {
  const copy = { ...entry };
  delete copy.authorization;
  delete copy.apiKey;
  delete copy.apiSecret;
  delete copy.headers;
  return copy;
}

async function withRetry(run, { attempts = 3, sleep = async () => {} } = {}) {
  let last;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    last = await run(attempt);
    if (last.ok || !RETRYABLE_STATUS.has(last.status)) return { ...last, attempts: attempt };
    if (attempt < attempts) await sleep(Math.min(1000 * 2 ** (attempt - 1), 8000));
  }
  return { ...last, attempts };
}

function mapStatus(status, body) {
  if (status === 401) return { ok: false, code: "AUTHENTICATION_FAILED", status, body, live: false };
  if (status === 400) return { ok: false, code: "BAD_REQUEST", status, body, live: false };
  if (status === 403) return { ok: false, code: "FORBIDDEN", status, body, live: false };
  if (status === 404) return { ok: false, code: "NOT_FOUND", status, body, live: false };
  if (status === 409) return { ok: false, code: "CONFLICT", status, body, live: false };
  if (status === 429) return { ok: false, code: "RATE_LIMITED", status, body, live: false };
  if (status >= 500) return { ok: false, code: "UPSTREAM_ERROR", status, body, live: false };
  if (status >= 200 && status < 300) return { ok: true, status, body, live: false, network: false };
  return { ok: false, code: "UPSTREAM_ERROR", status, body, live: false };
}

function blocked(code, config) {
  return {
    ok: false,
    code,
    issues: config ? config.issues : [],
    live: false,
    network: false,
    productionReady: false,
  };
}

async function execute(config, spec, transport, { limiter, sleep, logs, idempotency } = {}) {
  if (!config.configured) return blocked(config.issues[0] || "CREDENTIALS_MISSING", config);
  if (!config.enabled) return blocked("CONNECTOR_DISABLED", config);
  const limitKey = spec.limitKey || spec.group;
  const gate = limiter.take(spec.group, limitKey);
  if (!gate.ok) return gate;
  if (spec.barcode) {
    const barcodeGate = limiter.take("barcodePricePerMinute", spec.barcode);
    if (!barcodeGate.ok) return barcodeGate;
  }
  if (!transport) return blocked("TRANSPORT_REQUIRED", config);
  let claim = null;
  if (idempotency && spec.idempotencyKey) {
    claim = idempotency.claim(spec.group, spec.idempotencyKey);
    if (claim.duplicate) {
      if (claim.previous && claim.previous.inFlight) {
        return { ok: false, code: "DUPLICATE_IN_FLIGHT", live: false, network: false };
      }
      return { ...claim.previous, duplicate: true, live: false, network: false };
    }
  }
  logs.push(redact({ method: spec.method, path: spec.path, storeFrontCode: config.storeFrontCode, group: spec.group }));
  const result = await withRetry(
    (attempt) => transport({
      method: spec.method,
      url: `${config.baseUrl}${spec.path}`,
      path: spec.path,
      body: spec.body,
      attempt,
      headers: {
        Authorization: authorizationHeader(config.apiKey, config.apiSecret),
        "User-Agent": config.userAgent,
        storeFrontCode: config.storeFrontCode,
        "Content-Type": "application/json",
      },
    }),
    { sleep }
  );
  const mapped = { ...mapStatus(result.status, result.body), attempts: result.attempts, duplicate: false };
  if (claim) idempotency.finish(claim.id, mapped);
  return mapped;
}

module.exports = {
  createRateLimiter,
  createIdempotency,
  authorizationHeader,
  redact,
  withRetry,
  mapStatus,
  execute,
};
