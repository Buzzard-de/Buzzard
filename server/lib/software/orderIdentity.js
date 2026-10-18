/**
 * Canonical internal order identifier. Does not rewrite existing store IDs.
 * OMS / commerce / marketplace / supplier refs stay aliases.
 */

const crypto = require("crypto");
const { ORDER_ALIAS_KIND } = require("./constants");

function newCanonicalId() {
  return `bzord_${crypto.randomBytes(12).toString("hex")}`;
}

function newAliasId() {
  return `bzalias_${crypto.randomBytes(8).toString("hex")}`;
}

function inferKind(value) {
  const ref = String(value || "").trim();
  if (!ref) return null;
  if (ref.startsWith("bzord_")) return ORDER_ALIAS_KIND.CANONICAL;
  if (ref.startsWith("ord_")) return ORDER_ALIAS_KIND.COMMERCE_ID;
  if (/^BZ-\d{4}-[A-F0-9]+$/i.test(ref)) return ORDER_ALIAS_KIND.OMS_NUMBER;
  if (/^\d+$/.test(ref)) return ORDER_ALIAS_KIND.OMS_ID;
  return ORDER_ALIAS_KIND.LEGACY_RAW;
}

function refFromValue(value, kind = null) {
  const externalRef = String(value || "").trim();
  if (!externalRef) return null;
  return { kind: kind || inferKind(externalRef), value: externalRef };
}

function getIdentity(db, canonicalId) {
  return db.prepare("SELECT * FROM software_order_identities WHERE canonical_id = ?").get(canonicalId) || null;
}

function aliasesFor(db, canonicalId) {
  return db.prepare("SELECT * FROM software_order_aliases WHERE canonical_id = ?").all(canonicalId);
}

function findByRef(db, value) {
  const ref = String(value || "").trim();
  if (!ref) return null;
  if (ref.startsWith("bzord_")) {
    const identity = getIdentity(db, ref);
    if (identity) return { canonicalId: identity.canonical_id, via: ORDER_ALIAS_KIND.CANONICAL };
  }
  const alias = db.prepare("SELECT * FROM software_order_aliases WHERE external_ref = ?").get(ref);
  if (alias) return { canonicalId: alias.canonical_id, via: alias.kind };
  return null;
}

function resolve(db, value) {
  const ref = String(value || "").trim();
  if (!ref) return { ok: false, reason: "ORDER_REF_REQUIRED" };
  const found = findByRef(db, ref);
  if (!found) {
    return { ok: false, unresolved: true, reason: "UNRESOLVED_ORDER_REF", ref };
  }
  return {
    ok: true,
    canonicalId: found.canonicalId,
    via: found.via,
    aliases: aliasesFor(db, found.canonicalId).map((row) => ({ kind: row.kind, value: row.external_ref })),
  };
}

function lookupKeys(db, value) {
  const ref = String(value || "").trim();
  const keys = new Set(ref ? [ref] : []);
  const resolved = resolve(db, ref);
  if (resolved.ok) {
    keys.add(resolved.canonicalId);
    for (const alias of resolved.aliases) keys.add(alias.value);
  }
  return [...keys];
}

function bindAlias(db, canonicalId, kind, value) {
  const ref = String(value || "").trim();
  if (!ref || !canonicalId || !kind) {
    return { ok: false, reason: "ALIAS_INCOMPLETE" };
  }
  const existing = db.prepare("SELECT * FROM software_order_aliases WHERE external_ref = ?").get(ref);
  if (existing) {
    if (existing.canonical_id !== canonicalId) {
      return {
        ok: false,
        reason: "ALIAS_CONFLICT",
        ref,
        existingCanonicalId: existing.canonical_id,
        requestedCanonicalId: canonicalId,
      };
    }
    return { ok: true, duplicate: true, canonicalId };
  }
  if (ref.startsWith("bzord_") && ref !== canonicalId && getIdentity(db, ref)) {
    return { ok: false, reason: "ALIAS_CONFLICT", ref, existingCanonicalId: ref };
  }
  db.prepare(
    `INSERT INTO software_order_aliases(id, canonical_id, kind, external_ref) VALUES(?,?,?,?)`
  ).run(newAliasId(), canonicalId, kind, ref);
  return { ok: true, canonicalId, kind, value: ref };
}

function collectCanonicals(db, refs) {
  const ids = new Set();
  for (const item of refs) {
    if (!item || !item.value) continue;
    const found = findByRef(db, item.value);
    if (found) ids.add(found.canonicalId);
  }
  return [...ids];
}

function ensureBound(db, input = {}) {
  const refs = (input.refs || [])
    .map((row) => (typeof row === "string" ? refFromValue(row) : refFromValue(row.value, row.kind)))
    .filter(Boolean);
  if (!refs.length) return { ok: false, reason: "ORDER_REF_REQUIRED" };

  try {
    return db.transaction(() => {
      const existing = collectCanonicals(db, refs);
      if (existing.length > 1) {
        return { ok: false, reason: "AMBIGUOUS_ORDER_IDENTITY", canonicalIds: existing };
      }
      let canonicalId = existing[0] || input.canonicalId || newCanonicalId();
      if (!getIdentity(db, canonicalId)) {
        db.prepare("INSERT INTO software_order_identities(canonical_id, details_json) VALUES(?,?)").run(
          canonicalId,
          JSON.stringify({ createdBy: input.createdBy || "orderIdentity", rewrittenStores: false })
        );
      }
      const bound = [];
      for (const ref of refs) {
        const result = bindAlias(db, canonicalId, ref.kind, ref.value);
        if (!result.ok) return result;
        bound.push(result);
      }
      if (canonicalId.startsWith("bzord_")) {
        bindAlias(db, canonicalId, ORDER_ALIAS_KIND.CANONICAL, canonicalId);
      }
      return { ok: true, canonicalId, bound, rewrittenStores: false };
    })();
  } catch (error) {
    return { ok: false, reason: "IDENTITY_BIND_FAILED", error: require("../security").publicTaskError(error, "IDENTITY_BIND_FAILED") };
  }
}

function adoptLegacy(db, value) {
  const ref = refFromValue(value);
  if (!ref) return { ok: false, reason: "ORDER_REF_REQUIRED" };
  const existing = resolve(db, ref.value);
  if (existing.ok) return existing;
  return ensureBound(db, { refs: [ref], createdBy: "legacy_adopt" });
}

function assertSameOrder(db, left, right) {
  const a = resolve(db, left);
  const b = resolve(db, right);
  if (!a.ok || !b.ok) {
    return { ok: false, reason: "UNRESOLVED_ORDER_REF", left: a, right: b };
  }
  if (a.canonicalId !== b.canonicalId) {
    return {
      ok: false,
      reason: "ORDER_IDENTITY_MISMATCH",
      left: a.canonicalId,
      right: b.canonicalId,
    };
  }
  return { ok: true, canonicalId: a.canonicalId };
}

function describeContract() {
  return {
    canonicalPrefix: "bzord_",
    storesUnchanged: ["oms_orders.id", "oms_orders.order_number", "commerce_orders.id", "software_payments.order_id", "software_reservations.order_id"],
    aliasKinds: Object.values(ORDER_ALIAS_KIND),
    destructiveMigration: false,
    productSotActive: false,
    canonicalOrderIdColumn: false,
    columnDecision:
      "Rejected. Alias lookup already joins reservations, payments, cancels and returns. A new column would dual-write without changing store IDs.",
    unresolvedRisks: [
      "Historical reservation.order_id values stay as written; consume/release joins through aliases.",
      "Numeric OMS ids can collide with unrelated numeric strings if adopted blindly — bind only with an explicit kind.",
      "Marketplace and supplier refs are optional and stay REVIEW_REQUIRED until a verified feed exists.",
    ],
  };
}

module.exports = {
  inferKind,
  refFromValue,
  resolve,
  lookupKeys,
  bindAlias,
  ensureBound,
  adoptLegacy,
  assertSameOrder,
  aliasesFor,
  describeContract,
  ORDER_ALIAS_KIND,
};
