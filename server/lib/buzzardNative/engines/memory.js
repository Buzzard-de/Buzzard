const crypto = require("crypto");
const { createEngine, notImplemented } = require("../engineContract");
const { encodeRecord, decodeRecord, SECTIONS } = require("../../pusat/sinanMemory");
const { createCharacterStore } = require("../memory/characterStore");
const { lab32110 } = require("../memory/localCopies");

function createMemoryEngine() {
  const store = new Map();
  const chars = createCharacterStore();
  let snap = null;
  return createEngine({
    id: "memory",
    capabilities: ["put", "get", "isolation", "version"],
    executeImpl(input) {
      const op = input.op || "get";
      if (op === "char_put") return { op, ...chars.put(input) };
      if (op === "char_get") return { op, ...chars.get(input) };
      const owner = input.ownerId;
      const actor = input.actorId;
      if (!owner || !actor) return { ok: false, code: "IDENTITY_REQUIRED" };
      if (actor !== owner && input.classification !== "shared") {
        return { ok: false, code: "MEMORY_ISOLATION_DENIED" };
      }
      const k = `${owner}:${input.section || "C"}:${input.key}`;
      if (op === "put") {
        const enc = encodeRecord({ section: input.section || SECTIONS.C, key: input.key, value: input.value, source: actor });
        const prev = store.get(k);
        const version = (prev?.version || 0) + 1;
        const integrity = crypto.createHash("sha256").update(String(enc.ciphertext || "")).digest("hex");
        store.set(k, { ...enc, version, owner, integrity });
        return { op, stored: true, version, encryption: enc.encryption, integrity, offsite: false };
      }
      if (op === "get") {
        const row = store.get(k);
        if (!row) return { op, found: false };
        const integrity = crypto.createHash("sha256").update(String(row.ciphertext || "")).digest("hex");
        const intact = integrity === row.integrity;
        return { op, found: true, version: row.version, encryption: row.encryption, intact, decoded: intact ? decodeRecord(row) : null, offsite: false };
      }
      if (op === "integrity") {
        const row = store.get(k);
        if (!row) return { op, found: false };
        const integrity = crypto.createHash("sha256").update(String(row.ciphertext || "")).digest("hex");
        return { op, intact: integrity === row.integrity, offsite: false };
      }
      if (op === "backup") return { op, local: true, offsite: false, completeClaim: false };
      if (op === "lab_copies") return { op, ...lab32110(Buffer.from(String(input.value || "lab"))) };
      if (op === "snapshot") {
        snap = [...store.entries()].map(([kk, vv]) => [kk, { ...vv }]);
        const b = chars.backupLocal();
        return { op, local: true, keys: snap.length, characterKeys: b.keys, offsite: false };
      }
      if (op === "restore") {
        if (!snap) return { ok: false, code: "NO_LOCAL_SNAPSHOT", offsite: false };
        store.clear();
        for (const [kk, vv] of snap) store.set(kk, vv);
        chars.restoreLocal();
        return { op, restored: snap.length, offsite: false };
      }
      return notImplemented(op);
    },
  });
}

module.exports = { createMemoryEngine };
