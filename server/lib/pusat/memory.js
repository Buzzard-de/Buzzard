/**
 * Per-AI personal memory + controlled shared memory.
 */
const { canShare, CLASSIFICATION } = require("./council");

function createMemoryStore() {
  const personal = new Map();
  const shared = [];
  const audit = [];

  function personalKey(ownerId) {
    if (!personal.has(ownerId)) personal.set(ownerId, []);
    return personal.get(ownerId);
  }

  function putPersonal(ownerId, record) {
    const entry = {
      ownerId,
      classification: CLASSIFICATION.PERSONAL,
      key: record.key,
      value: record.value,
      at: new Date().toISOString(),
    };
    personalKey(ownerId).push(entry);
    audit.push({ type: "personal.put", ownerId, key: record.key, at: entry.at });
    return entry;
  }

  function getPersonal(ownerId, requesterId) {
    if (ownerId !== requesterId) {
      audit.push({ type: "personal.denied", ownerId, requesterId, at: new Date().toISOString() });
      return { ok: false, code: "PERSONAL_MEMORY_DENIED" };
    }
    return { ok: true, records: [...personalKey(ownerId)] };
  }

  function putShared({ fromId, toIds = [], key, value, classification = CLASSIFICATION.SHARED }) {
    const allowed = toIds.filter((toId) => canShare({ fromId, toId, classification }));
    if (!allowed.length) {
      return { ok: false, code: "SHARE_DENIED" };
    }
    const entry = {
      fromId,
      toIds: allowed,
      key,
      value,
      classification,
      at: new Date().toISOString(),
    };
    shared.push(entry);
    audit.push({ type: "shared.put", fromId, toIds: allowed, key, at: entry.at });
    return { ok: true, entry };
  }

  function readShared(requesterId) {
    return shared.filter(
      (entry) =>
        entry.fromId === requesterId ||
        entry.toIds.includes(requesterId) ||
        (entry.classification === CLASSIFICATION.PUBLIC && requesterId === "pusat")
    );
  }

  return {
    putPersonal,
    getPersonal,
    putShared,
    readShared,
    auditLog: () => [...audit],
  };
}

module.exports = { createMemoryStore };
