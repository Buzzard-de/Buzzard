const fs = require("fs");
const path = require("path");
const { createStore, rememberSource } = require("../../constructionMachinery/store");
const { ensureMachineryTables, tablesForDomain } = require("./schema");
const { createMachineryRepository } = require("./repository");

function isTestRuntime() {
  return (
    process.env.VITEST === "true" ||
    Boolean(process.env.VITEST) ||
    process.env.BUZZARD_TEST_MODE === "1" ||
    process.env.NODE_ENV === "test"
  );
}

function shouldPersistSingleton() {
  if (process.env.BUZZARD_MACHINERY_PERSIST === "0") return false;
  if (isTestRuntime() && process.env.BUZZARD_MACHINERY_PERSIST !== "1") return false;
  return true;
}

function resolvePersistEnabled(options = {}) {
  if (options.persist === true) return true;
  if (options.persist === false) return false;
  if (options.store && options.persist !== true) return false;
  return false;
}

function openMachineryDb(options = {}) {
  if (options.db) return { db: options.db, owned: false };
  const isolatedPath = options.dbPath || process.env.BUZZARD_MACHINERY_DB_PATH;
  if (isolatedPath) {
    const Database = require("better-sqlite3");
    fs.mkdirSync(path.dirname(path.resolve(isolatedPath)), { recursive: true });
    const db = new Database(isolatedPath);
    db.pragma("foreign_keys = ON");
    return { db, owned: true };
  }
  const { db } = require("../../db");
  return { db, owned: false };
}

function silentSet(map, id, value) {
  Map.prototype.set.call(map, id, value);
}

function hydrateStore(store, repository) {
  const loaded = repository.loadAll();
  const spec = tablesForDomain(repository.domain);
  for (const host of loaded.hosts) {
    silentSet(store.machines, host.id, host);
    const providerId = host.provenance?.providerId;
    const sourceRecordId = host.provenance?.sourceRecordId;
    if (providerId && sourceRecordId) rememberSource(store, spec.hostKind, providerId, sourceRecordId, host.id);
  }
  for (const part of loaded.parts) {
    silentSet(store.parts, part.id, part);
    const providerId = part.provenance?.providerId;
    const sourceRecordId = part.provenance?.sourceRecordId;
    if (providerId && sourceRecordId) rememberSource(store, "part", providerId, sourceRecordId, part.id);
  }
  for (const evidence of loaded.evidence) silentSet(store.evidence, evidence.id, evidence);
  for (const offer of loaded.offers) silentSet(store.offers, offer.id, offer);
  return loaded;
}

function wrapMap(map, persistWrite) {
  const originalSet = map.set.bind(map);
  const originalDelete = map.delete.bind(map);
  map.set = function set(key, value) {
    const had = map.has(key);
    const previous = had ? map.get(key) : undefined;
    originalSet(key, value);
    try {
      const result = persistWrite(value);
      if (result && result.ok === false) {
        if (had) originalSet(key, previous);
        else originalDelete(key);
      }
    } catch {
      if (had) originalSet(key, previous);
      else originalDelete(key);
    }
    return map;
  };
}

function attachPersistence(store, repository) {
  wrapMap(store.machines, (record) => repository.upsertHost(record));
  wrapMap(store.parts, (record) => repository.upsertPart(record));
  wrapMap(store.evidence, (record) => repository.upsertEvidence(record));
  wrapMap(store.offers, (record) => repository.upsertOffer(record));
}

function preparePersistentStore(domain, options = {}) {
  const store = options.store || createStore();
  const persist = resolvePersistEnabled(options);
  if (!persist) {
    return { store, persist: false, repository: null, db: null };
  }
  if (!tablesForDomain(domain)) {
    throw new Error(`unknown machinery persist domain: ${domain}`);
  }
  const opened = openMachineryDb(options);
  ensureMachineryTables(opened.db);
  const repository = createMachineryRepository({ domain, db: opened.db });
  hydrateStore(store, repository);
  attachPersistence(store, repository);
  return {
    store,
    persist: true,
    repository,
    db: opened.db,
    ownedConnection: opened.owned,
  };
}

module.exports = {
  isTestRuntime,
  shouldPersistSingleton,
  resolvePersistEnabled,
  openMachineryDb,
  hydrateStore,
  attachPersistence,
  preparePersistentStore,
};
