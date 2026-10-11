/**
 * Safe provider diagnostics. Default is dry-run / no network.
 * Never writes, never enables sales, never starts paid sessions.
 */

const { inventory } = require("./externalIntegrations");

const PRODUCTION_HOST_HINT = /(^|\.)buzzard24\.de$|(^|\.)onrender\.com$|api\.openai\.com|api\.stripe\.com|api\.paypal\.com/i;

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

function diagnose(input = {}) {
  const flags = probeFlags(input);
  const items = inventory().items.map((item) => {
    const configured = Boolean(item.credentialsPresent);
    const probeAllowed = false;
    return {
      provider: item.id,
      name: item.name,
      category: item.category,
      configured,
      probeAllowed,
      attempted: false,
      authenticated: false,
      reachable: false,
      live: false,
      write: false,
      status: configured ? "NOT_VERIFIED" : "NOT_CONFIGURED",
      note: flags.requested
        ? "Probe requested but this harness never opens a network session without a separately authorized operator policy. Reachability is not authentication."
        : "Dry-run. No network. Credentials are presence-only.",
    };
  });

  if (flags.requested && input.url && isProductionTarget(input.url) && !flags.allowProduction) {
    return redact({
      ok: false,
      dryRun: true,
      probeAllowed: false,
      attempted: false,
      reason: "PRODUCTION_URL_REJECTED",
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
      notVerified: items.filter((i) => i.status === "NOT_VERIFIED").length,
      live: 0,
    },
    note: "Code inventory only. Do not infer authentication from configuration presence.",
  });
}

module.exports = { diagnose, probeFlags, isProductionTarget };
