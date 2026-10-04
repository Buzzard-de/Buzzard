const { executeWithProvider, getActiveProvider, isProviderConfigured } = require("../../aiProviders");
const { PROVIDER_HEALTH } = require("../constants");
const breaker = require("../circuitBreaker");
const { withTimeout } = require("../timeout");

async function complete({ prompt, context, timeoutMs = 8000 } = {}) {
  const name = getActiveProvider();
  if (!breaker.allow("ai")) {
    return { ok: false, code: "CIRCUIT_OPEN", provider: name };
  }
  try {
    const result = await withTimeout(
      executeWithProvider({ provider: name, prompt, context }),
      timeoutMs,
      "AI_TIMEOUT"
    );
    if (result.ok) breaker.recordSuccess("ai");
    else breaker.recordFailure("ai");
    return result;
  } catch (error) {
    breaker.recordFailure("ai");
    return { ok: false, code: error.code || "AI_ERROR", message: error.message };
  }
}

function health() {
  if (!isProviderConfigured()) return PROVIDER_HEALTH.NOT_CONFIGURED;
  return breaker.healthOf("ai");
}

module.exports = {
  complete,
  health,
  getActiveProvider,
};
