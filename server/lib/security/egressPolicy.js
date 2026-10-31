/**
 * Egress allowlist — deny by default for classified data.
 * Does not prove production traffic; evaluates intended destinations only.
 */
const ALLOWLIST = Object.freeze([
  "buzzard24.de",
  "buzzard-api.onrender.com",
  "api.github.com",
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

function evaluateEgress({ destinationUrl, payload = {} } = {}) {
  const host = hostOf(destinationUrl);
  const classification = classify(payload);
  const allowlisted = ALLOWLIST.includes(host);
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
  CLASSIFIED,
  classify,
  evaluateEgress,
  inventoryDependencies,
};
