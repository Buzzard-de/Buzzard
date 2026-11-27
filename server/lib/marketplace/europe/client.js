const { createHmac } = require("node:crypto");

const RETRYABLE = new Set([429, 500, 502, 503, 504]);

function createRateLimiter({ limits = {}, now = () => Date.now() } = {}) {
  const buckets = new Map();
  return {
    take(group) {
      const limit = limits[group];
      if (!limit) return { ok: true };
      const key = group;
      const windowStart = now() - 60_000;
      const stamps = (buckets.get(key) || []).filter((stamp) => stamp > windowStart);
      if (stamps.length >= limit) {
        return { ok: false, code: "RATE_LIMITED", group, live: false, network: false };
      }
      stamps.push(now());
      buckets.set(key, stamps);
      return { ok: true };
    },
  };
}

function createIdempotency() {
  const seen = new Map();
  return {
    claim(key) {
      if (seen.has(key)) return { duplicate: true, previous: seen.get(key) };
      seen.set(key, { inFlight: true });
      return { duplicate: false, id: key };
    },
    finish(id, value) {
      seen.set(id, value);
    },
  };
}

function redact(entry) {
  const copy = { ...entry };
  delete copy.authorization;
  delete copy.headers;
  delete copy.apiKey;
  delete copy.apiSecret;
  delete copy.signingKey;
  delete copy.accessToken;
  return copy;
}

async function withRetry(run, { sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms)), attempts = 3 } = {}) {
  let last;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    last = await run(attempt);
    if (!RETRYABLE.has(last.status) || attempt === attempts) {
      return { ...last, attempts: attempt };
    }
    await sleep(Math.min(8000, 50 * 2 ** (attempt - 1)));
  }
  return last;
}

function mapHttp(status, body) {
  if (status === 401) return { ok: false, code: "AUTHENTICATION_FAILED", status, live: false, network: false };
  if (status === 403) return { ok: false, code: "FORBIDDEN", status, live: false, network: false };
  if (status === 404) return { ok: false, code: "NOT_FOUND", status, live: false, network: false };
  if (status === 409) return { ok: false, code: "CONFLICT", status, live: false, network: false };
  if (status === 429) return { ok: false, code: "RATE_LIMITED", status, live: false, network: false };
  if (status >= 400 && status < 500) return { ok: false, code: "BAD_REQUEST", status, live: false, network: false };
  if (status >= 500) return { ok: false, code: "UPSTREAM_ERROR", status, live: false, network: false };
  return { ok: true, status, body, live: false, network: false };
}

function vintedSignature({ timestamp, method, path, accessKey, rawBody, signingKey }) {
  const payload = [String(timestamp), String(method).toUpperCase(), path, accessKey, rawBody || ""].join(".");
  const hash = createHmac("sha256", signingKey).update(payload).digest("hex");
  return `t=${timestamp},v1=${hash}`;
}

function createClient({ transport = null, now = () => Date.now(), sleep, limits, logs }) {
  const limiter = createRateLimiter({ limits, now });
  const idempotency = createIdempotency();
  return {
    async send(spec) {
      const gate = limiter.take(spec.group || "default");
      if (!gate.ok) return gate;
      if (!transport) return { ok: false, code: "TRANSPORT_REQUIRED", live: false, network: false };
      let claim = null;
      if (spec.idempotencyKey) {
        claim = idempotency.claim(spec.idempotencyKey);
        if (claim.duplicate) {
          if (claim.previous && claim.previous.inFlight) {
            return { ok: false, code: "DUPLICATE_IN_FLIGHT", live: false, network: false };
          }
          return { ...claim.previous, duplicate: true, live: false, network: false };
        }
      }
      logs.push(redact({ method: spec.method, path: spec.path, group: spec.group || "default" }));
      const result = await withRetry(
        (attempt) => transport({ ...spec, attempt }),
        { sleep }
      );
      const mapped = { ...mapHttp(result.status, result.body), attempts: result.attempts, duplicate: false };
      if (claim) idempotency.finish(claim.id, mapped);
      return mapped;
    },
  };
}

module.exports = {
  createClient,
  vintedSignature,
  redact,
};
