function nowIso() {
  return new Date().toISOString();
}

function createStore() {
  return {
    machines: new Map(),
    machineConfigs: new Map(),
    parts: new Map(),
    partRelations: new Map(),
    evidence: new Map(),
    conflicts: new Map(),
    documents: new Map(),
    offers: new Map(),
    warehouses: new Map(),
    suppliers: new Map(),
    jobs: new Map(),
    failedRecords: new Map(),
    audit: [],
    sourceIndex: new Map(),
    createdAt: nowIso(),
  };
}

function sourceKey(kind, providerId, sourceRecordId) {
  return `${kind}:${providerId}:${sourceRecordId}`;
}

function rememberSource(store, kind, providerId, sourceRecordId, entityId) {
  store.sourceIndex.set(sourceKey(kind, providerId, sourceRecordId), entityId);
}

function lookupSource(store, kind, providerId, sourceRecordId) {
  return store.sourceIndex.get(sourceKey(kind, providerId, sourceRecordId)) || null;
}

function appendAudit(store, event) {
  store.audit.push({
    at: nowIso(),
    ...event,
  });
  if (store.audit.length > 2000) store.audit.splice(0, store.audit.length - 2000);
}

module.exports = {
  createStore,
  rememberSource,
  lookupSource,
  appendAudit,
  nowIso,
};
