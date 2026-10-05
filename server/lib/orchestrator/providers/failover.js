const RETRYABLE = new Set(["PROVIDER_TIMEOUT", "PROVIDER_ERROR", "RATE_LIMITED", "CIRCUIT_OPEN", "TIMEOUT"]);
const NEVER_RETRY = new Set([
  "PROVIDER_AUTH_FAILED",
  "STT_PROVIDER_NOT_CONFIGURED",
  "TTS_PROVIDER_NOT_CONFIGURED",
  "PHONE_PROVIDER_NOT_CONFIGURED",
  "STT_PROVIDER_NOT_WIRED",
  "TTS_PROVIDER_NOT_WIRED",
  "TELEPHONY_PROVIDER_NOT_WIRED",
  "AUDIO_MISSING",
  "AUDIO_TOO_LARGE",
  "AUDIO_FORMAT_UNSUPPORTED",
  "TTS_SENSITIVE_BLOCKED",
  "SSRF_BLOCKED",
  "INVALID_RESPONSE",
  "VOICE_DISABLED",
  "PHONE_DISABLED",
]);

function shouldFailover(code) {
  return RETRYABLE.has(String(code || ""));
}

function shouldNotFailover(code) {
  return NEVER_RETRY.has(String(code || ""));
}

async function runChain(runners = []) {
  let last = { ok: false, code: "PROVIDER_ERROR" };
  const tried = [];
  for (const runner of runners) {
    if (!runner || typeof runner.fn !== "function") continue;
    if (tried.includes(runner.name)) continue;
    last = await runner.fn();
    tried.push(runner.name);
    if (last && last.ok) {
      return { ...last, failover: tried.length > 1, tried };
    }
    if (shouldNotFailover(last?.code) || !shouldFailover(last?.code)) {
      return { ...last, tried };
    }
  }
  return { ...last, tried, failoverExhausted: true };
}

module.exports = {
  shouldFailover,
  shouldNotFailover,
  runChain,
};
