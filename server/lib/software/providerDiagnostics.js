/**
 * Safe provider diagnostics. Default is dry-run / no network.
 * Never writes, never enables sales, never starts paid sessions.
 */

const { inventory } = require("./externalIntegrations");

const PRODUCTION_HOST_HINT = /(^|\.)buzzard24\.de$|(^|\.)onrender\.com$|api\.openai\.com|api\.stripe\.com|api\.paypal\.com/i;
const PRIVATE_HOST_HINT = /^(localhost|127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[0-1])\.|0\.0\.0\.0|\[::1\])/i;
const WRITE_PATH_HINT = /\/(orders|payments|charges|refunds|captures|shipments|listings|publish|messages|sms|calls|checkout)\b/i;
const DEFAULT_TIMEOUT_MS = 3_000;
const MAX_TIMEOUT_MS = 8_000;

function redact(value) {
  const blob = JSON.stringify(value);
  if (/sk-|rk_|whsec_|BEGIN PRIVATE|TWILIO_AUTH_TOKEN=/.test(blob)) {
    throw new Error("secret_leaked_into_provider_diagnostics");
  }
  return value;
}

function probeFlags(input = {}) {
  const requested = input.allowNetwork === true || process.env.BUZZARD_PROVIDER_PROBE === "1";
  const allowProduction = process.env.BUZZARD_PROVIDER_PROBE_ALLOW_PRODUCTION === "1";
  return { requested, allowProduction };
}

function isProductionTarget(url) {
  if (!url) return false;
  try {
    const host = new URL(url).hostname;
    return PRODUCTION_HOST_HINT.test(host);
  } catch {
    return true;
  }
}

function isPrivateOrInvalidTarget(url) {
  if (!url) return false;
  try {
    const parsed = new URL(url);
    if (!/^https?:$/.test(parsed.protocol)) return true;
    return PRIVATE_HOST_HINT.test(parsed.hostname);
  } catch {
    return true;
  }
}

function isWriteIntentUrl(url) {
  if (!url) return false;
  try {
    return WRITE_PATH_HINT.test(new URL(url).pathname);
  } catch {
    return true;
  }
}

function boundTimeout(timeoutMs) {
  const value = Number(timeoutMs ?? DEFAULT_TIMEOUT_MS);
  if (!Number.isFinite(value) || value <= 0) return DEFAULT_TIMEOUT_MS;
  return Math.min(value, MAX_TIMEOUT_MS);
}

function classifyItem(item, flags) {
  const configured = Boolean(item.credentialsPresent);
  return {
    provider: item.id,
    name: item.name,
    category: item.category,
    adapterExists: item.adapterExists !== false,
    configured,
    probeAllowed: false,
    attempted: false,
    reachable: false,
    authenticated: false,
    endToEndVerified: false,
    productionVerified: false,
    live: false,
    write: false,
    status: configured ? "CONFIGURED_NOT_VERIFIED" : "NOT_CONFIGURED",
    reason: flags.requested
      ? "PROBE_NOT_AUTHORIZED_FOR_NETWORK"
      : "DRY_RUN_NO_NETWORK",
    note: flags.requested
      ? "Probe requested but this harness never opens a network session without a separately authorized operator policy. Reachability is not authentication."
      : "Dry-run. No network. Credentials are presence-only.",
  };
}

function diagnose(input = {}) {
  const flags = probeFlags(input);
  const timeoutMs = boundTimeout(input.timeoutMs);
  const items = inventory().items.map((item) => classifyItem(item, flags));

  if (input.url && isWriteIntentUrl(input.url)) {
    return redact({
      ok: false,
      dryRun: true,
      probeAllowed: false,
      attempted: false,
      reachable: false,
      authenticated: false,
      endToEndVerified: false,
      productionVerified: false,
      reason: "WRITE_ENDPOINT_REJECTED",
      timeoutMs,
      salesEnabled: false,
      liveReady: false,
      items,
    });
  }

  if (input.url && isPrivateOrInvalidTarget(input.url) && !isProductionTarget(input.url)) {
    return redact({
      ok: false,
      dryRun: true,
      probeAllowed: false,
      attempted: false,
      reachable: false,
      authenticated: false,
      endToEndVerified: false,
      productionVerified: false,
      reason: "INVALID_OR_PRIVATE_URL_REJECTED",
      timeoutMs,
      salesEnabled: false,
      liveReady: false,
      items,
    });
  }

  if (flags.requested && input.url && isProductionTarget(input.url) && !flags.allowProduction) {
    return redact({
      ok: false,
      dryRun: true,
      probeAllowed: false,
      attempted: false,
      reachable: false,
      authenticated: false,
      endToEndVerified: false,
      productionVerified: false,
      reason: "PRODUCTION_URL_REJECTED",
      timeoutMs,
      salesEnabled: false,
      liveReady: false,
      items,
    });
  }

  return redact({
    ok: true,
    dryRun: true,
    probeAllowed: false,
    attempted: false,
    authenticated: false,
    reachable: false,
    endToEndVerified: false,
    productionVerified: false,
    timeoutMs,
    salesEnabled: false,
    productSourceOfTruthActive: false,
    writeRequests: 0,
    paidSessions: 0,
    messagesSent: 0,
    secretsIncluded: false,
    items,
    counts: {
      total: items.length,
      configured: items.filter((i) => i.configured).length,
      notConfigured: items.filter((i) => i.status === "NOT_CONFIGURED").length,
      notVerified: items.filter((i) => i.status === "CONFIGURED_NOT_VERIFIED").length,
      live: 0,
    },
    note: "Code inventory only. Do not infer authentication from configuration presence. Not attempted is not failed authentication.",
  });
}

module.exports = {
  diagnose,
  probeFlags,
  isProductionTarget,
  isPrivateOrInvalidTarget,
  isWriteIntentUrl,
  boundTimeout,
  DEFAULT_TIMEOUT_MS,
  MAX_TIMEOUT_MS,
};
