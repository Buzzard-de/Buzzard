const path = require("path");
const { logSecurityEvent } = require("./securityLog");
const { inspectJsonFile, writeJsonAtomic, withFileLock } = require("./jsonFileStore");

const dataDir = require("./dataDir").resolveDataDir();
const lockFile = path.join(dataDir, "account-lockouts.json");

const DEFAULTS = {
  maxFailures: 5,
  lockMs: 30 * 60 * 1000,
  // A failure counter that is not followed by another failure expires after this long.
  failureWindowMs: 24 * 60 * 60 * 1000,
  // Identifiers are chosen by whoever sends the login request; the store must not grow with them.
  maxEntries: 5000,
};

function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function readState() {
  const result = inspectJsonFile(lockFile, { validate: isPlainObject });
  return result.state === "ok" || result.state === "restored" ? result.value : {};
}

function isExpired(entry, now) {
  if (!isPlainObject(entry)) return true;
  if (entry.lockedUntil) return entry.lockedUntil <= now;
  const last = Date.parse(entry.lastFailure || "");
  return Number.isNaN(last) || now - last > DEFAULTS.failureWindowMs;
}

function prune(state, now) {
  for (const [key, entry] of Object.entries(state)) {
    if (isExpired(entry, now)) delete state[key];
  }
  const keys = Object.keys(state);
  if (keys.length > DEFAULTS.maxEntries) {
    // Active locks are kept; the oldest plain counters go first.
    const removable = keys
      .filter((key) => !state[key].lockedUntil)
      .sort((a, b) => String(state[a].lastFailure).localeCompare(String(state[b].lastFailure)));
    for (const key of removable.slice(0, keys.length - DEFAULTS.maxEntries)) delete state[key];
  }
  return state;
}

function update(mutate) {
  return withFileLock(lockFile, () => {
    const state = prune(readState(), Date.now());
    const result = mutate(state);
    writeJsonAtomic(lockFile, state, { backup: false });
    return result;
  });
}

function makeKey(scope, identifier) {
  return `${scope}:${String(identifier || "unknown").trim().toLowerCase().slice(0, 254)}`;
}

function getEntry(scope, identifier) {
  const entry = readState()[makeKey(scope, identifier)];
  return entry && !isExpired(entry, Date.now()) ? entry : null;
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
  const now = Date.now();
  const key = makeKey(scope, identifier);
  const outcome = update((state) => {
    const current = state[key] || { failures: 0, lockedUntil: null };
    current.failures += 1;
    current.lastFailure = new Date(now).toISOString();
    const locked = current.failures >= DEFAULTS.maxFailures;
    if (locked) current.lockedUntil = now + DEFAULTS.lockMs;
    state[key] = current;
    return { locked, failures: current.failures, lockedUntil: current.lockedUntil };
  });

  if (outcome.locked) {
    logSecurityEvent({
      type: `${scope}_account_locked`,
      success: false,
      ip: meta.ip || null,
      email: meta.email || null,
      path: meta.path || null,
      detail: { failures: outcome.failures, retryAfterSec: Math.ceil(DEFAULTS.lockMs / 1000) },
    });
  }

  return {
    locked: outcome.locked,
    failures: outcome.failures,
    remainingAttempts: Math.max(0, DEFAULTS.maxFailures - outcome.failures),
    retryAfterSec: outcome.locked ? Math.ceil((outcome.lockedUntil - now) / 1000) : 0,
  };
}

function clearFailures(scope, identifier) {
  const key = makeKey(scope, identifier);
  if (!readState()[key]) return;
  update((state) => {
    delete state[key];
  });
}

function listLockouts(limit = 50) {
  const state = readState();
  const now = Date.now();
  return Object.entries(state)
    .filter(([, entry]) => !isExpired(entry, now))
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
