const { PROVIDER_HEALTH } = require("./constants");

const breakers = new Map();

function state(name) {
  if (!breakers.has(name)) {
    breakers.set(name, { failures: 0, openedAt: 0, state: "CLOSED" });
  }
  return breakers.get(name);
}

function recordSuccess(name) {
  const s = state(name);
  s.failures = 0;
  s.state = "CLOSED";
  s.openedAt = 0;
}

function recordFailure(name, threshold = 5, coolMs = 30000) {
  const s = state(name);
  s.failures += 1;
  if (s.failures >= threshold) {
    s.state = "OPEN";
    s.openedAt = Date.now();
    setTimeout(() => {
      if (s.state === "OPEN") s.state = "HALF_OPEN";
    }, coolMs).unref?.();
  }
}

function allow(name) {
  const s = state(name);
  if (s.state === "OPEN") return false;
  return true;
}

function healthOf(name) {
  const s = state(name);
  if (s.state === "OPEN") return PROVIDER_HEALTH.DOWN;
  if (s.state === "HALF_OPEN" || s.failures > 0) return PROVIDER_HEALTH.DEGRADED;
  return PROVIDER_HEALTH.HEALTHY;
}

function resetAll() {
  breakers.clear();
}

module.exports = {
  recordSuccess,
  recordFailure,
  allow,
  healthOf,
  resetAll,
  state,
};
