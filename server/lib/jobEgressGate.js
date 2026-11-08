/**
 * Block background jobs that name an outbound URL unless Egress 4.4 allows it.
 * Does not scan catalog text for incidental http:// strings.
 */
const { evaluateEgress } = require("./security/egressPolicy");

const URL_KEYS = Object.freeze(["outboundUrl", "fetchUrl", "webhookUrl", "destinationUrl", "callbackUrl"]);

function collectExplicitUrls(payload = {}) {
  const urls = [];
  for (const key of URL_KEYS) {
    const value = payload[key];
    if (typeof value === "string" && /^https?:\/\//i.test(value)) urls.push({ key, url: value });
  }
  return urls;
}

function assertJobPayloadEgress(payload = {}) {
  const found = collectExplicitUrls(payload);
  for (const row of found) {
    const decision = evaluateEgress({ destinationUrl: row.url, payload });
    if (!decision.allowed) {
      return {
        ok: false,
        blocked: true,
        reachedNetwork: false,
        code: decision.code,
        key: row.key,
        url: row.url,
        host: decision.host,
      };
    }
  }
  return { ok: true, blocked: false, urls: found.map((row) => row.url) };
}

module.exports = { URL_KEYS, collectExplicitUrls, assertJobPayloadEgress };
