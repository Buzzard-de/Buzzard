/**
 * AI provider abstraction — stub by default.
 * Live HTTP is never called unless a key exists AND BUZZARD_AI_LIVE_PROBE=1.
 * Keys are never logged or returned.
 */

const PROVIDERS = Object.freeze({
  STUB: "stub",
  OPENAI: "openai",
  ANTHROPIC: "anthropic",
  GOOGLE: "google",
});

const DEFAULT_TIMEOUT_MS = 8000;
const RATE_WINDOW_MS = 60_000;
const RATE_LIMIT = 30;
const hits = new Map();

function getActiveProvider() {
  return process.env.BUZZARD_AI_PROVIDER || PROVIDERS.STUB;
}

function providerEnvKey(name) {
  if (name === PROVIDERS.OPENAI) return "OPENAI_API_KEY";
  if (name === PROVIDERS.ANTHROPIC) return "ANTHROPIC_API_KEY";
  if (name === PROVIDERS.GOOGLE) return "GOOGLE_AI_API_KEY";
  return null;
}

function isProviderConfigured(name) {
  const provider = name || getActiveProvider();
  if (provider === PROVIDERS.STUB) return true;
  const envKey = providerEnvKey(provider);
  return Boolean(envKey && process.env[envKey]);
}

function redact(value) {
  if (value == null) return value;
  const text = typeof value === "string" ? value : JSON.stringify(value);
  return text
    .replace(/sk-[A-Za-z0-9_-]{10,}/g, "[redacted]")
    .replace(/(api[_-]?key|token|secret|password)\s*[:=]\s*\S+/gi, "$1=[redacted]");
}

function classifyProviderError(error) {
  const message = String(error?.message || error || "provider_error");
  if (/timeout|abort/i.test(message)) return { code: "provider_timeout", retryable: true };
  if (/429|rate/i.test(message)) return { code: "provider_rate_limited", retryable: true };
  if (/401|403|unauthorized/i.test(message)) return { code: "provider_unauthorized", retryable: false };
  if (/not_implemented|not wired/i.test(message)) return { code: "provider_not_implemented", retryable: false };
  if (/not_configured|missing/i.test(message)) return { code: "provider_not_configured", retryable: false };
  return { code: "provider_error", retryable: false };
}

function recordHit(provider) {
  const now = Date.now();
  const list = (hits.get(provider) || []).filter((t) => now - t < RATE_WINDOW_MS);
  list.push(now);
  hits.set(provider, list);
  return list.length;
}

function resetProviderRateLimiter() {
  hits.clear();
}

function validateOutputSchema(output) {
  if (!output || typeof output !== "object") {
    return { ok: false, error: "invalid_provider_output" };
  }
  return { ok: true };
}

async function executeWithProvider({ provider, prompt, context, timeoutMs = DEFAULT_TIMEOUT_MS } = {}) {
  const active = provider || getActiveProvider();
  const started = Date.now();

  if (recordHit(active) > RATE_LIMIT) {
    return {
      ok: false,
      provider: active,
      error: "provider_rate_limited",
      retryable: true,
      message: "Provider rate limit exceeded",
    };
  }

  if (active === PROVIDERS.STUB) {
    const output = {
      summary: "Stub provider — no external AI call",
      promptLength: String(prompt || "").length,
      contextKeys: context ? Object.keys(context) : [],
    };
    return {
      ok: true,
      provider: PROVIDERS.STUB,
      live: false,
      usage: { promptTokens: 0, completionTokens: 0, latencyMs: Date.now() - started },
      output,
    };
  }

  if (!isProviderConfigured(active)) {
    return {
      ok: false,
      provider: active,
      live: false,
      error: "provider_not_configured",
      retryable: false,
      message: `${active} key is not configured`,
    };
  }

  if (process.env.BUZZARD_AI_LIVE_PROBE !== "1") {
    return {
      ok: false,
      provider: active,
      live: false,
      error: "provider_not_implemented",
      retryable: false,
      message: `${active} adapter is wired but live probe is disabled`,
    };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch("https://example.invalid/v1/blocked", {
      method: "POST",
      signal: controller.signal,
      headers: { Accept: "application/json", "Content-Type": "application/json" },
      body: JSON.stringify({ provider: active, promptLength: String(prompt || "").length }),
    });
    const output = { status: response.status, live: false };
    const schema = validateOutputSchema(output);
    if (!schema.ok) {
      return { ok: false, provider: active, error: schema.error, retryable: false };
    }
    return { ok: false, provider: active, live: false, error: "provider_unreachable", retryable: true };
  } catch (error) {
    const classified = classifyProviderError(error);
    return {
      ok: false,
      provider: active,
      live: false,
      error: classified.code,
      retryable: classified.retryable,
      message: redact(error.message),
    };
  } finally {
    clearTimeout(timer);
  }
}

module.exports = {
  PROVIDERS,
  getActiveProvider,
  isProviderConfigured,
  executeWithProvider,
  classifyProviderError,
  redact,
  validateOutputSchema,
  resetProviderRateLimiter,
};
