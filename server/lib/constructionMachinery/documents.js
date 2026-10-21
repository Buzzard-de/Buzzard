/**
 * Extension points for IPC / drawings / visual identification.
 * Structured relations are never invented from an unparsed document.
 */

function listDocuments(store, filters = {}) {
  return [...store.documents.values()].filter((doc) => {
    if (filters.kind && doc.kind !== filters.kind) return false;
    return true;
  });
}

function attachDocument(store, input) {
  if (!input?.sourceRecordId || !input.title) {
    return { ok: false, issues: ["invalid_document"] };
  }
  const record = {
    sourceRecordId: input.sourceRecordId,
    title: input.title,
    kind: input.kind || "technical_pdf",
    version: input.version || null,
    source: input.source || null,
    structured: Boolean(input.structured),
    partIds: Array.isArray(input.partIds) ? input.partIds : [],
    note: input.structured
      ? null
      : "Stored as document only. No invented exploded-diagram relationships.",
  };
  store.documents.set(record.sourceRecordId, record);
  return { ok: true, document: record };
}

function suggestVisualCandidates() {
  return {
    implemented: false,
    status: "NOT_IMPLEMENTED",
    note: "Visual identification may only suggest candidates and cannot certify compatibility.",
    candidates: [],
  };
}

module.exports = {
  listDocuments,
  attachDocument,
  suggestVisualCandidates,
};
