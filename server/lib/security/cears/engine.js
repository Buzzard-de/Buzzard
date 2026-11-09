/**
 * CEARS local incident engine. No notify, no filings, no counterattack.
 * LIVE is always false until human-approved channels exist.
 */
const crypto = require("crypto");

const SEVERITY = Object.freeze(["P0", "P1", "P2", "P3"]);
const STATUS = Object.freeze([
  "OPEN",
  "ACKED",
  "CONTAINING",
  "EVIDENCE_HOLD",
  "HUMAN_REVIEW",
  "CLOSED",
  "FALSE_POSITIVE",
]);

const ROLES = Object.freeze({
  command: "pusat",
  security: "esat_bey",
  technical: "sinan_bey",
  decision: "human",
});

function createCears({ now = () => new Date().toISOString() } = {}) {
  const incidents = new Map();
  function open({
    title,
    severity = "P2",
    cia = [],
    fundsRisk = false,
    piiRisk = false,
    indicators = {},
    openedBy = "esat_bey",
  } = {}) {
    if (!SEVERITY.includes(severity)) return { ok: false, code: "BAD_SEVERITY" };
    const id = `cears_${crypto.randomBytes(6).toString("hex")}`;
    const row = {
      incident_id: id,
      title: String(title || "untitled"),
      severity,
      cia: [...cia],
      fundsRisk: Boolean(fundsRisk),
      piiRisk: Boolean(piiRisk),
      attributionConfidence: "UNATTRIBUTED",
      indicators: {
        ip: indicators.ip || null,
        asn: indicators.asn || null,
        dns: indicators.dns || null,
        domain: indicators.domain || null,
        session: indicators.session || null,
        account: indicators.account || null,
      },
      note: "IP/ASN are infrastructure, not a legal person",
      status: "OPEN",
      opened_at: now(),
      opened_by: openedBy,
      roles: { ...ROLES },
      timeline: [{ at: now(), actor: openedBy, event: "OPENED" }],
      evidence_ids: [],
      ack: null,
      notify_attempts: [],
      notifyConfigured: false,
      live: false,
      autoComplaint: false,
      counterattack: false,
    };
    incidents.set(id, row);
    return { ok: true, incident: snapshot(row), live: false };
  }
  function classify(id, { severity, attributionConfidence } = {}) {
    const row = incidents.get(id);
    if (!row) return { ok: false, code: "NOT_FOUND" };
    if (severity) {
      if (!SEVERITY.includes(severity)) return { ok: false, code: "BAD_SEVERITY" };
      row.severity = severity;
    }
    if (attributionConfidence) row.attributionConfidence = attributionConfidence;
    row.timeline.push({ at: now(), actor: "esat_bey", event: "CLASSIFIED" });
    return { ok: true, incident: snapshot(row) };
  }
  function contain(id, { actor = "esat_bey", action = "ISOLATE_SERVICE" } = {}) {
    const row = incidents.get(id);
    if (!row) return { ok: false, code: "NOT_FOUND" };
    if (action === "COUNTERATTACK" || action === "DOXX" || action === "FILE_COMPLAINT") {
      return { ok: false, code: "FORBIDDEN_RESPONSE", live: false };
    }
    row.status = "CONTAINING";
    row.timeline.push({ at: now(), actor, event: "CONTAIN", action });
    return { ok: true, incident: snapshot(row) };
  }
  function revoke({ actor = "human", target } = {}) {
    if (!target) return { ok: false, code: "TARGET_REQUIRED" };
    return {
      ok: true,
      revoked: false,
      staged: true,
      target,
      actor,
      code: "HUMAN_GATE_REQUIRED",
      note: "Credential revocation is staged only until human approval",
    };
  }
  function ack(id, { by = "human" } = {}) {
    const row = incidents.get(id);
    if (!row) return { ok: false, code: "NOT_FOUND" };
    if (by !== "human") return { ok: false, code: "AI_ACK_INVALID" };
    row.ack = { by, at: now(), channel: "LOCAL" };
    row.status = "ACKED";
    row.timeline.push({ at: now(), actor: by, event: "ACK" });
    return { ok: true, incident: snapshot(row) };
  }
  function notify() {
    return { ok: false, code: "NOTIFY_NOT_CONFIGURED", reachedNetwork: false, live: false };
  }
  function attachEvidence(id, evidenceId) {
    const row = incidents.get(id);
    if (!row) return { ok: false, code: "NOT_FOUND" };
    row.evidence_ids.push(evidenceId);
    row.status = "EVIDENCE_HOLD";
    row.timeline.push({ at: now(), actor: "esat_bey", event: "EVIDENCE_ATTACHED", evidenceId });
    return { ok: true, incident: snapshot(row) };
  }
  function close(id, { by = "human", falsePositive = false } = {}) {
    const row = incidents.get(id);
    if (!row) return { ok: false, code: "NOT_FOUND" };
    if (by !== "human") return { ok: false, code: "HUMAN_GATE_REQUIRED" };
    row.status = falsePositive ? "FALSE_POSITIVE" : "CLOSED";
    row.timeline.push({ at: now(), actor: by, event: row.status });
    return {
      ok: true,
      incident: snapshot(row),
      closeReport: {
        incident_id: id,
        notProven: ["person_identity_from_ip"],
        residualRisk: "unknown",
        live: false,
      },
    };
  }
  function snapshot(row) {
    return JSON.parse(JSON.stringify(row));
  }
  return {
    open,
    classify,
    contain,
    revoke,
    ack,
    notify,
    attachEvidence,
    close,
    get: (id) => (incidents.get(id) ? snapshot(incidents.get(id)) : null),
    list: () => [...incidents.values()].map(snapshot),
    SEVERITY,
    STATUS,
    ROLES,
    live: false,
  };
}

module.exports = { createCears, SEVERITY, STATUS, ROLES };
