/**
 * Part 5 — Upstash Redis REST client (no native redis dependency).
 * Secrets stay server-side only.
 */
const DEFAULT_TIMEOUT_MS = 5000;

function getConfig() {
  const url = process.env.UPSTASH_REDIS_REST_URL || process.env.BUZZARD_REDIS_REST_URL || "";
  const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.BUZZARD_REDIS_REST_TOKEN || "";
  return { url: url.replace(/\/$/, ""), token };
}

function isConfigured() {
  const { url, token } = getConfig();
  return Boolean(url && token);
}

async function redisCommand(command) {
  const { url, token } = getConfig();
  if (!url || !token) {
    throw new Error("Redis not configured");
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(command),
      signal: controller.signal,
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(body.error || `Redis HTTP ${res.status}`);
    }
    return body.result;
  } finally {
    clearTimeout(timer);
  }
}

async function get(key) {
  return redisCommand(["GET", key]);
}

async function set(key, value, exSeconds) {
  if (exSeconds) {
    return redisCommand(["SET", key, value, "EX", String(exSeconds)]);
  }
  return redisCommand(["SET", key, value]);
}

async function ping() {
  const result = await redisCommand(["PING"]);
  return result === "PONG";
}

async function healthCheck() {
  const start = Date.now();
  try {
    if (!isConfigured()) {
      return { ok: false, configured: false, latencyMs: null, error: "not_configured" };
    }
    await ping();
    return { ok: true, configured: true, latencyMs: Date.now() - start, error: null };
  } catch (err) {
    return {
      ok: false,
      configured: true,
      latencyMs: Date.now() - start,
      error: err.message,
    };
  }
}

module.exports = {
  isConfigured,
  getConfig: () => ({ configured: isConfigured() }),
  get,
  set,
  ping,
  healthCheck,
};
