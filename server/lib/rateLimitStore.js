/**
 * Rate limit store abstraction — memory default, file persistence optional.
 * Future: Redis/Upstash via BUZZARD_RATE_LIMIT_STORE=redis
 */
const fs = require("fs");
const path = require("path");

const dataDir = path.join(__dirname, "..", "data");
const persistFile = path.join(dataDir, "rate-limit-buckets.json");
const PERSIST_INTERVAL_MS = 30_000;

function createMemoryStore() {
  return new Map();
}

function loadPersistedStore() {
  const store = createMemoryStore();
  if (process.env.BUZZARD_RATE_LIMIT_PERSIST !== "1") return store;
  try {
    if (!fs.existsSync(persistFile)) return store;
    const raw = JSON.parse(fs.readFileSync(persistFile, "utf8"));
    const now = Date.now();
    for (const [key, records] of Object.entries(raw)) {
      store.set(key, records.filter((ts) => now - ts < 3600000));
    }
  } catch {
    /* ignore corrupt file */
  }
  return store;
}

let sharedStore = loadPersistedStore();

function persistStore(store) {
  if (process.env.BUZZARD_RATE_LIMIT_PERSIST !== "1") return;
  try {
    if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
    const obj = Object.fromEntries([...store.entries()].slice(0, 5000));
    fs.writeFileSync(persistFile, JSON.stringify(obj), "utf8");
  } catch {
    /* non-fatal */
  }
}

if (process.env.BUZZARD_RATE_LIMIT_PERSIST === "1") {
  setInterval(() => persistStore(sharedStore), PERSIST_INTERVAL_MS).unref();
}

function createRateLimiter({ windowMs, max, keyPrefix = "" }) {
  return function isRateLimited(req, options = {}) {
    const { getClientIp } = require("./security");
    const key = `${keyPrefix}${options.key || getClientIp(req)}`;
    const now = Date.now();
    const records = (sharedStore.get(key) || []).filter((ts) => now - ts < windowMs);
    if (records.length >= max) {
      sharedStore.set(key, records);
      return true;
    }
    records.push(now);
    sharedStore.set(key, records);
    return false;
  };
}

function getStoreInfo() {
  return {
    backend: process.env.BUZZARD_RATE_LIMIT_STORE || "memory",
    persist: process.env.BUZZARD_RATE_LIMIT_PERSIST === "1",
    bucketCount: sharedStore.size,
    note: "In-memory buckets reset on restart unless BUZZARD_RATE_LIMIT_PERSIST=1. Use Redis/Upstash for multi-instance production.",
  };
}

module.exports = {
  createRateLimiter,
  getStoreInfo,
  persistStore,
};
