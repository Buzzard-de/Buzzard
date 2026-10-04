const spend = new Map();

function dayKey(customerId = "anon") {
  return `${customerId}:${new Date().toISOString().slice(0, 10)}`;
}

function recordUsage({
  customerId,
  conversationId,
  model = "stub",
  tokens = 0,
  sttSeconds = 0,
  ttsSeconds = 0,
  phoneSeconds = 0,
} = {}) {
  const key = dayKey(customerId);
  const row = spend.get(key) || {
    tokens: 0,
    sttSeconds: 0,
    ttsSeconds: 0,
    phoneSeconds: 0,
    requests: 0,
    model,
  };
  row.tokens += Number(tokens) || 0;
  row.sttSeconds += Number(sttSeconds) || 0;
  row.ttsSeconds += Number(ttsSeconds) || 0;
  row.phoneSeconds += Number(phoneSeconds) || 0;
  row.requests += 1;
  spend.set(key, row);
  return { ...row, customerId, conversationId };
}

function withinLimits({ customerId, maxTokensPerDay = 200000, maxRequestsPerDay = 500, maxPhoneSeconds = 3600 } = {}) {
  const row = spend.get(dayKey(customerId)) || { tokens: 0, requests: 0, phoneSeconds: 0 };
  if (row.tokens > maxTokensPerDay) return { ok: false, code: "COST_TOKEN_LIMIT" };
  if (row.requests > maxRequestsPerDay) return { ok: false, code: "COST_REQUEST_LIMIT" };
  if (row.phoneSeconds > maxPhoneSeconds) return { ok: false, code: "COST_PHONE_LIMIT" };
  return { ok: true, usage: row };
}

function snapshot() {
  return Object.fromEntries(spend.entries());
}

module.exports = {
  recordUsage,
  withinLimits,
  snapshot,
};
