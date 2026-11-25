/**
 * Aslan Bey stays outside the 17-member roster.
 * He coordinates Doğu Bey's research and keeps a local forensics record.
 * He does not attack, pursue, or open a second orchestrator.
 */
const crypto = require("crypto");
const { createDoguDesk } = require("../../pusat/doguResearch");
const { modelGate } = require("../thinking/modelGate");
const esat = require("../../security/esatBey");

const IDENTITY = Object.freeze({
  agent_id: "aslan_bey",
  display_name: "Aslan Bey",
  role: "Müsteşar / AI Operasyon ve İstihbarat Koordinatörü",
  councilMember: false,
  reportsTo: "pusat",
  assists: "dogu_bey",
  lab: "central_digital_forensics",
});

const OFFENSE = new Set(["counterattack", "intrude", "pursue", "exploit", "unauthorized_access"]);

function coordinate({ topic = "categories", question = "local_only", sources = [] } = {}) {
  if (OFFENSE.has(String(topic || "").toLowerCase())) return { ok: false, code: "OFFENSIVE_ACTION_DENIED", identity: IDENTITY };
  const desk = createDoguDesk();
  const opened = desk.requestResearch({ fromId: "pusat", topic, question });
  if (!opened.ok) return { ...opened, identity: IDENTITY };
  const subtasks = [
    { id: `${opened.request.id}-research`, owner: "dogu_bey", objective: question },
    { id: `${opened.request.id}-verify`, owner: "aslan_bey", objective: "check sources and contradictions" },
    { id: `${opened.request.id}-report`, owner: "aslan_bey", audience: "pusat", objective: "management summary" },
  ];
  const done = desk.complete({
    requestId: opened.request.id,
    sources,
    findings: question,
    performedBy: "dogu_bey",
  });
  const claims = [...new Set((done.report.sources || []).map((row) => row.claim).filter(Boolean))];
  const contradictions = claims.length > 1 ? [{ field: "claim", values: claims }] : [];
  let followUp = null;
  if (done.report.verification !== "SOURCED" || contradictions.length) {
    followUp = desk.requestResearch({
      fromId: "pusat",
      topic,
      question: contradictions.length ? "resolve_contradiction" : "sources_missing",
    });
  }
  return {
    ok: true,
    identity: IDENTITY,
    subtasks,
    report: done.report,
    contradictions,
    followUp,
    pusatSummary: {
      from: "aslan_bey",
      to: "pusat",
      verification: done.report.verification,
      contradictions: contradictions.length,
    },
    model: modelGate(),
    network: false,
  };
}

function indicatorsOf(text) {
  const rawIps = String(text).match(/\b(?:\d{1,3}\.){3}\d{1,3}\b/g) || [];
  const ips = rawIps.filter((ip) => ip.split(".").every((part) => Number(part) <= 255));
  const domains = String(text).match(/\b(?:[a-z0-9-]+\.)+[a-z]{2,}\b/gi) || [];
  const hashes = String(text).match(/\b[a-f0-9]{64}\b/gi) || [];
  return { ips: [...new Set(ips)], domains: [...new Set(domains.map((d) => d.toLowerCase()))], hashes: [...new Set(hashes.map((h) => h.toLowerCase()))] };
}

function examine({ action = "examine", artifacts = [] } = {}) {
  if (OFFENSE.has(String(action || "").toLowerCase())) {
    return { ok: false, code: "OFFENSIVE_ACTION_DENIED", executed: false, remoteAccess: false };
  }
  const custody = [];
  const timeline = [];
  const indicators = { ips: [], domains: [], hashes: [] };
  const affected = [];
  for (const artifact of artifacts) {
    const body = Buffer.isBuffer(artifact.bytes) ? artifact.bytes : Buffer.from(String(artifact.text || ""), "utf8");
    const hash = crypto.createHash("sha256").update(body).digest("hex");
    custody.push({
      artifact: artifact.name || "artifact",
      sha256: hash,
      collectedBy: artifact.collectedBy || "unknown",
      collectedAt: artifact.collectedAt || null,
      action: "EXAMINED",
      executed: false,
    });
    if (artifact.system) affected.push(artifact.system);
    const text = body.toString("utf8");
    const found = indicatorsOf(text);
    indicators.ips.push(...found.ips);
    indicators.domains.push(...found.domains);
    indicators.hashes.push(...found.hashes);
    for (const line of text.split(/\r?\n/)) {
      const at = line.match(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:Z|[+-]\d{2}:\d{2})/);
      if (at) timeline.push({ at: at[0], line: line.slice(0, 180) });
    }
  }
  const risk = indicators.ips.length || indicators.hashes.length ? "HIGH" : "LOW";
  return {
    ok: true,
    lab: IDENTITY.lab,
    examiner: "aslan_bey",
    staticOnly: true,
    executed: false,
    remoteAccess: false,
    custody,
    timeline,
    indicators,
    affected: [...new Set(affected)],
    risk,
    model: modelGate(),
  };
}

function handToDefense(exam) {
  if (!exam || exam.ok === false) return { ok: false, code: "NO_FINDING" };
  return {
    ok: true,
    from: "aslan_bey",
    to: "esat_bey",
    researchOwner: "dogu_bey",
    defenseOwner: "esat_bey",
    esat: esat.status(),
    affected: exam.affected || [],
    risk: exam.risk || "LOW",
    custody: exam.custody || [],
    offense: false,
    remoteAccess: false,
    recoveryFollowedBy: "aslan_bey",
  };
}

module.exports = { IDENTITY, coordinate, examine, handToDefense };
