const { COMPATIBILITY_STATES } = require("./constants");
const kit = require("../machineryDomainKit");
const { listParts } = require("./parts");
const { listVehicles } = require("./vehicles");
const { evaluateCompatibility } = require("./compatibility");
const { classifyCrossReference } = require("./crossReference");

const SYNONYMS = {
  bremsscheibe: ["brake disc", "bremsscheiben"],
  bremsbelag: ["brake pad", "bremsbeläge"],
  ventil: ["valve"],
  kolbenring: ["piston ring"],
  zylinderkopfschraube: ["head bolt"],
};

function tokenize(value) {
  return String(value || "")
    .toLowerCase()
    .split(/[^a-z0-9äöüß]+/i)
    .filter((token) => token.length > 1);
}

function expand(tokens) {
  const out = new Set(tokens);
  for (const token of tokens) for (const extra of SYNONYMS[token] || []) out.add(extra);
  return [...out];
}

function search(store, query = {}, taxonomy) {
  const started = Date.now();
  if (query.categoryId && (String(query.categoryId).startsWith("ame-cat-") || String(query.categoryId).startsWith("cme-cat-"))) {
    return { items: [], total: 0, rejectedDomain: String(query.categoryId).startsWith("ame") ? "agricultural" : "construction" };
  }
  const q = String(query.q || query.oem || query.partNumber || "").trim();
  const scored = listParts(store)
    .filter((part) => part.domain === "automotive")
    .map((part) => {
      let score = 0;
      let matchKind = "text";
      const reasons = [];
      const normalized = q ? kit.identifiers.normalizePartNumber(q, part.manufacturer) : null;
      if (normalized?.valid && part.oemNormalized === normalized.normalized) {
        score += 1000;
        matchKind = "exact_oem";
        reasons.push("exact_oem");
      } else if (normalized?.valid) {
        const alts = [
          part.manufacturerPartNumber,
          part.supplierPartNumber,
          part.aftermarketPartNumber,
          part.ean,
          ...part.previousPartNumbers,
          ...part.approvedEquivalentNumbers,
        ];
        if (alts.some((value) => kit.identifiers.normalizePartNumber(value, part.manufacturer).normalized === normalized.normalized)) {
          score += 700;
          matchKind = "cross_reference";
          reasons.push("identifier");
        }
      }
      const hay = [part.oemPartNumber, ...Object.values(part.descriptions || {}), ...(part.synonyms || []), part.categoryId]
        .join(" ")
        .toLowerCase();
      const hits = expand(tokenize(q)).filter((token) => hay.includes(token)).length;
      if (hits) {
        score += hits * 15;
        reasons.push("keyword");
      }
      if (query.engineCode && (part.attributes?.engineCode === query.engineCode || hay.includes(String(query.engineCode).toLowerCase()))) {
        score += 40;
        reasons.push("engine_code");
      }
      if (query.assemblyId && part.assemblyId === query.assemblyId) {
        score += 30;
        reasons.push("assembly");
      }
      if (query.thread && part.attributes?.thread === query.thread) {
        score += 25;
        reasons.push("technical");
      }
      let compatibility = null;
      if (query.vehicleId || query.model || query.modelName) {
        compatibility = evaluateCompatibility(store, { ...query, partId: part.id });
        if (compatibility.state === COMPATIBILITY_STATES.VERIFIED_COMPATIBLE) score += 200;
        else if (compatibility.state === COMPATIBILITY_STATES.CONDITIONALLY_COMPATIBLE) score += 80;
        else if (compatibility.state === COMPATIBILITY_STATES.POSSIBLE_ALTERNATIVE) score += 10;
        else if (compatibility.state === COMPATIBILITY_STATES.VERIFIED_INCOMPATIBLE) score -= 500;
        reasons.push(`compat:${compatibility.state}`);
      }
      const xref = q ? classifyCrossReference(store, { partNumber: q, manufacturer: query.manufacturer }) : null;
      return { part, score, matchKind, reasons, compatibility, xref };
    })
    .filter((row) => (q || query.vehicleId || query.model ? row.score > 0 : true))
    .sort((a, b) => {
      const rank = {
        [COMPATIBILITY_STATES.VERIFIED_COMPATIBLE]: 0,
        [COMPATIBILITY_STATES.CONDITIONALLY_COMPATIBLE]: 1,
        [COMPATIBILITY_STATES.POSSIBLE_ALTERNATIVE]: 2,
        [COMPATIBILITY_STATES.INSUFFICIENT_DATA]: 3,
        [COMPATIBILITY_STATES.VERIFIED_INCOMPATIBLE]: 4,
      };
      const ca = rank[a.compatibility?.state] ?? 3;
      const cb = rank[b.compatibility?.state] ?? 3;
      if (ca !== cb) return ca - cb;
      const idRank = { exact_oem: 0, cross_reference: 1, text: 2 };
      return (idRank[a.matchKind] ?? 3) - (idRank[b.matchKind] ?? 3) || b.score - a.score;
    });

  const page = Math.max(1, Number(query.page) || 1);
  const pageSize = Math.min(100, Math.max(1, Number(query.pageSize) || 20));
  const start = (page - 1) * pageSize;
  return {
    domain: "automotive",
    items: scored.slice(start, start + pageSize).map((row) => ({
      id: row.part.id,
      manufacturer: row.part.manufacturer,
      oemPartNumber: row.part.oemPartNumber,
      descriptions: row.part.descriptions,
      matchKind: row.matchKind,
      score: row.score,
      reasons: row.reasons,
      hvWarning: row.part.hvWarning,
      quantityPerVehicle: row.part.quantityPerVehicle,
      assemblyId: row.part.assemblyId,
      compatibility: row.compatibility
        ? { state: row.compatibility.state, explanation: row.compatibility.explanation, missingInformation: row.compatibility.missingInformation }
        : null,
      crossReference: row.xref ? { state: row.xref.state } : null,
      verifiedExactMatch:
        row.matchKind === "exact_oem" &&
        (!row.compatibility || row.compatibility.state === COMPATIBILITY_STATES.VERIFIED_COMPATIBLE),
      provenance: { providerId: row.part.provenance.providerId, mock: row.part.provenance.mock },
    })),
    vehicles: listVehicles(store)
      .filter((vehicle) => {
        if (query.vehicleId) return vehicle.id === query.vehicleId;
        const blob = `${vehicle.manufacturer} ${vehicle.model} ${vehicle.engineCode || ""}`.toLowerCase();
        return [query.q, query.model, query.manufacturer, query.engineCode].filter(Boolean).every((needle) =>
          blob.includes(String(needle).toLowerCase())
        );
      })
      .slice(0, 8)
      .map((vehicle) => ({
        id: vehicle.id,
        manufacturer: vehicle.manufacturer,
        model: vehicle.model,
        generation: vehicle.generation,
        vehicleClass: vehicle.vehicleClass,
      })),
    page,
    pageSize,
    total: scored.length,
    latencyMs: Date.now() - started,
    taxonomyHint: q && taxonomy ? taxonomy.findByAlias(q).slice(0, 8).map((category) => category.id) : [],
    rankingNote: "Verified compatibility and exact OEM outrank price.",
  };
}

module.exports = { search, expand, tokenize };
