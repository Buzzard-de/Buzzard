const SECRET_PATTERN =
  /(api[_-]?key|access[_-]?token|refresh[_-]?token|password|passwd|secret|authorization|cookie|bearer\s+[a-z0-9._-]+)/i;

function redactValue(value) {
  if (value == null) return value;
  if (typeof value === "string") {
    if (SECRET_PATTERN.test(value) && value.length > 8) return "[REDACTED]";
    return value.replace(
      /(api[_-]?key|token|password|secret)\s*[:=]\s*["']?[^\s"',}]+/gi,
      "$1=[REDACTED]"
    );
  }
  if (Array.isArray(value)) return value.map(redactValue);
  if (typeof value === "object") {
    const out = {};
    for (const [key, item] of Object.entries(value)) {
      out[key] = SECRET_PATTERN.test(key) ? "[REDACTED]" : redactValue(item);
    }
    return out;
  }
  return value;
}

function containsSecret(value) {
  if (value == null) return false;
  if (typeof value === "string") return SECRET_PATTERN.test(value);
  if (Array.isArray(value)) return value.some(containsSecret);
  if (typeof value === "object") {
    return Object.entries(value).some(([key, item]) => SECRET_PATTERN.test(key) || containsSecret(item));
  }
  return false;
}

module.exports = { redactValue, containsSecret, SECRET_PATTERN };
