const spend = new Map();
const events = [];

const RATES = {
  openai_stt_per_min: 0.006,
  deepgram_stt_per_min: 0.0043,
  openai_tts_per_char: 0.000015,
  elevenlabs_tts_per_char: 0.00003,
  twilio_per_min: 0.014,
  llm_per_token: 0.000002,
};

function dayKey(customerId = "anon") {
  return `${customerId}:${new Date().toISOString().slice(0, 10)}`;
}

function estimateStt(durationMs, provider) {
  const rates = { openai: 0.006, whisper: 0.006, deepgram: 0.0043, azure: 0.016, google: 0.006 };
  const rate = rates[provider];
  if (rate == null) return null;
  const minutes = Number(durationMs || 0) / 60000;
  return Number((minutes * rate).toFixed(6));
}

function estimateTts(chars, provider) {
  const rates = { openai: 0.000015, elevenlabs: 0.00003, azure: 0.000016, google: 0.000016, aws: 0.000004 };
  const rate = rates[provider];
  if (rate == null) return null;
  return Number((Number(chars || 0) * rate).toFixed(6));
}

function estimatePhone(seconds, provider) {
  const rates = { twilio: 0.014, telnyx: 0.01, vonage: 0.014, plivo: 0.012 };
  const rate = rates[provider];
  if (rate == null) return null;
  const minutes = Number(seconds || 0) / 60;
  return Number((minutes * rate).toFixed(6));
}

function recordUsage({
  customerId,
  conversationId,
  sessionId,
  callId,
  requestId,
  model = "stub",
  tokens = 0,
  sttSeconds = 0,
  ttsSeconds = 0,
  phoneSeconds = 0,
  provider,
  kind,
  estimatedCost,
  actualCost,
} = {}) {
  const key = dayKey(customerId);
  const row = spend.get(key) || {
    tokens: 0,
    sttSeconds: 0,
    ttsSeconds: 0,
    phoneSeconds: 0,
    requests: 0,
    estimatedCost: 0,
    actualCost: 0,
    model,
  };
  row.tokens += Number(tokens) || 0;
  row.sttSeconds += Number(sttSeconds) || 0;
  row.ttsSeconds += Number(ttsSeconds) || 0;
  row.phoneSeconds += Number(phoneSeconds) || 0;
  row.requests += 1;
  const est =
    estimatedCost != null
      ? Number(estimatedCost)
      : null;
  if (est != null) {
    row.estimatedCost = Number((row.estimatedCost + est).toFixed(6));
  }
  row.actualCost = Number((row.actualCost + Number(actualCost || 0)).toFixed(6));
  spend.set(key, row);
  const event = {
    customerId,
    conversationId,
    sessionId,
    callId,
    requestId,
    provider,
    kind,
    tokens,
    sttSeconds,
    ttsSeconds,
    phoneSeconds,
    estimatedCost: est,
    actualCost: Number(actualCost || 0),
    at: new Date().toISOString(),
  };
  events.push(event);
  if (events.length > 500) events.shift();
  return { ...row, customerId, conversationId, lastEvent: event };
}

function withinLimits({ customerId, maxTokensPerDay = 200000, maxRequestsPerDay = 500, maxPhoneSeconds = 3600 } = {}) {
  const row = spend.get(dayKey(customerId)) || { tokens: 0, requests: 0, phoneSeconds: 0 };
  if (row.tokens > maxTokensPerDay) return { ok: false, code: "COST_TOKEN_LIMIT" };
  if (row.requests > maxRequestsPerDay) return { ok: false, code: "COST_REQUEST_LIMIT" };
  if (row.phoneSeconds > maxPhoneSeconds) return { ok: false, code: "COST_PHONE_LIMIT" };
  return { ok: true, usage: row };
}

function snapshot() {
  return {
    days: Object.fromEntries(spend.entries()),
    recent: events.slice(-40),
  };
}

function resetCosts() {
  spend.clear();
  events.length = 0;
}

module.exports = {
  recordUsage,
  withinLimits,
  snapshot,
  estimateStt,
  estimateTts,
  estimatePhone,
  resetCosts,
  RATES,
};
