/**
 * Configuration-level Claude independence scan. Does not contact networks.
 */
const { evaluateEgress } = require("./egressPolicy");
const { assertIndependentRuntime, FORBIDDEN_PRODUCTION_PROVIDERS } = require("../ai/independentCapabilities");

function scan() {
  const hosts = [
    "https://api.anthropic.com/v1/messages",
    "https://api.claude.ai/v1",
    "https://api.openai.com/v1/chat",
  ];
  const egress = hosts.map((destinationUrl) => ({
    destinationUrl,
    allowed: evaluateEgress({ destinationUrl, payload: {} }).allowed,
  }));
  return {
    forbiddenProviders: FORBIDDEN_PRODUCTION_PROVIDERS,
    runtime: ["claude", "anthropic", "claude-code"].map((p) => assertIndependentRuntime(p)),
    egress,
    indirectUnlock: false,
    integrated: false,
  };
}

module.exports = { scan };
