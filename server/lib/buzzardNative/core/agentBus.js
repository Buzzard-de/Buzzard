const crypto = require("crypto");
const { getAgent, ids } = require("./identityRegistry");
const { check } = require("./permissionEngine");

function createAgentBus() {
  const messages = [];
  const seen = new Set();
  function send({ sender, receiver, type, taskId, body, permission_scope = "shared" }) {
    if (!ids().includes(sender) || !ids().includes(receiver)) return { ok: false, code: "UNKNOWN_AGENT" };
    if (!getAgent(sender) || !getAgent(receiver)) return { ok: false, code: "UNKNOWN_AGENT" };
    if (!check(sender, "SEND_AGENT_MESSAGE").ok) return { ok: false, code: "PERMISSION_DENIED" };
    if (permission_scope === "personal_memory") return { ok: false, code: "PRIVATE_MEMORY_TRANSFER_DENIED" };
    const payload = JSON.stringify({ sender, receiver, type, taskId, body, permission_scope });
    const integrity_hash = crypto.createHash("sha256").update(payload).digest("hex");
    if (seen.has(integrity_hash)) return { ok: false, code: "DUPLICATE_MESSAGE" };
    seen.add(integrity_hash);
    const msg = {
      message_id: `msg_${crypto.randomBytes(4).toString("hex")}`,
      sender_agent_id: sender,
      receiver_agent_id: receiver,
      task_id: taskId || null,
      message_type: type || "note",
      timestamp: new Date().toISOString(),
      permission_scope,
      correlation_id: `cor_${crypto.randomBytes(3).toString("hex")}`,
      integrity_hash,
      status: "DELIVERED_IN_PROCESS",
      liveNetwork: false,
    };
    messages.push(msg);
    return { ok: true, message: msg };
  }
  function inbox(agentId) {
    return messages.filter((m) => m.receiver_agent_id === agentId);
  }
  return { send, inbox, all: () => messages.slice() };
}

module.exports = { createAgentBus };
