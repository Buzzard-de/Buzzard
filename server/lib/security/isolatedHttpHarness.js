/**
 * Isolated HTTP test transport. Never calls global fetch.
 * Production Egress DENY is unchanged. No localhost production exception.
 * Operator smoke may use buzzard-isolated:// which is not a public network URL.
 */
const { evaluateEgress } = require("./egressPolicy");

function createIsolatedHttp({ fixtures = {}, timeoutMs = 250 } = {}) {
  const store = new Map(Object.entries(fixtures));
  const log = [];

  async function request(destinationUrl, init = {}) {
    const started = Date.now();
    let parsed;
    try {
      parsed = new URL(destinationUrl);
    } catch {
      log.push({ url: destinationUrl, code: "INVALID_URL", reachedNetwork: false });
      return { ok: false, blocked: true, reachedNetwork: false, code: "INVALID_URL", status: 0 };
    }

    if (parsed.protocol === "buzzard-isolated:") {
      const key = parsed.pathname || "/";
      const fixture = store.get(key) || store.get(destinationUrl);
      if (!fixture) {
        return { ok: false, blocked: true, reachedNetwork: false, isolated: true, code: "NO_ISOLATED_FIXTURE" };
      }
      if (fixture.delayMs && fixture.delayMs > timeoutMs) {
        return { ok: false, blocked: true, reachedNetwork: false, isolated: true, code: "ISOLATED_TIMEOUT" };
      }
      return {
        ok: true,
        blocked: false,
        reachedNetwork: false,
        isolated: true,
        status: fixture.status || 200,
        body: fixture.body ?? null,
        elapsedMs: Date.now() - started,
      };
    }

    const decision = evaluateEgress({ destinationUrl, payload: init.payload || {} });
    if (!decision.allowed) {
      log.push({ url: destinationUrl, code: decision.code, reachedNetwork: false });
      return {
        ok: false,
        blocked: true,
        reachedNetwork: false,
        decision,
        code: decision.code,
        status: 0,
      };
    }

    const fixture = store.get(destinationUrl) || store.get(parsed.origin + parsed.pathname) || store.get(parsed.hostname);
    if (!fixture) {
      return { ok: false, blocked: true, reachedNetwork: false, code: "NO_ISOLATED_FIXTURE", decision };
    }
    if (fixture.redirect) {
      return { ok: false, blocked: true, reachedNetwork: false, code: "REDIRECT_DENIED", decision };
    }
    if (fixture.delayMs && fixture.delayMs > timeoutMs) {
      return { ok: false, blocked: true, reachedNetwork: false, code: "ISOLATED_TIMEOUT", decision };
    }
    return {
      ok: (fixture.status || 200) < 400,
      blocked: false,
      reachedNetwork: false,
      isolated: true,
      status: fixture.status || 200,
      body: fixture.body ?? null,
      decision,
    };
  }

  return { request, log, reachedNetwork: false };
}

module.exports = { createIsolatedHttp };
