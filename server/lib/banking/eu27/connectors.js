/**
 * Connector interface. Standards name the shapes this software can represent.
 * An entity does not gain an endpoint until a real API document is on file.
 */
const STANDARDS = Object.freeze([
  "OPEN_BANKING",
  "PSD2",
  "PSD3",
  "EBICS",
  "SEPA",
  "SEPA_INSTANT",
  "ISO_20022",
  "pain.001",
  "pain.002",
  "camt.052",
  "camt.053",
  "camt.054",
]);

const STATUSES = Object.freeze([
  "DISCOVERED",
  "LICENSE_VERIFIED",
  "API_DOCUMENTED",
  "CONTRACT_REQUIRED",
  "SANDBOX_READY",
  "SANDBOX_VERIFIED",
  "LIVE_APPROVAL_REQUIRED",
  "LIVE_VERIFIED",
]);

function connectorFor(entity) {
  const id = entity && (entity.lei || entity.orgNumber);
  if (!id) return { ok: false, code: "UNKNOWN_ENTITY", endpoint: null };
  return {
    ok: true,
    lei: entity.lei || null,
    orgNumber: entity.orgNumber || null,
    countryCode: entity.countryCode,
    status: "DISCOVERED",
    endpoint: null,
    live: false,
    interfaceStandards: STANDARDS,
    entitySupport: Object.fromEntries(STANDARDS.map((name) => [name, "NOT_DOCUMENTED"])),
    reason: "No institution API document was fetched. No endpoint is invented.",
  };
}

function advanceStatus(entity, nextStatus, { apiDocumentUrl = null } = {}) {
  if (!STATUSES.includes(nextStatus)) return { ok: false, code: "UNKNOWN_STATUS", applied: false };
  if (nextStatus === "DISCOVERED") return connectorFor(entity);
  if (!apiDocumentUrl) {
    return {
      ok: false,
      code: "API_DOCUMENT_REQUIRED",
      applied: false,
      status: "DISCOVERED",
      endpoint: null,
      live: false,
    };
  }
  return {
    ok: false,
    code: "DOCUMENT_NOT_REVIEWED",
    applied: false,
    status: "DISCOVERED",
    endpoint: null,
    live: false,
    apiDocumentUrl,
  };
}

module.exports = { STANDARDS, STATUSES, connectorFor, advanceStatus };
