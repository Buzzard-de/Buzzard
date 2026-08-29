/**
 * Rate limit store — memory | file | redis (stub) backends.
 * BUZZARD_RATE_LIMIT_STORE=memory|file|redis
 */
const fs = require("fs");
const path = require("path");

const dataDir = path.join(__dirname, "..", "data");
const persistFile = path.join(dataDir, "rate-limit-buckets.json");
const PERSIST_INTERVAL_MS = 15_000;

function resolveBackend() {
  const store = (process.env.BUZZARD_RATE_LIMIT_STORE || "memory").toLowerCase();
  if (store === "file") return "file";
  if (store === "redis") return "redis";
  return "memory";
}

function isRateLimitDisabled() {
  return process.env.BUZZARD_RATE_LIMIT_DISABLED === "1" || process.env.BUZZARD_TEST_MODE === "1";
}

function createMemoryBackend() {
  const buckets = new Map();
  return {
    name: "memory",
    get(key) {
      return buckets.get(key) || [];
    },
    set(key, records) {
      buckets.set(key, records);
    },
    size() {
      return buckets.size;
    },
    persist() {},
    load() {},
  };
}

function createFileBackend() {
  const memory = createMemoryBackend();
  memory.name = "file";
  memory.load = function load() {
    try {
      if (!fs.existsSync(persistFile)) return;
      const raw = JSON.parse(fs.readFileSync(persistFile, "utf8"));
      const now = Date.now();
      for (const [key, records] of Object.entries(raw)) {
        memory.set(key, records.filter((ts) => now - ts < 3600000));
      }
    } catch {
      /* ignore */
    }
  };
  memory.persist = function persist() {
    try {
      if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
      const obj = {};
      for (const [key] of [...Array(memory.size()).keys()]) {
        /* rebuilt via get/set below */
      }
      const entries = {};
      const store = memory;
      const internal = store.get("__dump__");
      void internal;
      const dump = JSON.parse(fs.existsSync(persistFile) ? fs.readFileSync(persistFile, "utf8") : "{}");
      const fresh = {};
      const now = Date.now();
      for (const [key, records] of Object.entries(dump)) {
        const filtered = (records || []).filter((ts) => now - ts < 3600000);
        if (filtered.length) fresh[key] = filtered;
      }
      for (const key of Object.keys(fresh)) memory.set(key, fresh[key]);
      const out = {};
      for (const key of [...new Set([...Object.keys(fresh)])]) {
        out[key] = memory.get(key);
      }
      fs.writeFileSync(persistFile, JSON.stringify(out), "utf8");
    } catch {
      /* non-fatal */
    }
  };
  return memory;
}

// Simpler file backend implementation
function createFileBackendSimple() {
  const buckets = new Map();
  const backend = {
    name: "file",
    get(key) {
      return buckets.get(key) || [];
    },
    set(key, records) {
      buckets.set(key, records);
    },
    size() {
      return buckets.size;
    },
    load() {
      try {
        if (!fs.existsSync(persistFile)) return;
        const raw = JSON.parse(fs.readFileSync(persistFile, "utf8"));
        const now = Date.now();
        for (const [key, records] of Object.entries(raw)) {
          buckets.set(key, records.filter((ts) => now - ts < 3600000));
        }
      } catch {
        /* ignore */
      }
    },
    persist() {
      try {
        if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
        const obj = Object.fromEntries([...buckets.entries()].slice(0, 5000));
        fs.writeFileSync(persistFile, JSON.stringify(obj), "utf8");
      } catch {
        /* non-fatal */
      }
    },
  };
  backend.load();
  return backend;
}

function createRedisBackend() {
  const redisClient = require("./redisClient");
  const prefix = process.env.BUZZARD_REDIS_PREFIX || "buzzard:rl:";
  let connectionFailed = false;
  let lastError = null;

  const backend = {
    name: "redis",
    connectionFailed: false,
    lastError: null,
    async getAsync(key) {
      try {
        const raw = await redisClient.get(`${prefix}${key}`);
        if (!raw) return [];
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
      } catch (err) {
        connectionFailed = true;
        lastError = err.message;
        backend.connectionFailed = true;
        backend.lastError = err.message;
        return null;
      }
    },
    get(key) {
      if (backend._cache.has(key)) return backend._cache.get(key);
      return [];
    },
    set(key, records) {
      backend._cache.set(key, records);
      redisClient.set(`${prefix}${key}`, JSON.stringify(records), 3600).catch((err) => {
        connectionFailed = true;
        lastError = err.message;
        backend.connectionFailed = true;
        backend.lastError = err.message;
      });
    },
    size() {
      return backend._cache.size;
    },
    load() {},
    persist() {},
    _cache: new Map(),
    getHealth() {
      return { connectionFailed, lastError };
    },
  };

  return backend;
}

async function hydrateRedisCache(backend, key) {
  const records = await backend.getAsync(key);
  if (records) backend._cache.set(key, records);
  return records || [];
}

function createBackend() {
  const kind = resolveBackend();
  if (kind === "file") return createFileBackendSimple();
  if (kind === "redis") {
    const redisClient = require("./redisClient");
    if (!redisClient.isConfigured()) {
      console.warn("[rate-limit] Redis selected but UPSTASH_REDIS_REST_URL/TOKEN not set — falling back to file");
      const fb = createFileBackendSimple();
      fb.fallbackFrom = "redis";
      return fb;
    }
    return createRedisBackend();
  }
  return createMemoryBackend();
}

let backend = createBackend();

if (backend.name === "file") {
  setInterval(() => backend.persist(), PERSIST_INTERVAL_MS).unref();
}

function createRateLimiter({ windowMs, max, keyPrefix = "" }) {
  if (isRateLimitDisabled()) {
    return function isRateLimited() {
      return false;
    };
  }

  return function isRateLimited(req, options = {}) {
    const { getClientIp } = require("./security");
    const key = `${keyPrefix}${options.key || getClientIp(req)}`;
    const now = Date.now();
    const records = backend.get(key).filter((ts) => now - ts < windowMs);
    if (records.length >= max) {
      backend.set(key, records);
      return true;
    }
    records.push(now);
    backend.set(key, records);
    if (backend.name === "file") backend.persist();
    return false;
  };
}

function getStoreInfo() {
  const info = {
    backend: backend.name,
    configured: resolveBackend(),
    disabled: isRateLimitDisabled(),
    bucketCount: backend.size(),
    persistFile: backend.name === "file" ? persistFile : null,
    fallbackFrom: backend.fallbackFrom || null,
    note:
      backend.name === "redis"
        ? "Upstash Redis REST backend"
        : backend.name === "file"
          ? "Buckets persist across restarts via rate-limit-buckets.json"
          : "In-memory only — resets on restart. Set BUZZARD_RATE_LIMIT_STORE=file",
  };
  if (backend.name === "redis" && backend.getHealth) {
    info.redisHealth = backend.getHealth();
  }
  if (backend.fallbackFrom === "redis") {
    info.note = "Redis configured but unavailable — using file fallback";
  }
  return info;
}

function resetBackendForTests() {
  backend = createBackend();
}

module.exports = {
  createRateLimiter,
  getStoreInfo,
  resetBackendForTests,
  resolveBackend,
  isRateLimitDisabled,
};
