const crypto = require("crypto");
const { encodeRecord, decodeRecord } = require("../../pusat/sinanMemory");

const CHARACTERS = Object.freeze(["sinan_bey", "pusat", "esat_bey", "dogu_bey"]);
const SECTIONS = Object.freeze({
  identity: "identity",
  tasks: "tasks",
  decisions: "decisions",
  learning: "learning",
  errors: "errors",
  project: "project",
  approvals: "approvals",
  shared: "shared",
});

function createCharacterStore() {
  const store = new Map();
  const audit = [];
  let snapshot = null;

  function key(owner, section, k) {
    return `${owner}:${section}:${k}`;
  }

  function allowed(actor, owner, section) {
    if (!CHARACTERS.includes(actor)) return false;
    if (actor === owner) return true;
    if (section === SECTIONS.shared) return true;
    return false;
  }

  function put({ actorId, ownerId, section = "identity", key: k, value }) {
    if (!allowed(actorId, ownerId, section)) {
      audit.push({ op: "put", denied: true, actorId, ownerId, section });
      return { ok: false, code: "MEMORY_ISOLATION_DENIED" };
    }
    const enc = encodeRecord({ section, key: k, value, source: actorId });
    const integrity = crypto.createHash("sha256").update(String(enc.ciphertext || "")).digest("hex");
    const id = key(ownerId, section, k);
    const prev = store.get(id);
    const version = (prev?.version || 0) + 1;
    store.set(id, { ...enc, version, ownerId, section, integrity });
    audit.push({ op: "put", actorId, ownerId, section, key: k, version });
    return { ok: true, version, integrity, offsite: false };
  }

  function get({ actorId, ownerId, section = "identity", key: k }) {
    if (!allowed(actorId, ownerId, section)) {
      audit.push({ op: "get", denied: true, actorId, ownerId, section });
      return { ok: false, code: "MEMORY_ISOLATION_DENIED" };
    }
    const row = store.get(key(ownerId, section, k));
    if (!row) return { ok: true, found: false };
    const integrity = crypto.createHash("sha256").update(String(row.ciphertext || "")).digest("hex");
    const intact = integrity === row.integrity;
    return {
      ok: true,
      found: true,
      intact,
      version: row.version,
      decoded: intact ? decodeRecord(row) : null,
      offsite: false,
    };
  }

  function backupLocal() {
    snapshot = [...store.entries()].map(([k, v]) => [k, { ...v }]);
    return { ok: true, local: true, offsite: false, keys: snapshot.length };
  }

  function restoreLocal() {
    if (!snapshot) return { ok: false, code: "NO_LOCAL_SNAPSHOT", offsite: false };
    store.clear();
    for (const [k, v] of snapshot) store.set(k, v);
    return { ok: true, restored: snapshot.length, offsite: false };
  }

  return {
    put,
    get,
    backupLocal,
    restoreLocal,
    audit: () => audit.slice(),
    SECTIONS,
    CHARACTERS,
  };
}

module.exports = { createCharacterStore, SECTIONS, CHARACTERS };
