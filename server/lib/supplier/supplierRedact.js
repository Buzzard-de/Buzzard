/**
 * Redact supplier credentials from plain objects. No database and no network.
 */
function redactSecrets(obj) {
  const copy = { ...obj };
  if (copy._apiKeyRaw) copy._apiKeyRaw = "[REDACTED]";
  if (copy.apiKey && copy.apiKey !== "[REDACTED]") copy.apiKey = "[REDACTED]";
  return copy;
}

module.exports = { redactSecrets };
