const { QUALITY_STATUS, RELATION_KIND } = require("./constants");
const kit = require("../machineryDomainKit");

function collect(input) {
  return {
    oem: input.oemPartNumber || input.oemNumber || null,
    manufacturer: input.manufacturerPartNumber || input.mpn || null,
    supplier: input.supplierPartNumber || input.supplierSku || null,
    aftermarket: input.aftermarketPartNumber || null,
    previous: Array.isArray(input.previousPartNumbers) ? input.previousPartNumbers : [],
    superseded: Array.isArray(input.supersededPartNumbers) ? input.supersededPartNumbers : [],
    replacements: Array.isArray(input.replacementPartNumbers) ? input.replacementPartNumbers : [],
    approvedAlts: Array.isArray(input.approvedAlternativePartNumbers) ? input.approvedAlternativePartNumbers : [],
  };
}

function validatePartInput(input = {}) {
  const issues = [];
  const manufacturer = String(input.manufacturer || input.brand || "").trim();
  const numbers = collect(input);
  const primary = numbers.oem || numbers.manufacturer || numbers.supplier || numbers.aftermarket;
  if (!manufacturer) issues.push("missing_manufacturer");
  if (!primary) issues.push("missing_part_number");
  if (input.categoryId && String(input.categoryId).startsWith("cme-cat-")) issues.push("construction_category_rejected");
  const oem = numbers.oem ? kit.identifiers.normalizePartNumber(numbers.oem, manufacturer) : null;
  if (oem && !oem.valid) issues.push(`invalid_oem:${oem.reason}`);
  return { ok: issues.length === 0, issues, manufacturer, numbers, oem };
}

function upsertPart(store, input) {
  const checked = validatePartInput(input);
  if (!checked.ok) return { ok: false, issues: checked.issues };
  const providerId = input.providerId || input.source || "manual";
  const sourceRecordId = input.sourceRecordId || input.sourceId || null;
  const id =
    input.id ||
    (sourceRecordId
      ? kit.identifiers.stableId("ame-part", [providerId, sourceRecordId])
      : kit.identifiers.stableId("ame-part", [checked.manufacturer, checked.oem?.normalized || checked.numbers.oem]));
  const existingId = sourceRecordId ? kit.lookupSource(store, "part", providerId, sourceRecordId) : null;
  const targetId = existingId || id;
  const previous = store.parts.get(targetId);
  const descriptions = input.descriptions && typeof input.descriptions === "object" ? { ...input.descriptions } : {};
  if (input.description && !descriptions.de && !descriptions.en) descriptions.en = String(input.description);
  const synonyms = Array.isArray(input.synonyms) ? input.synonyms : [];

  const part = {
    id: targetId,
    domain: "agricultural",
    manufacturer: checked.manufacturer,
    brand: input.brand || checked.manufacturer,
    oemPartNumber: checked.oem?.original || checked.numbers.oem,
    oemNormalized: checked.oem?.normalized || null,
    manufacturerPartNumber: checked.numbers.manufacturer,
    supplierPartNumber: checked.numbers.supplier,
    aftermarketPartNumber: checked.numbers.aftermarket,
    previousPartNumbers: checked.numbers.previous.map(String),
    supersededPartNumbers: checked.numbers.superseded.map(String),
    replacementPartNumbers: checked.numbers.replacements.map(String),
    approvedAlternativePartNumbers: checked.numbers.approvedAlts.map(String),
    categoryId: input.categoryId || null,
    descriptions,
    synonyms,
    attributes: input.attributes && typeof input.attributes === "object" ? input.attributes : {},
    dimensions: input.dimensions || null,
    thread: input.thread || input.threadSpecification || null,
    connection: input.connection || input.connectionType || null,
    material: input.material || null,
    electrical: input.electrical || null,
    hydraulics: input.hydraulics || null,
    pto: input.pto || null,
    hitch: input.hitch || null,
    weight: input.weight || null,
    packaging: input.packaging || null,
    documentRefs: Array.isArray(input.documentRefs) ? input.documentRefs : [],
    imageRefs: Array.isArray(input.imageRefs) ? input.imageRefs : [],
    quality: QUALITY_STATUS.OK,
    verificationStatus: input.verificationStatus || "UNVERIFIED",
    provenance: kit.createProvenance({ ...input, providerId, sourceRecordId }),
    createdAt: previous?.createdAt || kit.nowIso(),
    updatedAt: kit.nowIso(),
  };

  if (previous?.oemNormalized && part.oemNormalized && previous.oemNormalized !== part.oemNormalized) {
    kit.recordConflict(store, {
      entityType: "part",
      entityId: targetId,
      field: "oemNormalized",
      values: [previous.oemNormalized, part.oemNormalized],
      providers: [previous.provenance.providerId, providerId],
    });
    part.quality = QUALITY_STATUS.WARNING;
  }

  store.parts.set(targetId, previous ? { ...previous, ...part } : part);
  if (sourceRecordId) kit.rememberSource(store, "part", providerId, sourceRecordId, targetId);
  kit.appendAudit(store, { action: previous ? "part.update" : "part.create", entityId: targetId, domain: "agricultural" });
  return { ok: true, part: store.parts.get(targetId), created: !previous };
}

function addPartRelation(store, input) {
  const fromPartId = String(input.fromPartId || "").trim();
  const toPartId = String(input.toPartId || "").trim();
  const kind = RELATION_KIND[input.kind] || input.kind;
  if (!fromPartId || !toPartId || !kind) return { ok: false, issues: ["invalid_relation"] };
  if (kind === RELATION_KIND.SUPERSESSION && input.universalMachineCompatibility === true) {
    return { ok: false, issues: ["supersession_not_universal"] };
  }
  const id = `${fromPartId}:${kind}:${toPartId}`;
  store.partRelations.set(id, {
    id,
    fromPartId,
    toPartId,
    kind,
    domain: "agricultural",
    notes: input.notes || null,
    provenance: kit.createProvenance(input),
    createdAt: kit.nowIso(),
  });
  return { ok: true, relation: store.partRelations.get(id) };
}

function findPartsByNumber(store, value, manufacturer) {
  const wanted = kit.identifiers.normalizePartNumber(value, manufacturer);
  if (!wanted.valid) return [];
  return [...store.parts.values()].filter((part) => {
    const candidates = [
      part.oemPartNumber,
      part.oemNormalized,
      part.manufacturerPartNumber,
      part.supplierPartNumber,
      part.aftermarketPartNumber,
      ...part.previousPartNumbers,
      ...part.supersededPartNumbers,
      ...part.replacementPartNumbers,
      ...part.approvedAlternativePartNumbers,
    ];
    return candidates.some((candidate) => {
      if (!candidate) return false;
      const normalized = kit.identifiers.normalizePartNumber(candidate, part.manufacturer);
      return normalized.valid && normalized.normalized === wanted.normalized;
    });
  });
}

module.exports = {
  validatePartInput,
  upsertPart,
  addPartRelation,
  findPartsByNumber,
  getPart: (store, id) => store.parts.get(id) || null,
  listParts: (store) => [...store.parts.values()],
};
