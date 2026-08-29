/**
 * Part 7 — In-memory cache for public catalog reads
 */
const { CACHE_TTL_MS } = require("../../core/storefrontConstants");

const store = new Map();

function cacheKey(parts) {
  return parts.filter(Boolean).join("|");
}

function get(key) {
  const entry = store.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    store.delete(key);
    return null;
  }
  return entry.value;
}

function set(key, value, ttlMs = CACHE_TTL_MS) {
  store.set(key, { value, expiresAt: Date.now() + ttlMs });
}

function invalidate(prefix) {
  for (const key of store.keys()) {
    if (!prefix || key.startsWith(prefix)) store.delete(key);
  }
}

function stats() {
  return { entries: store.size, ttlMs: CACHE_TTL_MS };
}

module.exports = { get, set, invalidate, stats, cacheKey };
