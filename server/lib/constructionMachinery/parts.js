const { QUALITY_STATUS, RELATION_KIND } = require("./constants");
const { normalizePartNumber, stableId } = require("./identifiers");
const { createProvenance, recordConflict } = require("./provenance");
const { lookupSource, rememberSource, appendAudit, nowIso } = require("./store");

function collectNumbers(input) {
  const bags = {
    oem: input.oemPartNumber || input.oemNumber || null,
    manufacturer: input.manufacturerPartNumber || input.mpn || null,
    supplier: input.supplierPartNumber || input.supplierSku || null,
    aftermarket: input.aftermarketPartNumber || null,
  };
  const previous = Array.isArray(input.previousPartNumbers) ? input.previousPartNumbers : [];
  return { bags, previous };
}

function validatePartInput(input = {}) {
  const issues = [];
  const manufacturer = String(input.manufacturer || input.brand || "").trim();
  const { bags } = collectNumbers(input);
  const primary = bags.oem || bags.manufacturer || bags.supplier || bags.aftermarket;
  if (!manufacturer) issues.push("missing_manufacturer");
  if (!primary) issues.push("missing_part_number");
  const oem = bags.oem ? normalizePartNumber(bags.oem, manufacturer) : null;
  if (oem && !oem.valid) issues.push(`invalid_oem:${oem.reason}`);
  return { ok: issues.length === 0, issues, manufacturer, bags, primary };
}

function normalizePart(input) {
  const checked = validatePartInput(input);
  const providerId = input.providerId || input.source || "manual";
  const sourceRecordId = input.sourceRecordId || input.sourceId || null;
  const oem = checked.bags.oem ? normalizePartNumber(checked.bags.oem, checked.manufacturer) : null;
  const id =
    input.id ||
    (sourceRecordId
      ? stableId("cme-part", [providerId, sourceRecordId])
      : stableId("cme-part", [checked.manufacturer, oem?.normalized || checked.primary]));

  const descriptions = input.descriptions && typeof input.descriptions === "object" ? input.descriptions : {};
  if (input.description && !descriptions.de && !descriptions.en) {
    descriptions.en = String(input.description);
  }

  return {
    checked,
    part: {
      id,
      manufacturer: checked.manufacturer,
      oemPartNumber: oem?.original || null,
      oemNormalized: oem?.normalized || null,
      manufacturerPartNumber: checked.bags.manufacturer || null,
      supplierPartNumber: checked.bags.supplier || null,
      aftermarketPartNumber: checked.bags.aftermarket || null,
      previousPartNumbers: collectNumbers(input).previous.map((value) => String(value)),
      categoryId: input.categoryId || null,
      descriptions,
      attributes: input.attributes && typeof input.attributes === "object" ? input.attributes : {},
      dimensions: input.dimensions || null,
      materials: input.materials || null,
      electrical: input.electrical || null,
      hydraulics: input.hydraulics || null,
      revision: input.revision || null,
      documentRefs: Array.isArray(input.documentRefs) ? input.documentRefs : [],
      imageRefs: Array.isArray(input.imageRefs) ? input.imageRefs : [],
      quality: checked.ok ? QUALITY_STATUS.OK : QUALITY_STATUS.INVALID,
      provenance: createProvenance(input),
      createdAt: input.createdAt || nowIso(),
      updatedAt: nowIso(),
    },
  };
}

function upsertPart(store, input) {
  const { checked, part } = normalizePart(input);
  if (!checked.ok) return { ok: false, issues: checked.issues };

  const existingId = lookupSource(store, "part", part.provenance.providerId, part.provenance.sourceRecordId);
  const targetId = existingId || part.id;
  const previous = store.parts.get(targetId);

  if (previous?.oemNormalized && part.oemNormalized && previous.oemNormalized !== part.oemNormalized) {
    recordConflict(store, {
      entityType: "part",
      entityId: targetId,
      field: "oemNormalized",
      values: [previous.oemNormalized, part.oemNormalized],
      providers: [previous.provenance.providerId, part.provenance.providerId],
    });
    part.quality = QUALITY_STATUS.WARNING;
  }

  const next = previous ? { ...previous, ...part, id: targetId, createdAt: previous.createdAt } : part;
  next.id = targetId;
  store.parts.set(targetId, next);
  if (part.provenance.sourceRecordId) {
    rememberSource(store, "part", part.provenance.providerId, part.provenance.sourceRecordId, targetId);
  }
  appendAudit(store, { action: previous ? "part.update" : "part.create", entityId: targetId });
  return { ok: true, part: next, created: !previous };
}

function addPartRelation(store, input) {
  const fromPartId = String(input.fromPartId || "").trim();
  const toPartId = String(input.toPartId || "").trim();
  const kind = RELATION_KIND[input.kind] || input.kind;
  if (!fromPartId || !toPartId || !kind) {
    return { ok: false, issues: ["invalid_relation"] };
  }
  if (kind === RELATION_KIND.SUPERSESSION && input.universalMachineCompatibility === true) {
    return { ok: false, issues: ["supersession_not_universal"] };
  }
  const id = `${fromPartId}:${kind}:${toPartId}`;
  const relation = {
    id,
    fromPartId,
    toPartId,
    kind,
    notes: input.notes || null,
    provenance: createProvenance(input),
    createdAt: nowIso(),
  };
  store.partRelations.set(id, relation);
  return { ok: true, relation };
}

function listParts(store) {
  return [...store.parts.values()];
}

function getPart(store, id) {
  return store.parts.get(id) || null;
}

function findPartsByNumber(store, value, manufacturer) {
  const { normalizePartNumber: normalize } = require("./identifiers");
  const wanted = normalize(value, manufacturer);
  if (!wanted.valid) return [];
  return listParts(store).filter((part) => {
    const candidates = [
      part.oemPartNumber,
      part.oemNormalized,
      part.manufacturerPartNumber,
      part.supplierPartNumber,
      part.aftermarketPartNumber,
      ...part.previousPartNumbers,
    ];
    return candidates.some((candidate) => {
      if (!candidate) return false;
      const normalized = normalize(candidate, part.manufacturer);
      return normalized.valid && normalized.normalized === wanted.normalized;
    });
  });
}

module.exports = {
  validatePartInput,
  normalizePart,
  upsertPart,
  addPartRelation,
  listParts,
  getPart,
  findPartsByNumber,
};
