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

const FORBIDDEN_AI_SUFFIXES = Object.freeze([
  ".anthropic.com",
  ".openai.com",
  ".claude.ai",
  ".googleapis.com",
]);

const PAYMENT_HOST_SUFFIXES = Object.freeze([".stripe.com", ".paypal.com", "stripe.com", "paypal.com"]);

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

function isIpLiteral(host) {
  return /^\d{1,3}(\.\d{1,3}){3}$/.test(host) || host.includes(":");
}

function isForbiddenAiHost(host) {
  const h = String(host || "").toLowerCase();
  if (!h) return false;
  if (FORBIDDEN_AI_HOSTS.includes(h)) return true;
  return FORBIDDEN_AI_SUFFIXES.some((suffix) => h === suffix.slice(1) || h.endsWith(suffix));
}

function isPaymentHost(host) {
  const h = String(host || "").toLowerCase();
  return PAYMENT_HOST_SUFFIXES.some((suffix) => h === suffix.replace(/^\./, "") || h.endsWith(suffix.startsWith(".") ? suffix : `.${suffix}`));
}

function extraHosts() {
  return String(process.env.BUZZARD_EGRESS_EXTRA_HOSTS || "")
    .split(",")
    .map((h) => h.trim().toLowerCase())
    .filter(Boolean)
    .filter((h) => !h.includes("*") && !h.includes("?") && !h.startsWith("."))
    .filter((h) => !isForbiddenAiHost(h) && !isPaymentHost(h) && !isIpLiteral(h));
}

function isPrivateOrLocalHost(host) {
  const h = String(host || "").toLowerCase().replace(/^\[|\]$/g, "");
  if (h === "localhost" || h === "metadata.google.internal") return true;
  if (h === "0.0.0.0" || h === "::1" || h.startsWith("fe80:") || h.startsWith("fc") || h.startsWith("fd")) return true;
  const ipv4 = h.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (!ipv4) return false;
  const a = Number(ipv4[1]);
  const b = Number(ipv4[2]);
  if (a === 10 || a === 127 || a === 0) return true;
  if (a === 169 && b === 254) return true;
  if (a === 192 && b === 168) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  return false;
}

function evaluateEgress({ destinationUrl, payload = {} } = {}) {
  let parsed;
  try {
    parsed = new URL(destinationUrl);
  } catch {
    return { ok: false, allowed: false, code: "INVALID_URL", host: "", classification: classify(payload) };
  }
  const host = parsed.hostname;
  const classification = classify(payload);
  if (parsed.username || parsed.password) {
    return { ok: false, allowed: false, code: "URL_USERINFO_DENIED", host, classification };
  }
  if (parsed.protocol !== "https:") {
    return { ok: false, allowed: false, code: "HTTPS_REQUIRED", host, classification };
  }
  if (parsed.port && parsed.port !== "443") {
    return { ok: false, allowed: false, code: "PORT_DENIED", host, classification };
  }
  if (isPrivateOrLocalHost(host) || isIpLiteral(host)) {
    return { ok: false, allowed: false, code: "PRIVATE_OR_IP_DENIED", host, classification };
  }
  if (isForbiddenAiHost(host)) {
    return {
      ok: false,
      allowed: false,
      code: "EXTERNAL_AI_EGRESS_DENIED",
      host,
      classification,
      note: "Claude/OpenAI/Google AI hosts are never allowlisted.",
    };
  }
  if (isPaymentHost(host)) {
    return {
      ok: false,
      allowed: false,
      code: "PAYMENT_EGRESS_LOCKED",
      host,
      classification,
      note: "Stripe/PayPal stay closed until Süleyman Bey approves live payments.",
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
  extraHosts,
  isForbiddenAiHost,
  isPaymentHost,
  isPrivateOrLocalHost,
  inventoryDependencies,
};
