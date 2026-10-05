const { withTimeout } = require("../timeout");
const breaker = require("../circuitBreaker");
const { assertAllowedUrl } = require("./allowlist");

function sleep(ms) {
  return new Promise((resolve) => {
    const t = setTimeout(resolve, ms);
    t.unref?.();
  });
}

function jitterDelay(attempt, baseMs = 120, maxMs = 2000) {
  const exp = Math.min(maxMs, baseMs * 2 ** attempt);
  return Math.floor(exp * (0.5 + Math.random() * 0.5));
}

function mapStatus(status) {
  if (status === 401 || status === 403) return "PROVIDER_AUTH_FAILED";
  if (status === 429) return "RATE_LIMITED";
  if (status === 408) return "PROVIDER_TIMEOUT";
  if (status === 422) return "INVALID_RESPONSE";
  return "PROVIDER_ERROR";
}

async function providerFetch(url, init = {}, options = {}) {
  const {
    timeoutMs = Number(process.env.PROVIDER_TIMEOUT_MS || 15000),
    attempts = 2,
    breakerName,
    fetchImpl = globalThis.fetch,
    allowPrivate = false,
  } = options;
  if (!allowPrivate) {
    const allowed = assertAllowedUrl(url);
    if (!allowed.ok) return { ok: false, code: "SSRF_BLOCKED", status: 0 };
  }
  if (typeof fetchImpl !== "function") {
    return { ok: false, code: "FETCH_UNAVAILABLE", status: 0 };
  }
  if (breakerName && !breaker.allow(breakerName)) {
    return { ok: false, code: "CIRCUIT_OPEN", status: 0 };
  }
  let last = { ok: false, code: "PROVIDER_ERROR", status: 0 };
  const maxAttempts = Math.min(3, Math.max(1, attempts));
  for (let i = 0; i < maxAttempts; i += 1) {
    const controller = typeof AbortController === "function" ? new AbortController() : null;
    try {
      const response = await withTimeout(
        fetchImpl(url, { ...init, signal: controller?.signal }),
        timeoutMs,
        "PROVIDER_TIMEOUT"
      );
      const status = response.status;
      const requestId =
        response.headers?.get?.("x-request-id") ||
        response.headers?.get?.("request-id") ||
        null;
      let body = null;
      const contentType = String(response.headers?.get?.("content-type") || "");
      if (contentType.includes("application/json")) {
        body = await response.json();
      } else if (contentType.includes("audio/") || contentType.includes("octet-stream")) {
        const buf = Buffer.from(await response.arrayBuffer());
        body = { audio: buf, mimeType: contentType.split(";")[0] };
      } else {
        body = { text: await response.text() };
      }
      if (response.ok) {
        if (breakerName) breaker.recordSuccess(breakerName);
        return { ok: true, status, requestId, body };
      }
      last = {
        ok: false,
        code: mapStatus(status),
        status,
        requestId,
        body,
      };
      if (status === 401 || status === 403 || (status >= 400 && status < 500 && status !== 429)) break;
    } catch (error) {
      last = {
        ok: false,
        code: error.code === "PROVIDER_TIMEOUT" ? "PROVIDER_TIMEOUT" : "PROVIDER_ERROR",
        status: 0,
        message: error.message,
      };
      controller?.abort?.();
    }
    if (breakerName) breaker.recordFailure(breakerName);
    if (i < maxAttempts - 1) await sleep(jitterDelay(i));
  }
  return last;
}

module.exports = {
  providerFetch,
  jitterDelay,
  mapStatus,
};
