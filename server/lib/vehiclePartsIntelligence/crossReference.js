const { CROSS_REF_STATES, EVIDENCE_TYPES, APPROVED_EVIDENCE_TYPES } = require("./constants");
const { findPartsByNumber } = require("./parts");

function classifyCrossReference(store, query = {}) {
  const needle = query.partNumber || query.oem || query.q;
  if (!needle) {
    return { state: CROSS_REF_STATES.NO_VERIFIED_MATCH, evidence: [], explanation: "No identifier supplied." };
  }
  const hits = findPartsByNumber(store, needle, query.manufacturer);
  if (!hits.length) {
    return { state: CROSS_REF_STATES.NO_VERIFIED_MATCH, evidence: [], explanation: "No catalog identifier matched." };
  }

  const exactOem = hits.find((part) => {
    const oem = String(part.oemPartNumber || "").replace(/[\s\-./_]/g, "").toUpperCase();
    const q = String(needle).replace(/[\s\-./_]/g, "").toUpperCase();
    return oem === q;
  });
  if (exactOem) {
    return {
      state: CROSS_REF_STATES.EXACT_OEM_MATCH,
      partId: exactOem.id,
      explanation: "Identifier matches the preserved OEM number.",
      evidence: [{ type: "oem_number", source: exactOem.provenance.providerId, at: exactOem.updatedAt }],
    };
  }

  const approved = hits.find((part) =>
    part.approvedEquivalentNumbers.some((value) => value.replace(/[\s\-./_]/g, "").toUpperCase() === String(needle).replace(/[\s\-./_]/g, "").toUpperCase())
  );
  if (approved) {
    const rows = [...store.evidence.values()].filter((row) => row.partId === approved.id && APPROVED_EVIDENCE_TYPES.has(row.type));
    return {
      state: rows.length ? CROSS_REF_STATES.VERIFIED_AFTERMARKET_EQUIVALENT : CROSS_REF_STATES.POSSIBLE_MATCH,
      partId: approved.id,
      explanation: rows.length
        ? "Approved equivalent with authorized catalog evidence."
        : "Listed equivalent without authorized evidence.",
      evidence: rows.map((row) => ({ id: row.id, type: row.type, at: row.createdAt, source: row.provenance.providerId })),
    };
  }

  const replacement = hits.find((part) =>
    [...part.replacementPartNumbers, ...part.supersededPartNumbers, ...part.previousPartNumbers].some(
      (value) => value.replace(/[\s\-./_]/g, "").toUpperCase() === String(needle).replace(/[\s\-./_]/g, "").toUpperCase()
    )
  );
  if (replacement) {
    const authorized = [...store.evidence.values()].some(
      (row) => row.partId === replacement.id && (row.type === EVIDENCE_TYPES.SUPERSESSION || APPROVED_EVIDENCE_TYPES.has(row.type))
    );
    return {
      state: authorized ? CROSS_REF_STATES.VERIFIED_CROSS_REFERENCE : CROSS_REF_STATES.CONDITIONAL_REPLACEMENT,
      partId: replacement.id,
      explanation: authorized
        ? "Supersession or replacement confirmed by catalog evidence."
        : "Replacement listed but still conditional on vehicle configuration.",
      evidence: [{ source: replacement.provenance.providerId, at: replacement.updatedAt }],
    };
  }

  if (hits[0].aftermarketPartNumber) {
    return {
      state: CROSS_REF_STATES.POSSIBLE_MATCH,
      partId: hits[0].id,
      explanation: "Aftermarket identifier hit without interchange evidence.",
      evidence: [],
    };
  }

  return { state: CROSS_REF_STATES.POSSIBLE_MATCH, partId: hits[0].id, evidence: [] };
}

module.exports = { classifyCrossReference };
