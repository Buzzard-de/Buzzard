/**
 * Egress allowlist — deny by default.
 * Live Render/GitHub firewall is still operator-owned.
 */
const ALLOWLIST = Object.freeze([
  "buzzard24.de",
  "buzzard-api.onrender.com",
  "api.github.com",
]);

const FORBIDDEN_AI_HOSTS = Object.freeze([
  "api.anthropic.com",
  "api.openai.com",
  "generativelanguage.googleapis.com",
  "api.claude.ai",
]);

const CLASSIFIED = Object.freeze(["customer", "order", "payment", "source_code", "finance", "ai_memory"]);

function classify(payload = {}) {
  if (payload.card || payload.iban || payload.paymentMethod) return "payment";
  if (payload.orderId || payload.orders) return "order";
  if (payload.email || payload.customerId) return "customer";
  if (payload.source || payload.repository) return "source_code";
  if (payload.invoice || payload.vatId) return "finance";
  if (payload.memory || payload.aiMemory) return "ai_memory";
  return payload.classification || "public";
}

function hostOf(url) {
  try {
    return new URL(url).hostname;
  } catch {
    return "";
  }
}

function extraHosts() {
  return String(process.env.BUZZARD_EGRESS_EXTRA_HOSTS || "")
    .split(",")
    .map((h) => h.trim().toLowerCase())
    .filter(Boolean);
}

function evaluateEgress({ destinationUrl, payload = {} } = {}) {
  const host = hostOf(destinationUrl);
  const classification = classify(payload);
  if (FORBIDDEN_AI_HOSTS.includes(host)) {
    return {
      ok: false,
      allowed: false,
      code: "EXTERNAL_AI_EGRESS_DENIED",
      host,
      classification,
      note: "Claude/OpenAI/Google AI hosts are never allowlisted.",
    };
  }
  const allowlisted = ALLOWLIST.includes(host) || extraHosts().includes(host.toLowerCase());
  const sensitive = CLASSIFIED.includes(classification);
  if (sensitive && !allowlisted) {
    return {
      ok: false,
      allowed: false,
      code: "EGRESS_DENIED",
      host,
      classification,
      note: "Classified Buzzard data must not leave the allowlist.",
    };
  }
  if (!allowlisted) {
    return {
      ok: false,
      allowed: false,
      code: "HOST_NOT_ALLOWLISTED",
      host,
      classification,
    };
  }
  return { ok: true, allowed: true, host, classification };
}

function inventoryDependencies() {
  return {
    storefront: "GitHub Pages / buzzard24.de",
    api: "Render buzzard-api",
    orchestrator: "Render buzzard-orchestrator (optional)",
    guardian: "Render buzzard-guardian (optional)",
    note: "Live egress is not proven by this module. Confirm Render/GitHub firewall separately.",
  };
}

module.exports = {
  ALLOWLIST,
  FORBIDDEN_AI_HOSTS,
  CLASSIFIED,
  classify,
  evaluateEgress,
  inventoryDependencies,
};
