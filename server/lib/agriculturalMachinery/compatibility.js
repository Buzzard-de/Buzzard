const { COMPATIBILITY_STATES, EVIDENCE_TYPES, APPROVED_EVIDENCE_TYPES, RULE_VERSION } = require("./constants");
const kit = require("../machineryDomainKit");
const { getMachine } = require("./machines");
const { getPart, findPartsByNumber } = require("./parts");

const STATE_EVIDENCE = {
  [COMPATIBILITY_STATES.VERIFIED_COMPATIBLE]:
    "Authorized agricultural manufacturer catalog or approved technical source, matching machine identity and specs, no exclusion.",
  [COMPATIBILITY_STATES.CONDITIONALLY_COMPATIBLE]:
    "Approved evidence exists but year, serial, PTO, hitch, revision, or position still constrain the result.",
  [COMPATIBILITY_STATES.POSSIBLE_ALTERNATIVE]:
    "Supersession or aftermarket alternative without machine-specific authorized proof.",
  [COMPATIBILITY_STATES.VERIFIED_INCOMPATIBLE]:
    "Explicit exclusion or conflicting required specification (PTO, voltage, thread, hydraulics, hitch).",
  [COMPATIBILITY_STATES.INSUFFICIENT_DATA]:
    "Missing evidence, required serial/configuration, unknown machine, or only technical similarity.",
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

function specConflict(query, part, evidence) {
  const conflicts = [];
  const pto = query.ptoSpeed || query.ptoSpecification;
  const evPto = evidence.ptoSpeed || part?.pto?.speed;
  if (pto && evPto && String(pto) !== String(evPto)) conflicts.push("pto_mismatch");

  const voltage = query.voltage || query.electricalVoltage;
  const evVolt = evidence.voltage || part?.electrical?.voltage;
  if (voltage && evVolt && String(voltage) !== String(evVolt)) conflicts.push("electrical_mismatch");

  const thread = query.thread;
  const evThread = evidence.thread || part?.thread;
  if (thread && evThread && String(thread).toLowerCase() !== String(evThread).toLowerCase()) conflicts.push("thread_mismatch");

  const hitch = query.hitch || query.linkageCategory;
  const evHitch = evidence.hitch || evidence.linkageCategory || part?.hitch;
  if (hitch && evHitch && String(hitch) !== String(evHitch)) conflicts.push("hitch_mismatch");

  const hyd = query.hydraulics || query.hydraulicStandard;
  const evHyd = evidence.hydraulics || part?.hydraulics?.standard;
  if (hyd && evHyd && String(hyd) !== String(evHyd)) conflicts.push("hydraulic_mismatch");

  if (query.dimensionValue != null && (evidence.dimensionValue != null || part?.dimensions?.value != null)) {
    const compared = kit.units.compareCompatible(
      query.dimensionValue,
      query.dimensionUnit || "mm",
      evidence.dimensionValue ?? part.dimensions.value,
      evidence.dimensionUnit || part.dimensions?.unit || "mm"
    );
    if (!compared.ok) conflicts.push(compared.error);
    else if (Math.abs(compared.delta) > 0.05) conflicts.push("dimension_mismatch");
  }
  return conflicts;
}

function addEvidence(store, input) {
  const partId = String(input.partId || "").trim();
  const type = input.type;
  if (!partId || !Object.values(EVIDENCE_TYPES).includes(type)) return { ok: false, issues: ["invalid_evidence"] };
  if (type === EVIDENCE_TYPES.TECHNICAL_SIMILARITY || type === EVIDENCE_TYPES.AI_CANDIDATE) input.canCertify = false;
  const id = input.id || `ame-ev-${store.evidence.size + 1}-${Date.now()}`;
  const record = {
    id,
    domain: "agricultural",
    partId,
    machineId: input.machineId || null,
    manufacturer: input.manufacturer || null,
    modelName: input.modelName || null,
    modelCode: input.modelCode || null,
    yearFrom: input.yearFrom ?? null,
    yearTo: input.yearTo ?? null,
    serialFrom: input.serialFrom || null,
    serialTo: input.serialTo || null,
    revision: input.revision || null,
    engineModel: input.engineModel || null,
    engineConfiguration: input.engineConfiguration || null,
    position: input.position || null,
    ptoSpeed: input.ptoSpeed || null,
    voltage: input.voltage || null,
    thread: input.thread || null,
    hitch: input.hitch || input.linkageCategory || null,
    hydraulics: input.hydraulics || null,
    dimensionValue: input.dimensionValue ?? null,
    dimensionUnit: input.dimensionUnit || null,
    requiresSerial: Boolean(input.requiresSerial),
    requiresConfiguration: Boolean(input.requiresConfiguration),
    type,
    canCertify: input.canCertify !== false && APPROVED_EVIDENCE_TYPES.has(type),
    exclusion: type === EVIDENCE_TYPES.EXPLICIT_EXCLUSION || Boolean(input.exclusion),
    sourceReliability: Number(input.sourceReliability ?? (APPROVED_EVIDENCE_TYPES.has(type) ? 0.9 : 0.3)),
    notes: input.notes || null,
    provenance: kit.createProvenance(input),
    createdAt: kit.nowIso(),
  };
  store.evidence.set(id, record);
  kit.appendAudit(store, { action: "evidence.add", entityId: id, partId, domain: "agricultural" });
  return { ok: true, evidence: record };
}

function correctEvidence(store, { evidenceId, actor, patch } = {}) {
  const existing = store.evidence.get(evidenceId);
  if (!existing) return { ok: false, issues: ["unknown_evidence"] };
  if (!actor) return { ok: false, issues: ["actor_required"] };
  const next = { ...existing, ...patch, id: existing.id, updatedAt: kit.nowIso(), correctedBy: actor };
  store.evidence.set(evidenceId, next);
  kit.appendAudit(store, { action: "evidence.correct", entityId: evidenceId, actor, domain: "agricultural" });
  return { ok: true, evidence: next };
}

function machineMatchesEvidence(machine, query, evidence) {
  const manufacturer = (query.manufacturer || machine?.manufacturer || "").toLowerCase();
  const evMan = String(evidence.manufacturer || machine?.manufacturer || "").toLowerCase();
  if (evidence.manufacturer && manufacturer && evMan !== manufacturer) return { match: false, reason: "manufacturer_mismatch" };

  const model = String(query.modelCode || query.modelName || machine?.modelCode || machine?.modelName || "").toLowerCase();
  const evModel = String(evidence.modelCode || evidence.modelName || "").toLowerCase();
  if (evModel && model && evModel !== model) return { match: false, reason: "model_mismatch" };

  const year = query.year ?? query.productionYear ?? machine?.yearFrom ?? null;
  const yearRange = inRange(year, evidence.yearFrom, evidence.yearTo, true);
  if (yearRange.bounded && yearRange.missing) return { match: false, insufficient: true, reason: "year_required" };
  if (yearRange.bounded && !yearRange.inside) return { match: false, reason: "year_out_of_range" };

  const serial = query.serialNumber || machine?.serialNumber || null;
  const serialRange = inRange(serial, evidence.serialFrom, evidence.serialTo, false);
  if (evidence.requiresSerial && !serial) return { match: false, insufficient: true, reason: "serial_required" };
  if (serialRange.bounded && serialRange.missing) return { match: false, insufficient: true, reason: "serial_required" };
  if (serialRange.bounded && !serialRange.inside) return { match: false, reason: "serial_out_of_range" };

  if (evidence.engineModel && query.engineModel && evidence.engineModel !== query.engineModel) {
    return { match: false, reason: "engine_mismatch" };
  }
  if (evidence.revision && query.revision && evidence.revision !== query.revision) {
    return { match: false, reason: "revision_mismatch" };
  }
  if (evidence.requiresConfiguration && !query.configuration && !query.ptoSpeed && !query.hitch && !query.revision) {
    return { match: false, insufficient: true, reason: "configuration_required" };
  }

  const unspecifiedConstraint = Boolean(
    (evidence.position && !query.position) ||
      (evidence.revision && !query.revision) ||
      (evidence.ptoSpeed && !query.ptoSpeed && !query.ptoSpecification) ||
      (evidence.hitch && !query.hitch && !query.linkageCategory)
  );
  return { match: true, conditional: unspecifiedConstraint };
}

function evaluateCompatibility(store, query = {}) {
  const started = Date.now();
  const missing = [];
  const applied = [];
  const supporting = [];
  const conflicting = [];

  if (query.categoryId && String(query.categoryId).startsWith("cme-cat-")) {
    return {
      state: COMPATIBILITY_STATES.INSUFFICIENT_DATA,
      explanation: "Construction category IDs are rejected by the agricultural engine.",
      rejectedDomain: "construction",
      missingInformation: ["wrong_domain"],
      rulesApplied: ["domain_isolation"],
      ruleVersion: RULE_VERSION,
      decidedAt: kit.nowIso(),
      aiSoleAuthority: false,
    };
  }

  const machine = query.machineId ? getMachine(store, query.machineId) : null;
  if (query.machineId && !machine) missing.push("unknown_machine");
  if (machine && machine.domain && machine.domain !== "agricultural") missing.push("non_agricultural_machine");

  let part = query.partId ? getPart(store, query.partId) : null;
  if (!part && query.oemPartNumber) {
    const found = findPartsByNumber(store, query.oemPartNumber, query.manufacturer);
    part = found[0] || null;
    if (found.length > 1) missing.push("ambiguous_part_number");
  }
  if (!part) missing.push("unknown_part");
  if (!query.manufacturer && !machine) missing.push("manufacturer");
  if (!query.modelName && !query.modelCode && !machine) missing.push("model");

  const evidenceRows = part ? [...store.evidence.values()].filter((row) => row.partId === part.id) : [];
  let state = COMPATIBILITY_STATES.INSUFFICIENT_DATA;

  if (part && evidenceRows.length) {
    const exclusions = [];
    const approved = [];
    const alternatives = [];
    const weak = [];
    const specFails = [];

    for (const row of evidenceRows) {
      const match = machineMatchesEvidence(machine, query, row);
      if (match.insufficient) {
        missing.push(match.reason);
        continue;
      }
      if (!match.match) continue;
      const specs = specConflict(query, part, row);
      if (specs.length) {
        specFails.push({ row, specs });
        continue;
      }
      if (row.exclusion) exclusions.push({ row, match });
      else if (row.canCertify && APPROVED_EVIDENCE_TYPES.has(row.type)) approved.push({ row, match });
      else if (
        row.type === EVIDENCE_TYPES.SUPERSESSION ||
        row.type === EVIDENCE_TYPES.APPROVED_ALTERNATIVE ||
        row.type === EVIDENCE_TYPES.UNVERIFIED_ALTERNATIVE
      ) {
        alternatives.push({ row, match });
      } else weak.push({ row, match });
    }

    if (exclusions.length) {
      state = COMPATIBILITY_STATES.VERIFIED_INCOMPATIBLE;
      supporting.push(...exclusions.map((item) => item.row.id));
      applied.push("explicit_exclusion");
    } else if (specFails.length && !approved.length) {
      state = COMPATIBILITY_STATES.VERIFIED_INCOMPATIBLE;
      conflicting.push(...specFails.flatMap((item) => item.specs));
      applied.push("technical_specification_conflict");
    } else if (approved.length) {
      const conditional = approved.some((item) => item.match.conditional);
      state = conditional ? COMPATIBILITY_STATES.CONDITIONALLY_COMPATIBLE : COMPATIBILITY_STATES.VERIFIED_COMPATIBLE;
      supporting.push(...approved.map((item) => item.row.id));
      applied.push(conditional ? "approved_evidence_with_boundaries" : "approved_agricultural_evidence");
    } else if (alternatives.length) {
      state = COMPATIBILITY_STATES.POSSIBLE_ALTERNATIVE;
      supporting.push(...alternatives.map((item) => item.row.id));
      applied.push("alternative_or_supersession_only");
    } else if (weak.length) {
      supporting.push(...weak.map((item) => item.row.id));
      applied.push("non_certifying_hint_only");
      missing.push("authorized_evidence");
    }
  } else if (part && !evidenceRows.length) {
    missing.push("compatibility_evidence");
    applied.push("no_evidence");
  }

  const decision = {
    state,
    explanation: STATE_EVIDENCE[state],
    evidenceRequirement: STATE_EVIDENCE[state],
    partId: part?.id || null,
    machineId: machine?.id || query.machineId || null,
    domain: "agricultural",
    supportingEvidenceIds: supporting,
    conflictingEvidence: conflicting,
    missingInformation: [...new Set(missing)],
    rulesApplied: applied,
    ruleVersion: RULE_VERSION,
    decidedAt: kit.nowIso(),
    latencyMs: Date.now() - started,
    aiSoleAuthority: false,
    identifierKind: part?.aftermarketPartNumber && part.aftermarketPartNumber === query.oemPartNumber ? "aftermarket" : "oem_or_unknown",
  };
  kit.appendAudit(store, { action: "compatibility.evaluate", state, partId: decision.partId, domain: "agricultural" });
  return decision;
}

module.exports = {
  addEvidence,
  correctEvidence,
  evaluateCompatibility,
  specConflict,
  STATE_EVIDENCE,
};
