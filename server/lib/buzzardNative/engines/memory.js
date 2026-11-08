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
        store.set(k, { ...enc, version, owner });
        return { op, stored: true, version, encryption: enc.encryption, offsite: false };
      }
      if (op === "get") {
        const row = store.get(k);
        if (!row) return { op, found: false };
        return { op, found: true, version: row.version, encryption: row.encryption, decoded: decodeRecord(row) };
      }
      if (op === "backup") return { op, local: true, offsite: false, completeClaim: false };
      return notImplemented(op);
    },
  });
}

module.exports = { createMemoryEngine };
