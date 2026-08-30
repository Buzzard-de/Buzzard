/**
 * Part 16 — Image pipeline validation (HTTPS, provenance, no demo URLs).
 */
const { BLOCKING_CODES } = require("../../core/productLifecycleConstants");

const TEST_IMAGE_HOSTS = new Set(["example.com", "example.org", "example.net"]);

function extractHost(url) {
  try {
    return new URL(String(url)).hostname.toLowerCase();
  } catch {
    return "";
  }
}

function isTestImageHost(url) {
  const host = extractHost(url);
  if (!host) return true;
  if (TEST_IMAGE_HOSTS.has(host)) return true;
  if (host.endsWith(".example")) return true;
  return false;
}

function validateImageUrl(url) {
  const value = String(url || "").trim();
  if (!value) return { ok: false, code: BLOCKING_CODES.IMAGE_MISSING };
  try {
    const parsed = new URL(value);
    if (!["http:", "https:"].includes(parsed.protocol)) {
      return { ok: false, code: BLOCKING_CODES.IMAGE_INVALID };
    }
    if (parsed.protocol !== "https:") {
      return { ok: false, code: BLOCKING_CODES.IMAGE_INVALID, reason: "https_required" };
    }
    if (isTestImageHost(value)) {
      return { ok: false, code: BLOCKING_CODES.IMAGE_INVALID, reason: "test_host" };
    }
    return { ok: true, value, host: parsed.hostname };
  } catch {
    return { ok: false, code: BLOCKING_CODES.IMAGE_INVALID };
  }
}

function validateImageSet(images, { requirePrimary = true } = {}) {
  const list = Array.isArray(images) ? images.filter(Boolean) : [];
  const results = list.map((url, index) => ({
    index,
    ...validateImageUrl(url),
    url,
  }));

  const valid = results.filter((r) => r.ok);
  const invalid = results.filter((r) => !r.ok);

  if (requirePrimary && valid.length === 0) {
    return {
      ok: false,
      code: BLOCKING_CODES.IMAGE_MISSING,
      primary: null,
      additional: [],
      invalid,
    };
  }

  const seen = new Set();
  const deduped = [];
  for (const item of valid) {
    if (seen.has(item.value)) continue;
    seen.add(item.value);
    deduped.push(item);
  }

  return {
    ok: invalid.length === 0 && (!requirePrimary || deduped.length > 0),
    primary: deduped[0]?.value || null,
    additional: deduped.slice(1).map((i) => i.value),
    invalid,
    provenance: deduped.map((i) => ({ url: i.value, host: i.host, source: "supplier_feed" })),
  };
}

module.exports = {
  validateImageUrl,
  validateImageSet,
  isTestImageHost,
};
