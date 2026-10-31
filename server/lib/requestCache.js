function createTtlCache({ ttlMs = 60_000, maxEntries = 400 } = {}) {
  const map = new Map();

  function get(key) {
    const row = map.get(key);
    if (!row) return undefined;
    if (row.expiresAt <= Date.now()) {
      map.delete(key);
      return undefined;
    }
    return row.value;
  }

  function set(key, value) {
    if (map.size >= maxEntries && !map.has(key)) {
      const oldest = map.keys().next().value;
      if (oldest !== undefined) map.delete(oldest);
    }
    map.set(key, { value, expiresAt: Date.now() + ttlMs });
  }

  return {
    get,
    set,
    clear() {
      map.clear();
    },
    size() {
      return map.size;
    },
  };
}

function cacheKey(parts) {
  return parts.map((part) => String(part == null ? "" : part).trim().toLowerCase()).join("|");
}

module.exports = { createTtlCache, cacheKey };
