/**
 * One duty card per existing council member. Execution stays on Pusat and specialistDispatch.
 */
const { ids, getAgent } = require("./identityRegistry");
const { SAFE, DANGEROUS, check } = require("./permissionEngine");
const { canUse } = require("./capabilityRegistry");
const { AGENT_KINDS, dispatch } = require("./specialistDispatch");
const { STAFF_DUTY } = require("../../pusat/orchestrator");
const { modelGate } = require("../thinking/modelGate");
const { isSalesEnabled } = require("../../salesMode");

function cardFor(agentId) {
  const agent = getAgent(agentId);
  if (!agent) return { ok: false, code: "UNKNOWN_AGENT" };
  const duty = STAFF_DUTY[agentId];
  const allowed = SAFE[agentId] || [];
  return {
    ok: true,
    agentId,
    displayName: agent.display_name,
    role: agent.role,
    specialization: agent.specialization,
    kind: duty.kind,
    sampleInput: duty.input,
    allowedKinds: AGENT_KINDS[agentId],
    allowedTools: allowed,
    forbidden: DANGEROUS.filter((perm) => !allowed.includes(perm)),
    speech: canUse(agentId, "speech"),
    inputShape: Object.keys(duty.input),
    output: "specialistDispatch result plus model gate",
  };
}

function listDuty() {
  const cards = ids().map(cardFor);
  return {
    ok: cards.length === 17 && cards.every((card) => card.ok),
    members: cards,
    rosterChanged: false,
  };
}

function runDuty({ agentId, input = null, speak = false } = {}) {
  const card = cardFor(agentId);
  if (!card.ok) return card;
  const model = modelGate();
  const result = dispatch({ agentId, kind: card.kind, input: input || card.sampleInput });
  let voice = null;
  if (speak && card.speech) {
    const { createTtsEngine } = require("../../voice/buzzardVoice");
    voice = createTtsEngine().speak({ agentId, text: "rapor", lang: "tr" });
  }
  if (speak && !card.speech) voice = { ok: false, code: "CAPABILITY_DENIED", speechGranted: false };
  return {
    ok: result.ok === true,
    agentId,
    kind: card.kind,
    result,
    model,
    voice,
    llmCompleted: false,
    actionStartedByModel: false,
    salesEnabled: isSalesEnabled(),
  };
}

function brief({ domain = "software", dbPath } = {}) {
  const { createOrchestrator } = require("../../pusat/orchestrator");
  const orch = createOrchestrator({ dbPath });
  const ran = orch.routeStaff({ domain });
  orch.close();
  return {
    ok: ran.ok === true,
    to: "suleyman_bey",
    from: "pusat",
    domain,
    specialists: ran.reports,
    pusatDidSpecialistWork: false,
    model: modelGate(),
    salesEnabled: isSalesEnabled(),
    live: false,
  };
}

function gates() {
  return {
    banuAssign: check("banu_hanim", "ASSIGN_TASK"),
    akinBuy: check("pricing_ai", "STOCK_BUY"),
    stockBuy: check("stock_ai", "STOCK_BUY"),
    sales: isSalesEnabled(),
  };
}

module.exports = { listDuty, runDuty, brief, gates, cardFor };
