/**
 * In-process Guardian window. One bucket per agent. No network.
 */
const buckets = new Map();

function limit() {
  const parsed = Number(process.env.BUZZARD_AGENT_RATE_MAX || 60);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 60;
}

function windowMs() {
  const parsed = Number(process.env.BUZZARD_AGENT_RATE_WINDOW_MS || 60_000);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 60_000;
}

function consumeAgentWindow(agentId, now = Date.now()) {
  const id = String(agentId || "").trim();
  if (!id) return { ok: false, allowed: false, code: "AGENT_REQUIRED" };
  const span = windowMs();
  const max = limit();
  const fresh = (buckets.get(id) || []).filter((stamp) => now - stamp < span);
  if (fresh.length >= max) {
    buckets.set(id, fresh);
    return { ok: false, allowed: false, code: "AGENT_RATE_LIMITED", agentId: id, remaining: 0 };
  }
  fresh.push(now);
  buckets.set(id, fresh);
  return { ok: true, allowed: true, code: "ALLOWED", agentId: id, remaining: max - fresh.length };
}

function resetAgentWindows() {
  buckets.clear();
}

module.exports = { consumeAgentWindow, resetAgentWindows };
