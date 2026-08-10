const fs = require("fs");
const path = require("path");
const { logSecurityEvent } = require("./securityLog");

const dataDir = path.join(__dirname, "..", "data");
const lockFile = path.join(dataDir, "account-lockouts.json");

const DEFAULTS = {
  maxFailures: 5,
  lockMs: 30 * 60 * 1000,
};

function ensureDataDir() {
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
}

function readState() {
  ensureDataDir();
  if (!fs.existsSync(lockFile)) return {};
  try {
    return JSON.parse(fs.readFileSync(lockFile, "utf8") || "{}");
  } catch {
    return {};
  }
}

function writeState(state) {
  ensureDataDir();
  fs.writeFileSync(lockFile, JSON.stringify(state, null, 2), "utf8");
}

function makeKey(scope, identifier) {
  return `${scope}:${String(identifier || "unknown").trim().toLowerCase()}`;
}

function getEntry(scope, identifier) {
  const state = readState();
  const key = makeKey(scope, identifier);
  const entry = state[key];
  if (!entry) return null;
  if (entry.lockedUntil && entry.lockedUntil <= Date.now()) {
    delete state[key];
    writeState(state);
    return null;
  }
  return entry;
}

function isLocked(scope, identifier) {
  const entry = getEntry(scope, identifier);
  return Boolean(entry?.lockedUntil && entry.lockedUntil > Date.now());
}

function getLockoutInfo(scope, identifier) {
  const entry = getEntry(scope, identifier);
  if (!entry?.lockedUntil || entry.lockedUntil <= Date.now()) {
    return { locked: false, failures: entry?.failures || 0 };
  }
  return {
    locked: true,
    failures: entry.failures || DEFAULTS.maxFailures,
    lockedUntil: entry.lockedUntil,
    retryAfterSec: Math.ceil((entry.lockedUntil - Date.now()) / 1000),
  };
}

function recordFailure(scope, identifier, meta = {}) {
  const state = readState();
  const key = makeKey(scope, identifier);
  const now = Date.now();
  const current = state[key] || { failures: 0, lockedUntil: null };
  if (current.lockedUntil && current.lockedUntil <= now) {
    current.failures = 0;
    current.lockedUntil = null;
  }

  current.failures += 1;
  current.lastFailure = new Date(now).toISOString();

  let locked = false;
  if (current.failures >= DEFAULTS.maxFailures) {
    current.lockedUntil = now + DEFAULTS.lockMs;
    locked = true;
    logSecurityEvent({
      type: `${scope}_account_locked`,
      success: false,
      ip: meta.ip || null,
      email: meta.email || null,
      path: meta.path || null,
      detail: { failures: current.failures, retryAfterSec: Math.ceil(DEFAULTS.lockMs / 1000) },
    });
  }

  state[key] = current;
  writeState(state);

  return {
    locked,
    failures: current.failures,
    remainingAttempts: Math.max(0, DEFAULTS.maxFailures - current.failures),
    retryAfterSec: locked ? Math.ceil((current.lockedUntil - now) / 1000) : 0,
  };
}

function clearFailures(scope, identifier) {
  const state = readState();
  const key = makeKey(scope, identifier);
  if (state[key]) {
    delete state[key];
    writeState(state);
  }
}

function listLockouts(limit = 50) {
  const state = readState();
  const now = Date.now();
  return Object.entries(state)
    .map(([key, entry]) => ({
      key,
      failures: entry.failures || 0,
      lockedUntil: entry.lockedUntil || null,
      locked: Boolean(entry.lockedUntil && entry.lockedUntil > now),
      lastFailure: entry.lastFailure || null,
    }))
    .filter((entry) => entry.locked || entry.failures > 0)
    .sort((a, b) => (b.lockedUntil || 0) - (a.lockedUntil || 0))
    .slice(0, limit);
}

module.exports = {
  isLocked,
  getLockoutInfo,
  recordFailure,
  clearFailures,
  listLockouts,
  DEFAULTS,
};
