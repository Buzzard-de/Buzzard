/**
 * Real network gate. Call this instead of raw fetch for outbound HTTP.
 * Denied destinations never reach the network.
 */
const dns = require("dns").promises;
const { evaluateEgress, evaluateResolvedAddresses } = require("./egressPolicy");
const { watchEgress } = require("./esatBey");

const audit = [];
const PROXY_KEYS = ["HTTP_PROXY", "HTTPS_PROXY", "ALL_PROXY", "http_proxy", "https_proxy", "all_proxy"];

let lookupFn = (host) => dns.lookup(host, { all: true, verbatim: true });

function setDnsLookup(fn) {
  lookupFn = fn || ((host) => dns.lookup(host, { all: true, verbatim: true }));
}

function record(entry) {
  const safe = { ...entry };
  delete safe.authorization;
  delete safe.token;
  delete safe.secret;
  delete safe.body;
  audit.push({ ...safe, at: new Date().toISOString() });
  if (audit.length > 200) audit.shift();
}

function notifyPusat(decision, url) {
  if (!decision || decision.allowed) return;
  if (decision.code !== "EXTERNAL_AI_EGRESS_DENIED" && decision.code !== "PAYMENT_EGRESS_LOCKED") return;
  try {
    require("../exceptionBus").emit({
      type: "SECURITY_ALERT",
      severity: "HIGH",
      source: "egress_guard",
      message: decision.code,
      context: { host: decision.host, code: decision.code },
    });
  } catch {
    /* bus/db may be unavailable in unit tests */
  }
}

function withoutProxyEnv(work) {
  const saved = {};
  for (const key of PROXY_KEYS) {
    saved[key] = process.env[key];
    delete process.env[key];
  }
  return Promise.resolve()
    .then(work)
    .finally(() => {
      for (const key of PROXY_KEYS) {
        if (saved[key] === undefined) delete process.env[key];
        else process.env[key] = saved[key];
      }
    });
}

async function guardedFetch(destinationUrl, init = {}, payload = {}) {
  const decision = evaluateEgress({ destinationUrl, payload });
  record({
    url: destinationUrl,
    host: decision.host,
    allowed: decision.allowed,
    code: decision.code || "ALLOW",
    classification: decision.classification,
  });
  if (!decision.allowed) {
    const esat = watchEgress(decision, { url: destinationUrl });
    notifyPusat(decision, destinationUrl);
    return {
      ok: false,
      blocked: true,
      reachedNetwork: false,
      decision,
      esat,
      response: null,
    };
  }

  let resolved;
  try {
    const answers = await lookupFn(decision.host);
    const list = Array.isArray(answers) ? answers : [answers];
    const ips = list.map((row) => row.address || row);
    resolved = evaluateResolvedAddresses(ips, decision.host);
  } catch {
    resolved = { allowed: false, code: "DNS_RESOLVE_FAILED", host: decision.host };
  }
  if (!resolved.allowed) {
    record({ url: destinationUrl, host: decision.host, allowed: false, code: resolved.code, classification: decision.classification });
    const blocked = { ...decision, allowed: false, code: resolved.code };
    const esat = watchEgress(blocked, { url: destinationUrl });
    notifyPusat(blocked, destinationUrl);
    return { ok: false, blocked: true, reachedNetwork: false, decision: blocked, esat, response: null };
  }

  return withoutProxyEnv(async () => {
    const response = await fetch(destinationUrl, { ...init, redirect: "manual" });
    if ([301, 302, 303, 307, 308].includes(response.status)) {
      const location = response.headers.get("location") || "";
      let next = "";
      try {
        next = new URL(location, destinationUrl).href;
      } catch {
        next = location;
      }
      const hop = evaluateEgress({ destinationUrl: next, payload });
      record({ url: next, host: hop.host, allowed: false, code: "REDIRECT_DENIED", classification: hop.classification });
      const denied = { ...hop, allowed: false, code: "REDIRECT_DENIED" };
      const esat = watchEgress(denied, { url: next });
      notifyPusat(denied, next);
      return {
        ok: false,
        blocked: true,
        reachedNetwork: true,
        followedRedirect: false,
        decision: denied,
        esat,
        response: null,
      };
    }
    return {
      ok: response.ok,
      blocked: false,
      reachedNetwork: true,
      decision,
      response,
    };
  });
}

function egressAudit() {
  return audit.map((row) => ({ ...row }));
}

function resetEgressAudit() {
  audit.length = 0;
}

module.exports = { guardedFetch, egressAudit, resetEgressAudit, setDnsLookup };
