const crypto = require("crypto");
const { createEngine, notImplemented } = require("../engineContract");
const { encodeRecord, decodeRecord, SECTIONS } = require("../../pusat/sinanMemory");

function createMemoryEngine() {
  const store = new Map();
  return createEngine({
    id: "memory",
    capabilities: ["put", "get", "isolation", "version"],
    executeImpl(input) {
      const op = input.op || "get";
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
      return notImplemented(op);
    },
  });
}

module.exports = { createMemoryEngine };
