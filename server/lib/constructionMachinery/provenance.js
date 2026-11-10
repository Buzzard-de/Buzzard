const { QUALITY_STATUS, VERIFICATION_STATUS } = require("./constants");
const { nowIso } = require("./store");

function createProvenance(input = {}) {
  return {
    providerId: String(input.providerId || input.source || "").trim() || "unknown",
    sourceRecordId: String(input.sourceRecordId || input.sourceId || "").trim() || null,
    originalRef: input.originalRef || input.originalValue || null,
    importedAt: input.importedAt || nowIso(),
    updatedAt: input.updatedAt || nowIso(),
    schemaVersion: input.schemaVersion || "1.0",
    validation: input.validation || QUALITY_STATUS.OK,
    verificationStatus: input.verificationStatus || VERIFICATION_STATUS.UNVERIFIED,
    freshnessAt: input.freshnessAt || input.updatedAt || nowIso(),
    license: input.license || null,
    accessRestrictions: input.accessRestrictions || null,
    mock: Boolean(input.mock),
  };
}

function recordConflict(store, payload) {
  const id = `${payload.entityType}:${payload.entityId}:${payload.field}`;
  const existing = store.conflicts.get(id) || { id, history: [] };
  existing.field = payload.field;
  existing.entityType = payload.entityType;
  existing.entityId = payload.entityId;
  existing.values = payload.values;
  existing.updatedAt = nowIso();
  existing.history.push({ at: nowIso(), values: payload.values, providers: payload.providers });
  store.conflicts.set(id, existing);
  return existing;
}

function isFresh(timestamp, maxAgeMs) {
  if (!timestamp) return false;
  const then = Date.parse(timestamp);
  if (Number.isNaN(then)) return false;
  return Date.now() - then <= maxAgeMs;
}

module.exports = {
  createProvenance,
  recordConflict,
  isFresh,
};
