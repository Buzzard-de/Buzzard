const { inspectFile } = require("../hearing/humanStt");
const { getAgent } = require("./identityRegistry");
const { canUse } = require("./capabilityRegistry");
const crypto = require("crypto");

const sessions = new Map();

function openSession({ agentId }) {
  const agent = getAgent(agentId);
  if (!agent) return { ok: false, code: "UNKNOWN_AGENT" };
  if (!canUse(agentId, "hearing")) return { ok: false, code: "CAPABILITY_DENIED" };
  const sessionId = `hear_${agentId}_${crypto.randomBytes(3).toString("hex")}`;
  sessions.set(sessionId, { agentId, at: Date.now() });
  return { ok: true, sessionId, agentId, liveNetwork: false };
}

function listen({ sessionId, path }) {
  const sess = sessions.get(sessionId);
  if (!sess) return { ok: false, code: "SESSION_UNKNOWN" };
  const inspect = inspectFile(path || Buffer.alloc(0));
  return {
    ok: true,
    agentId: sess.agentId,
    sessionId,
    vadIsNotStt: true,
    humanStt: false,
    transcribe: inspect.transcribe,
    languagesTargeted: ["tr", "de", "en"],
    liveVerified: false,
    kind: "FILE_INSPECT_NOT_HUMAN_ASR",
  };
}

function crossListen({ sessionId, otherAgentId }) {
  const sess = sessions.get(sessionId);
  if (!sess) return { ok: false, code: "SESSION_UNKNOWN" };
  if (sess.agentId !== otherAgentId) return { ok: false, code: "HEARING_SESSION_ISOLATION_DENIED" };
  return { ok: true };
}

module.exports = { openSession, listen, crossListen };
