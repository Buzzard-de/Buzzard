const SENSITIVE_KEY = /email|phone|address|iban|card|pan|cvv|password|secret|recipient|token/i;

function redact(value) {
  if (value == null || typeof value === "number" || typeof value === "boolean") return value;
  if (typeof value === "string") {
    return value.includes("@") ? "[redacted]" : value;
  }
  if (Buffer.isBuffer(value) || value instanceof Uint8Array) return value;
  if (Array.isArray(value)) return value.map(redact);
  if (typeof value === "object") {
    const out = {};
    for (const [key, item] of Object.entries(value)) {
      out[key] = SENSITIVE_KEY.test(key) ? "[redacted]" : redact(item);
    }
    return out;
  }
  return null;
}

module.exports = { redact };
