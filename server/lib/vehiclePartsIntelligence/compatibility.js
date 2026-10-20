const { COMPATIBILITY_STATES, EVIDENCE_TYPES, APPROVED_EVIDENCE_TYPES, RULE_VERSION } = require("./constants");
const kit = require("../machineryDomainKit");
const { getVehicle } = require("./vehicles");
const { getPart, findPartsByNumber } = require("./parts");
const { inspectVin } = require("./vin");

const STATE_EVIDENCE = {
  [COMPATIBILITY_STATES.VERIFIED_COMPATIBLE]:
    "Authorized OEM/aftermarket catalog evidence matching manufacturer, model, and required configuration.",
  [COMPATIBILITY_STATES.CONDITIONALLY_COMPATIBLE]:
    "Approved evidence exists but engine, gearbox, year, VIN configuration, or position remains unresolved.",
  [COMPATIBILITY_STATES.POSSIBLE_ALTERNATIVE]:
    "Cross-reference or aftermarket listing without vehicle-specific authorized proof.",
  [COMPATIBILITY_STATES.VERIFIED_INCOMPATIBLE]:
    "Explicit exclusion or conflicting required specification.",
  [COMPATIBILITY_STATES.INSUFFICIENT_DATA]:
    "Missing evidence, unknown vehicle/part, or only a broad make/model/year without configuration.",
};

function inRange(value, from, to, numeric) {
  if (from == null && to == null) return { bounded: false, inside: true };
  if (value == null || value === "") return { bounded: true, inside: false, missing: true };
  if (numeric) {
    const n = Number(value);
    const min = from == null ? -Infinity : Number(from);
    const max = to == null ? Infinity : Number(to);
    if (!Number.isFinite(n)) return { bounded: true, inside: false, invalid: true };
    return { bounded: true, inside: n >= min && n <= max };
  }
  const text = String(value);
  if (from != null && text < String(from)) return { bounded: true, inside: false };
  if (to != null && text > String(to)) return { bounded: true, inside: false };
  return { bounded: true, inside: true };
}

function addEvidence(store, input) {
  const partId = String(input.partId || "").trim();
  const type = input.type;
  if (!partId || !Object.values(EVIDENCE_TYPES).includes(type)) return { ok: false, issues: ["invalid_evidence"] };
  if (type === EVIDENCE_TYPES.TECHNICAL_SIMILARITY || type === EVIDENCE_TYPES.AI_CANDIDATE) input.canCertify = false;
  const id = input.id || `vpe-ev-${store.evidence.size + 1}-${Date.now()}`;
  const record = {
    id,
    domain: "automotive",
    partId,
    vehicleId: input.vehicleId || input.machineId || null,
    manufacturer: input.manufacturer || null,
    model: input.model || input.modelName || null,
    generation: input.generation || null,
    yearFrom: input.yearFrom ?? null,
    yearTo: input.yearTo ?? null,
    engineCode: input.engineCode || null,
    gearboxCode: input.gearboxCode || null,
    region: input.region || null,
    emissions: input.emissions || null,
    position: input.position || null,
    connectorType: input.connectorType || null,
    revision: input.revision || null,
    requiresEngine: Boolean(input.requiresEngine),
    requiresGearbox: Boolean(input.requiresGearbox),
    requiresSerial: Boolean(input.requiresSerial),
    type,
    canCertify: input.canCertify !== false && APPROVED_EVIDENCE_TYPES.has(type),
    exclusion: type === EVIDENCE_TYPES.EXPLICIT_EXCLUSION || Boolean(input.exclusion),
    provenance: kit.createProvenance(input),
    createdAt: kit.nowIso(),
  };
  store.evidence.set(id, record);
  kit.appendAudit(store, { action: "evidence.add", entityId: id, partId, domain: "automotive" });
  return { ok: true, evidence: record };
}

function correctEvidence(store, { evidenceId, actor, patch } = {}) {
  const existing = store.evidence.get(evidenceId);
  if (!existing) return { ok: false, issues: ["unknown_evidence"] };
  if (!actor) return { ok: false, issues: ["actor_required"] };
  const next = { ...existing, ...patch, id: existing.id, updatedAt: kit.nowIso(), correctedBy: actor };
  store.evidence.set(evidenceId, next);
  kit.appendAudit(store, { action: "evidence.correct", entityId: evidenceId, actor, domain: "automotive" });
  return { ok: true, evidence: next };
}

function matchEvidence(vehicle, query, evidence) {
  const manufacturer = (query.manufacturer || vehicle?.manufacturer || "").toLowerCase();
  if (evidence.manufacturer && manufacturer && evidence.manufacturer.toLowerCase() !== manufacturer) {
    return { match: false, reason: "manufacturer_mismatch" };
  }
  const model = String(query.model || query.modelName || vehicle?.model || "").toLowerCase();
  if (evidence.model && model && evidence.model.toLowerCase() !== model) return { match: false, reason: "model_mismatch" };
  if (evidence.generation && query.generation && evidence.generation !== query.generation) {
    return { match: false, reason: "generation_mismatch" };
  }
  if (evidence.generation && !query.generation && evidence.exclusion) {
    return { match: false, insufficient: true, reason: "generation_required_for_exclusion" };
  }
  const year = query.year ?? query.productionYear ?? null;
  const yearRange = inRange(year, evidence.yearFrom, evidence.yearTo, true);
  if (yearRange.bounded && yearRange.missing && (evidence.requiresSerial || evidence.yearFrom)) {
    if (yearRange.missing && evidence.yearFrom && year == null && !query.allowBroadYear) {
      return { match: true, conditional: true, reason: "year_unspecified" };
    }
  }
  if (yearRange.bounded && year != null && !yearRange.inside) return { match: false, reason: "year_out_of_range" };

  if (evidence.requiresEngine && !query.engineCode && !vehicle?.engineCode) {
    return { match: false, insufficient: true, reason: "engine_required" };
  }
  if (evidence.engineCode && query.engineCode && evidence.engineCode !== query.engineCode) {
    return { match: false, reason: "engine_mismatch" };
  }
  if (evidence.requiresGearbox && !query.gearboxCode && !vehicle?.gearboxCode) {
    return { match: false, insufficient: true, reason: "gearbox_required" };
  }
  if (evidence.gearboxCode && query.gearboxCode && evidence.gearboxCode !== query.gearboxCode) {
    return { match: false, reason: "gearbox_mismatch" };
  }
  if (evidence.connectorType && query.connectorType && evidence.connectorType !== query.connectorType) {
    return { match: false, reason: "connector_mismatch" };
  }
  const conditional = Boolean(
    (evidence.engineCode && !query.engineCode) ||
      (evidence.gearboxCode && !query.gearboxCode) ||
      (evidence.generation && !query.generation) ||
      (evidence.position && !query.position) ||
      (yearRange.bounded && year == null)
  );
  return { match: true, conditional };
}

function evaluateCompatibility(store, query = {}) {
  const started = Date.now();
  if (query.categoryId && (String(query.categoryId).startsWith("ame-cat-") || String(query.categoryId).startsWith("cme-cat-"))) {
    return {
      state: COMPATIBILITY_STATES.INSUFFICIENT_DATA,
      rejectedDomain: String(query.categoryId).startsWith("ame") ? "agricultural" : "construction",
      explanation: "Automotive engine refuses machinery-domain category IDs.",
      rulesApplied: ["domain_isolation"],
      missingInformation: ["wrong_domain"],
      aiSoleAuthority: false,
      vin: query.vin ? inspectVin(query.vin) && { present: true, decoderAuthoritative: false, fullVinLogged: false } : null,
    };
  }

  const vehicle = query.vehicleId ? getVehicle(store, query.vehicleId) : null;
  const missing = [];
  if (query.vehicleId && !vehicle) missing.push("unknown_vehicle");
  let part = query.partId ? getPart(store, query.partId) : null;
  if (!part && (query.oemPartNumber || query.partNumber)) {
    part = findPartsByNumber(store, query.oemPartNumber || query.partNumber, query.manufacturer)[0] || null;
  }
  if (!part) missing.push("unknown_part");
  if (!query.manufacturer && !vehicle) missing.push("manufacturer");
  if (!query.model && !query.modelName && !vehicle) missing.push("model");

  const vin = query.vin ? inspectVin(query.vin) : { ok: false };
  const evidenceRows = part ? [...store.evidence.values()].filter((row) => row.partId === part.id) : [];
  let state = COMPATIBILITY_STATES.INSUFFICIENT_DATA;
  const supporting = [];
  const applied = [];

  if (part && evidenceRows.length) {
    const exclusions = [];
    const approved = [];
    const alternatives = [];
    for (const row of evidenceRows) {
      const match = matchEvidence(vehicle, query, row);
      if (match.insufficient) {
        missing.push(match.reason);
        continue;
      }
      if (!match.match) continue;
      if (row.exclusion) exclusions.push({ row, match });
      else if (row.canCertify && APPROVED_EVIDENCE_TYPES.has(row.type)) approved.push({ row, match });
      else alternatives.push({ row, match });
    }
    if (exclusions.length) {
      state = COMPATIBILITY_STATES.VERIFIED_INCOMPATIBLE;
      supporting.push(...exclusions.map((item) => item.row.id));
      applied.push("explicit_exclusion");
    } else if (approved.length) {
      const conditional = approved.some((item) => item.match.conditional);
      const onlyBroadYear = !query.engineCode && approved.every((item) => item.row.requiresEngine || item.row.engineCode);
      state =
        conditional || onlyBroadYear
          ? COMPATIBILITY_STATES.CONDITIONALLY_COMPATIBLE
          : COMPATIBILITY_STATES.VERIFIED_COMPATIBLE;
      supporting.push(...approved.map((item) => item.row.id));
      applied.push(conditional || onlyBroadYear ? "approved_with_unresolved_config" : "approved_vehicle_evidence");
    } else if (alternatives.length) {
      state = COMPATIBILITY_STATES.POSSIBLE_ALTERNATIVE;
      supporting.push(...alternatives.map((item) => item.row.id));
      applied.push("unverified_or_supersession_only");
    } else {
      missing.push("authorized_evidence");
    }
  } else if (part) {
    missing.push("compatibility_evidence");
  }

  const decision = {
    state,
    explanation: STATE_EVIDENCE[state],
    partId: part?.id || null,
    vehicleId: vehicle?.id || query.vehicleId || null,
    domain: "automotive",
    supportingEvidenceIds: supporting,
    missingInformation: [...new Set(missing)],
    rulesApplied: applied,
    ruleVersion: RULE_VERSION,
    decidedAt: kit.nowIso(),
    latencyMs: Date.now() - started,
    aiSoleAuthority: false,
    vin: {
      provided: Boolean(query.vin),
      valid: Boolean(vin.ok),
      decoderAuthoritative: false,
      fullVinStored: false,
      fullVinLogged: false,
      public: vin.ok ? { wmi: vin.wmi, last6: vin.last6 } : null,
    },
  };
  kit.appendAudit(store, { action: "compatibility.evaluate", state, partId: decision.partId, domain: "automotive" });
  return decision;
}

module.exports = { addEvidence, correctEvidence, evaluateCompatibility, STATE_EVIDENCE };
