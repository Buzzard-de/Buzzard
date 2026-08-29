/**
 * AI provider abstraction — no real provider calls in catalog mode.
 * Future: OpenAI, Anthropic, Google, etc.
 */

const PROVIDERS = Object.freeze({
  STUB: "stub",
  OPENAI: "openai",
  ANTHROPIC: "anthropic",
  GOOGLE: "google",
});

function getActiveProvider() {
  return process.env.BUZZARD_AI_PROVIDER || PROVIDERS.STUB;
}

function isProviderConfigured(name) {
  const provider = name || getActiveProvider();
  if (provider === PROVIDERS.STUB) return true;
  if (provider === PROVIDERS.OPENAI) return Boolean(process.env.OPENAI_API_KEY);
  if (provider === PROVIDERS.ANTHROPIC) return Boolean(process.env.ANTHROPIC_API_KEY);
  if (provider === PROVIDERS.GOOGLE) return Boolean(process.env.GOOGLE_AI_API_KEY);
  return false;
}

async function executeWithProvider({ provider, prompt, context }) {
  const active = provider || getActiveProvider();
  if (active === PROVIDERS.STUB) {
    return {
      ok: true,
      provider: PROVIDERS.STUB,
      output: {
        summary: "Stub provider — no external AI call",
        promptLength: String(prompt || "").length,
        contextKeys: context ? Object.keys(context) : [],
      },
    };
  }
  return {
    ok: false,
    provider: active,
    error: "provider_not_implemented",
    message: `${active} provider is not wired yet`,
  };
}

module.exports = {
  PROVIDERS,
  getActiveProvider,
  isProviderConfigured,
  executeWithProvider,
};
