const crypto = require("crypto");
const { resolveIdentity } = require("./councilAliasMap");
const { getAgentExact } = require("./identityRegistry");
const { check } = require("./permissionEngine");

const TYPES = Object.freeze([
  "identity",
  "personal",
  "task",
  "decision",
  "project",
  "conversation",
  "shared_knowledge",
  "tax_knowledge",
  "tax_decision",
  "tax_country",
  "tax_task",
  "tax_source",
  "customs_knowledge",
  "hs_cn_taric",
  "sanctions",
  "country_restrictions",
  "customs_decision",
  "customs_task",
  "customs_source",
]);

function createMultiMemory() {
  const store = new Map();
  const audit = [];
  function nsKey(owner, type, key) {
    return `${owner}/${type}/${key}`;
  }
  const TAX_TYPES = ["tax_knowledge", "tax_decision", "tax_country", "tax_task", "tax_source"];
  const CUSTOMS_TYPES = [
    "customs_knowledge",
    "hs_cn_taric",
    "sanctions",
    "country_restrictions",
    "customs_decision",
    "customs_task",
    "customs_source",
  ];
  function identityOrReject(id) {
    const resolved = resolveIdentity(id);
    if (!resolved.ok) return { ok: false, code: resolved.code || "UNKNOWN_AGENT" };
    return resolved;
  }
  function put({ actorId, ownerId, type = "personal", key, value }) {
    const actor = identityOrReject(actorId);
    const owner = identityOrReject(ownerId);
    if (!actor.ok) return { ok: false, code: actor.code };
    if (!owner.ok) return { ok: false, code: owner.code };
    if (!TYPES.includes(type)) return { ok: false, code: "BAD_MEMORY_TYPE" };
    if (TAX_TYPES.includes(type) && actor.nativeId !== "nedim_bey") return { ok: false, code: "TAX_MEMORY_SPECIALIST_ONLY" };
    if (CUSTOMS_TYPES.includes(type) && actor.nativeId !== "tuncay_bey") return { ok: false, code: "CUSTOMS_MEMORY_SPECIALIST_ONLY" };
    const shared = type === "shared_knowledge";
    if (!shared && actor.memoryOwnerId !== owner.memoryOwnerId) {
      audit.push({ op: "put", denied: true, actorId, ownerId, type, identitiesMerged: false });
      return { ok: false, code: "MEMORY_ISOLATION_DENIED" };
    }
    if (shared && !check(actorId, "ACCESS_SHARED_MEMORY").ok && actorId !== ownerId) {
      return { ok: false, code: "PERMISSION_DENIED" };
    }
    const payload = JSON.stringify({ ownerId, type, key, value, at: Date.now() });
    const integrity = crypto.createHash("sha256").update(payload).digest("hex");
    const k = nsKey(ownerId, type, key);
    const prev = store.get(k);
    const versions = prev?.versions ? prev.versions.slice() : [];
    const version = versions.length + 1;
    const rec = { payload, integrity, version, ownerId, type };
    versions.push(rec);
    store.set(k, { ...rec, versions });
    audit.push({ op: "put", actorId, ownerId, type, key, version });
    return { ok: true, version, integrity, namespace: namespaceOf(ownerId) };
  }
  function get({ actorId, ownerId, type = "personal", key }) {
    const actor = identityOrReject(actorId);
    const owner = identityOrReject(ownerId);
    if (!actor.ok) return { ok: false, code: actor.code };
    if (!owner.ok) return { ok: false, code: owner.code };
    if (!sharedAllow(actor.memoryOwnerId, owner.memoryOwnerId, type)) {
      audit.push({ op: "get", denied: true, actorId, ownerId, type, identitiesMerged: false });
      return { ok: false, code: "MEMORY_ISOLATION_DENIED" };
    }
    const row = store.get(nsKey(ownerId, type, key));
    const namespace = namespaceOf(ownerId);
    if (!row) return { ok: true, found: false, namespace };
    const intact = crypto.createHash("sha256").update(row.payload).digest("hex") === row.integrity;
    return {
      ok: true,
      found: true,
      intact,
      version: row.version,
      value: intact ? JSON.parse(row.payload).value : null,
      namespace,
    };
  }
  function restore({ actorId, ownerId, type = "personal", key, version }) {
    if (actorId !== ownerId) return { ok: false, code: "MEMORY_ISOLATION_DENIED" };
    const k = nsKey(ownerId, type, key);
    const row = store.get(k);
    if (!row) return { ok: false, code: "NOT_FOUND" };
    const hit = (row.versions || []).find((v) => v.version === version);
    if (!hit) return { ok: false, code: "VERSION_NOT_FOUND" };
    store.set(k, { ...hit, versions: row.versions });
    audit.push({ op: "restore", actorId, ownerId, type, key, version });
    return { ok: true, version, value: JSON.parse(hit.payload).value };
  }
  function tamperDetect({ ownerId, type = "personal", key }) {
    const row = store.get(nsKey(ownerId, type, key));
    if (!row) return { ok: false, code: "NOT_FOUND" };
    const broken = { ...row, payload: row.payload + "x" };
    const intact = crypto.createHash("sha256").update(broken.payload).digest("hex") === broken.integrity;
    return { ok: true, intact, detected: !intact };
  }
  function sharedAllow(actorId, ownerId, type) {
    if (type === "shared_knowledge") return check(actorId, "ACCESS_SHARED_MEMORY").ok || actorId === ownerId;
    return actorId === ownerId;
  }
  function namespaceOf(ownerId) {
    const exact = getAgentExact(ownerId);
    if (exact?.memory_namespace) return exact.memory_namespace;
    const legacy = {
      sinan_bey: "memory/sinan/",
      esat_bey: "memory/esat/",
      dogu_bey: "memory/dogu/",
      nedim_bey: "memory/nedim/",
      tuncay_bey: "memory/tuncay/",
    };
    return legacy[ownerId] || `memory/${ownerId}/`;
  }
  return { put, get, restore, tamperDetect, audit: () => audit.slice(), TYPES };
}

module.exports = { createMultiMemory, TYPES };
