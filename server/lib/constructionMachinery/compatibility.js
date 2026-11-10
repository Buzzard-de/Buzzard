const {
  COMPATIBILITY_STATES,
  EVIDENCE_TYPES,
  APPROVED_EVIDENCE_TYPES,
  RULE_VERSION,
} = require("./constants");
const { createProvenance } = require("./provenance");
const { appendAudit, nowIso } = require("./store");
const { getMachine } = require("./machines");
const { getPart, findPartsByNumber } = require("./parts");

const STATE_EVIDENCE = {
  [COMPATIBILITY_STATES.VERIFIED_COMPATIBLE]:
    "Authorized manufacturer catalog or explicitly approved technical source, matching machine identity, and no exclusion.",
  [COMPATIBILITY_STATES.CONDITIONALLY_COMPATIBLE]:
    "Approved evidence exists but year, serial, revision, position, or configuration boundaries apply.",
  [COMPATIBILITY_STATES.POSSIBLE_ALTERNATIVE]:
    "Supersession or alternative reference without machine-specific authorized proof. Not an OEM confirmation.",
  [COMPATIBILITY_STATES.VERIFIED_INCOMPATIBLE]:
    "Explicit exclusion from an authorized or approved source.",
  [COMPATIBILITY_STATES.INSUFFICIENT_DATA]:
    "Missing evidence, missing required serial/configuration, unknown machine, or only technical similarity / AI hint.",
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
  if (!partId || !Object.values(EVIDENCE_TYPES).includes(type)) {
    return { ok: false, issues: ["invalid_evidence"] };
  }
  if (type === EVIDENCE_TYPES.TECHNICAL_SIMILARITY || type === EVIDENCE_TYPES.AI_CANDIDATE) {
    input.canCertify = false;
  }
  const id = input.id || `ev-${store.evidence.size + 1}-${Date.now()}`;
  const record = {
    id,
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
    position: input.position || input.componentPosition || null,
    requiresSerial: Boolean(input.requiresSerial),
    requiresConfiguration: Boolean(input.requiresConfiguration),
    type,
    canCertify: input.canCertify !== false && APPROVED_EVIDENCE_TYPES.has(type),
    exclusion: type === EVIDENCE_TYPES.EXPLICIT_EXCLUSION || Boolean(input.exclusion),
    sourceReliability: Number(input.sourceReliability ?? (APPROVED_EVIDENCE_TYPES.has(type) ? 0.9 : 0.3)),
    notes: input.notes || null,
    provenance: createProvenance(input),
    createdAt: nowIso(),
  };
  store.evidence.set(id, record);
  appendAudit(store, { action: "evidence.add", entityId: id, partId });
  return { ok: true, evidence: record };
}

function machineMatchesEvidence(machine, query, evidence) {
  const manufacturer = (query.manufacturer || machine?.manufacturer || "").toLowerCase();
  const evMan = String(evidence.manufacturer || machine?.manufacturer || "").toLowerCase();
  if (evidence.manufacturer && manufacturer && evMan !== manufacturer) {
    return { match: false, reason: "manufacturer_mismatch" };
  }

  const model = String(query.modelCode || query.modelName || machine?.modelCode || machine?.modelName || "").toLowerCase();
  const evModel = String(evidence.modelCode || evidence.modelName || "").toLowerCase();
  if (evModel && model && evModel !== model) {
    return { match: false, reason: "model_mismatch" };
  }

  const year = query.year ?? query.productionYear ?? machine?.yearFrom ?? null;
  const yearRange = inRange(year, evidence.yearFrom, evidence.yearTo, true);
  if (yearRange.bounded && yearRange.missing) {
    return { match: false, insufficient: true, reason: "year_required" };
  }
  if (yearRange.bounded && !yearRange.inside) {
    return { match: false, reason: "year_out_of_range" };
  }

  const serial = query.serialNumber || machine?.serialNumber || null;
  const serialRange = inRange(serial, evidence.serialFrom, evidence.serialTo, false);
  if (evidence.requiresSerial && !serial) {
    return { match: false, insufficient: true, reason: "serial_required" };
  }
  if (serialRange.bounded && serialRange.missing) {
    return { match: false, insufficient: true, reason: "serial_required" };
  }
  if (serialRange.bounded && !serialRange.inside) {
    return { match: false, reason: "serial_out_of_range" };
  }

  if (evidence.engineModel && query.engineModel && evidence.engineModel !== query.engineModel) {
    return { match: false, reason: "engine_mismatch" };
  }
  if (evidence.revision && query.revision && evidence.revision !== query.revision) {
    return { match: false, reason: "revision_mismatch" };
  }
  if (evidence.position && query.position && evidence.position !== query.position) {
    return { match: false, reason: "position_mismatch" };
  }
  if (evidence.requiresConfiguration && !query.configuration && !query.revision && !query.engineModel) {
    return { match: false, insufficient: true, reason: "configuration_required" };
  }

  const unspecifiedConstraint = Boolean(
    (evidence.position && !query.position) ||
      (evidence.revision && !query.revision) ||
      (evidence.requiresConfiguration && !query.configuration) ||
      (yearRange.bounded && (query.year == null && query.productionYear == null && machine?.yearFrom == null)) ||
      (serialRange.bounded && !(query.serialNumber || machine?.serialNumber))
  );
  return { match: true, conditional: unspecifiedConstraint };
}

function evaluateCompatibility(store, query = {}) {
  const started = Date.now();
  const missing = [];
  const applied = [];
  const supporting = [];
  const conflicting = [];

  const machine = query.machineId ? getMachine(store, query.machineId) : null;
  if (query.machineId && !machine) missing.push("unknown_machine");

  let part = query.partId ? getPart(store, query.partId) : null;
  if (!part && query.oemPartNumber) {
    const found = findPartsByNumber(store, query.oemPartNumber, query.manufacturer);
    part = found[0] || null;
    if (found.length > 1) missing.push("ambiguous_part_number");
  }
  if (!part) missing.push("unknown_part");

  const evidenceRows = part
    ? [...store.evidence.values()].filter((row) => row.partId === part.id)
    : [];

  if (!query.manufacturer && !machine) missing.push("manufacturer");
  if (!query.modelName && !query.modelCode && !machine) missing.push("model");

  let state = COMPATIBILITY_STATES.INSUFFICIENT_DATA;
  let explanation = STATE_EVIDENCE[state];

  if (part && evidenceRows.length) {
    const exclusions = [];
    const approved = [];
    const alternatives = [];
    const weak = [];

    for (const row of evidenceRows) {
      const match = machineMatchesEvidence(machine, query, row);
      if (match.insufficient) {
        missing.push(match.reason);
        continue;
      }
      if (!match.match) {
        if (row.exclusion && (match.reason === "year_out_of_range" || match.reason === "serial_out_of_range")) {
          continue;
        }
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
      } else {
        weak.push({ row, match });
      }
    }

    if (exclusions.length) {
      state = COMPATIBILITY_STATES.VERIFIED_INCOMPATIBLE;
      supporting.push(...exclusions.map((item) => item.row.id));
      applied.push("explicit_exclusion");
    } else if (approved.length) {
      const conditional = approved.some((item) => item.match.conditional);
      state = conditional
        ? COMPATIBILITY_STATES.CONDITIONALLY_COMPATIBLE
        : COMPATIBILITY_STATES.VERIFIED_COMPATIBLE;
      supporting.push(...approved.map((item) => item.row.id));
      applied.push(conditional ? "approved_evidence_with_boundaries" : "approved_evidence");
      if (alternatives.length) {
        conflicting.push("alternative_also_present");
      }
    } else if (alternatives.length) {
      state = COMPATIBILITY_STATES.POSSIBLE_ALTERNATIVE;
      supporting.push(...alternatives.map((item) => item.row.id));
      applied.push("alternative_or_supersession_only");
    } else if (weak.length) {
      state = COMPATIBILITY_STATES.INSUFFICIENT_DATA;
      supporting.push(...weak.map((item) => item.row.id));
      applied.push("non_certifying_hint_only");
      missing.push("authorized_evidence");
    }
  } else if (part && !evidenceRows.length) {
    missing.push("compatibility_evidence");
    applied.push("no_evidence");
  }

  explanation = STATE_EVIDENCE[state];
  const decision = {
    state,
    explanation,
    evidenceRequirement: STATE_EVIDENCE[state],
    partId: part?.id || null,
    machineId: machine?.id || query.machineId || null,
    supportingEvidenceIds: supporting,
    conflictingEvidence: conflicting,
    missingInformation: [...new Set(missing)],
    rulesApplied: applied,
    ruleVersion: RULE_VERSION,
    decidedAt: nowIso(),
    latencyMs: Date.now() - started,
    aiSoleAuthority: false,
  };

  appendAudit(store, { action: "compatibility.evaluate", state, partId: decision.partId });
  return decision;
}

module.exports = {
  addEvidence,
  evaluateCompatibility,
  machineMatchesEvidence,
  STATE_EVIDENCE,
};
