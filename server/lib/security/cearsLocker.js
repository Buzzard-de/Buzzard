/**
 * Bind CEARS incidents to the evidence locker. Local only. No notify.
 */
function recordIncident({ cears, locker, title, bytes, severity = "P2", openedBy = "esat_bey" } = {}) {
  if (!cears || !locker) return { ok: false, code: "MISSING_ENGINE" };
  const evidence = locker.ingestOriginal({ bytes: bytes || title || "incident", source: "cears", method: "copy", acquiredBy: openedBy });
  if (!evidence.ok) return evidence;
  const opened = cears.open({ title: title || "untitled", severity, openedBy });
  if (!opened.ok) return opened;
  cears.attachEvidence(opened.incident.incident_id, evidence.record.evidence_id);
  locker.access(evidence.record.evidence_id, { actor: openedBy, action: "ATTACH" });
  const classified = cears.classify(opened.incident.incident_id, { severity });
  const contained = cears.contain(opened.incident.incident_id, { action: "ISOLATE_SERVICE" });
  const notify = cears.notify();
  return {
    ok: true,
    incident: cears.get(opened.incident.incident_id),
    evidence: evidence.record,
    classified: classified.ok,
    contained: contained.ok,
    notify,
    hmacIsSignature: evidence.record.hmacIsSignature === false,
    worm: evidence.record.worm === false,
    live: false,
  };
}

module.exports = { recordIncident };
