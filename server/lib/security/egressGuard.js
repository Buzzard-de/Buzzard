/**
 * Real network gate. Call this instead of raw fetch for outbound HTTP.
 * Denied destinations never reach the network.
 */
const { evaluateEgress } = require("./egressPolicy");
const { watchEgress } = require("./esatBey");

const audit = [];

function record(entry) {
  audit.push({ ...entry, at: new Date().toISOString() });
  if (audit.length > 200) audit.shift();
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
    return {
      ok: false,
      blocked: true,
      reachedNetwork: false,
      decision,
      esat,
      response: null,
    };
  }

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
    const esat = watchEgress({ ...hop, allowed: false, code: hop.code || "REDIRECT_DENIED" }, { url: next });
    return {
      ok: false,
      blocked: true,
      reachedNetwork: true,
      followedRedirect: false,
      decision: { ...hop, allowed: false, code: "REDIRECT_DENIED" },
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
}

function egressAudit() {
  return audit.map((row) => ({ ...row }));
}

function resetEgressAudit() {
  audit.length = 0;
}

module.exports = { guardedFetch, egressAudit, resetEgressAudit };
