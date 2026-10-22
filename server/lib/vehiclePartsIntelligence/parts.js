const { QUALITY_STATUS, RELATION_KIND } = require("./constants");
const kit = require("../machineryDomainKit");

function bags(input) {
  return {
    oem: input.oemPartNumber || input.oemNumber || null,
    manufacturer: input.manufacturerPartNumber || input.mpn || null,
    supplier: input.supplierPartNumber || input.supplierSku || null,
    aftermarket: input.aftermarketPartNumber || null,
    ean: input.ean || input.gtin || null,
    reman: input.remanPartNumber || null,
    previous: Array.isArray(input.previousPartNumbers) ? input.previousPartNumbers : [],
    superseded: Array.isArray(input.supersededPartNumbers) ? input.supersededPartNumbers : [],
    replacements: Array.isArray(input.replacementPartNumbers) ? input.replacementPartNumbers : [],
    approved: Array.isArray(input.approvedEquivalentNumbers) ? input.approvedEquivalentNumbers : [],
  };
}

function validatePartInput(input = {}) {
  const issues = [];
  const manufacturer = String(input.manufacturer || input.brand || "").trim();
  const numbers = bags(input);
  if (!manufacturer) issues.push("missing_manufacturer");
  if (!(numbers.oem || numbers.manufacturer || numbers.supplier || numbers.aftermarket || numbers.reman)) {
    issues.push("missing_part_number");
  }
  if (input.categoryId && String(input.categoryId).startsWith("ame-cat-")) issues.push("agricultural_rejected");
  if (input.categoryId && String(input.categoryId).startsWith("cme-cat-")) issues.push("construction_rejected");
  const oem = numbers.oem ? kit.identifiers.normalizePartNumber(numbers.oem, manufacturer) : null;
  if (oem && !oem.valid) issues.push(`invalid_oem:${oem.reason}`);
  return { ok: issues.length === 0, issues, manufacturer, numbers, oem };
}

function upsertPart(store, input = {}) {
  const checked = validatePartInput(input);
  if (!checked.ok) return { ok: false, issues: checked.issues };
  const providerId = input.providerId || input.source || "manual";
  const sourceRecordId = input.sourceRecordId || null;
  const id =
    input.id ||
    (sourceRecordId
      ? kit.identifiers.stableId("vpe-part", [providerId, sourceRecordId])
      : kit.identifiers.stableId("vpe-part", [checked.manufacturer, checked.oem?.normalized || checked.numbers.oem]));
  const existingId = sourceRecordId ? kit.lookupSource(store, "part", providerId, sourceRecordId) : null;
  const targetId = existingId || id;
  const previous = store.parts.get(targetId);
  const descriptions = input.descriptions && typeof input.descriptions === "object" ? { ...input.descriptions } : {};
  if (input.description && !descriptions.en) descriptions.en = String(input.description);
  const part = {
    id: targetId,
    domain: "automotive",
    manufacturer: checked.manufacturer,
    brand: input.brand || checked.manufacturer,
    oemPartNumber: checked.oem?.original || checked.numbers.oem,
    oemNormalized: checked.oem?.normalized || null,
    oemOriginalPreserved: checked.oem?.original || checked.numbers.oem,
    manufacturerPartNumber: checked.numbers.manufacturer,
    supplierPartNumber: checked.numbers.supplier,
    aftermarketPartNumber: checked.numbers.aftermarket,
    ean: checked.numbers.ean,
    remanPartNumber: checked.numbers.reman,
    previousPartNumbers: checked.numbers.previous.map(String),
    supersededPartNumbers: checked.numbers.superseded.map(String),
    replacementPartNumbers: checked.numbers.replacements.map(String),
    approvedEquivalentNumbers: checked.numbers.approved.map(String),
    revision: input.revision || null,
    categoryId: input.categoryId || null,
    assemblyId: input.assemblyId || input.parentAssemblyId || null,
    positionId: input.positionId || input.diagramPosition || null,
    quantityPerVehicle: input.quantityPerVehicle ?? null,
    hvWarning: Boolean(input.hvWarning || input.highVoltage),
    condition: input.condition || "new",
    oemVsAftermarket: checked.numbers.aftermarket && !checked.numbers.oem ? "aftermarket" : "oem_or_mixed",
    descriptions,
    synonyms: Array.isArray(input.synonyms) ? input.synonyms : [],
    attributes: input.attributes || {},
    dimensions: input.dimensions || null,
    connectorType: input.connectorType || null,
    electrical: input.electrical || null,
    hydraulics: input.hydraulics || null,
    mounting: input.mounting || null,
    documentRefs: Array.isArray(input.documentRefs) ? input.documentRefs : [],
    quality: QUALITY_STATUS.OK,
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
  kit.appendAudit(store, { action: previous ? "part.update" : "part.create", entityId: targetId, domain: "automotive" });
  return { ok: true, part: store.parts.get(targetId), created: !previous };
}

function addPartRelation(store, input) {
  const fromPartId = String(input.fromPartId || "").trim();
  const toPartId = String(input.toPartId || "").trim();
  const kind = RELATION_KIND[input.kind] || input.kind;
  if (!fromPartId || !toPartId || !kind) return { ok: false, issues: ["invalid_relation"] };
  if (input.similarNumbersOnly) return { ok: false, issues: ["similar_numbers_not_interchangeable"] };
  const id = `${fromPartId}:${kind}:${toPartId}`;
  store.partRelations.set(id, {
    id,
    fromPartId,
    toPartId,
    kind,
    domain: "automotive",
    evidence: input.evidence || null,
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
      part.manufacturerPartNumber,
      part.supplierPartNumber,
      part.aftermarketPartNumber,
      part.ean,
      part.remanPartNumber,
      ...part.previousPartNumbers,
      ...part.supersededPartNumbers,
      ...part.replacementPartNumbers,
      ...part.approvedEquivalentNumbers,
    ];
    return candidates.some((candidate) => {
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
