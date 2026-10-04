/**
 * Esat Bey — orchestrator security guard.
 * User / transcript / supplier / product text is always untrusted.
 */

const INJECTION_PATTERNS = [
  /ignore[\s\S]{0,40}(instructions|prompts)/i,
  /you are now /i,
  /system prompt/i,
  /reveal (your )?(system|hidden) (prompt|instructions)/i,
  /override (safety|security|guard)/i,
  /disregard (the )?(rules|policy)/i,
  /<\|system\|>/i,
  /\[INST\]/i,
];

const SECRET_KEYS = [
  "password",
  "passwd",
  "secret",
  "token",
  "apiKey",
  "api_key",
  "authorization",
  "cvv",
  "cvc",
  "cardNumber",
  "card_number",
  "pan",
  "iban",
  "ssn",
  "privateKey",
  "private_key",
];

const SECRET_VALUE = /\b(sk-|pk_live_|Bearer\s+[A-Za-z0-9._-]{12,}|AKIA[0-9A-Z]{16})\b/i;

function detectPromptInjection(text) {
  const raw = String(text || "");
  const hits = INJECTION_PATTERNS.filter((re) => re.test(raw)).map((re) => re.source);
  return {
    detected: hits.length > 0,
    patterns: hits,
    untrusted: true,
  };
}

function sanitizeText(text) {
  return String(text || "")
    .replace(SECRET_VALUE, "[REDACTED]")
    .slice(0, 8000);
}

function redactObject(value, depth = 0) {
  if (depth > 6 || value == null) return value;
  if (typeof value === "string") return sanitizeText(value);
  if (Array.isArray(value)) return value.map((item) => redactObject(item, depth + 1));
  if (typeof value !== "object") return value;
  const out = {};
  for (const [key, val] of Object.entries(value)) {
    if (SECRET_KEYS.includes(key) || /password|secret|token|cvv|credential/i.test(key)) {
      out[key] = "[REDACTED]";
    } else {
      out[key] = redactObject(val, depth + 1);
    }
  }
  return out;
}

function containsSensitivePayment(text) {
  const raw = String(text || "");
  return /\b(?:\d[ -]*?){13,19}\b/.test(raw) || /\bcvv\s*[:=]?\s*\d{3,4}\b/i.test(raw);
}

function classifySecurityEvent(text) {
  const injection = detectPromptInjection(text);
  if (injection.detected) {
    return { type: "PROMPT_INJECTION", action: "BLOCK_OVERRIDE", audit: true, alert: true };
  }
  if (containsSensitivePayment(text)) {
    return { type: "PAYMENT_SECRET", action: "STRIP_AND_HANDOFF_PAYMENT", audit: true, alert: true };
  }
  return { type: "CLEAN", action: "ALLOW", audit: false, alert: false };
}

module.exports = {
  detectPromptInjection,
  sanitizeText,
  redactObject,
  containsSensitivePayment,
  classifySecurityEvent,
  SECRET_KEYS,
};
