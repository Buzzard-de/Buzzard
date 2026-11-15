const crypto = require("crypto");
const { getAgentExact, ids } = require("./identityRegistry");
const { check } = require("./permissionEngine");

const MESSAGE_SCOPES = new Set(["shared", "task"]);

function carriesPrivateMemory(scope, body) {
  const name = String(scope || "").toLowerCase();
  if (name.includes("personal") || name.includes("private") || name.includes("memory")) return true;
  if (!body || typeof body !== "object" || Array.isArray(body)) return false;
  if (body.type === "personal") return true;
  return ["ownerId", "memoryOwnerId", "namespace", "memory_namespace", "permission", "permissions"].some((key) =>
    Object.prototype.hasOwnProperty.call(body, key),
  );
}

function createAgentBus() {
  const messages = [];
  const seen = new Set();
  function send({ actorId, sender, receiver, type, taskId, body, permission_scope = "shared" } = {}) {
    const actor = actorId || sender;
    if (sender && actorId && sender !== actorId) {
      return { ok: false, code: "SENDER_MISMATCH", liveNetwork: false, stored: false };
    }
    if (!ids().includes(actor) || !ids().includes(receiver)) return { ok: false, code: "UNKNOWN_AGENT", liveNetwork: false };
    if (!getAgentExact(actor) || !getAgentExact(receiver)) return { ok: false, code: "UNKNOWN_AGENT", liveNetwork: false };
    if (!check(actor, "SEND_AGENT_MESSAGE").ok) return { ok: false, code: "PERMISSION_DENIED", liveNetwork: false };
    if (carriesPrivateMemory(permission_scope, body)) {
      return { ok: false, code: "PRIVATE_MEMORY_TRANSFER_DENIED", liveNetwork: false, stored: false };
    }
    if (!MESSAGE_SCOPES.has(permission_scope)) {
      return { ok: false, code: "PERMISSION_SCOPE_DENIED", liveNetwork: false, stored: false };
    }
    const payload = JSON.stringify({ sender: actor, receiver, type, taskId, body, permission_scope });
    const integrity_hash = crypto.createHash("sha256").update(payload).digest("hex");
    if (seen.has(integrity_hash)) return { ok: false, code: "DUPLICATE_MESSAGE", liveNetwork: false };
    seen.add(integrity_hash);
    const msg = {
      message_id: `msg_${crypto.randomBytes(4).toString("hex")}`,
      sender_agent_id: actor,
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
    return { ok: true, message: msg, liveNetwork: false };
  }
  function visibleTo(actorId) {
    return messages
      .filter((message) => message.receiver_agent_id === actorId || message.sender_agent_id === actorId)
      .map((message) => ({ ...message, liveNetwork: false }));
  }
  function inbox(agentId) {
    return visibleTo(agentId);
  }
  function read({ actorId, boxId = actorId } = {}) {
    if (!actorId || actorId !== boxId) {
      return { ok: false, code: "MESSAGE_ISOLATION_DENIED", liveNetwork: false, messages: [] };
    }
    return { ok: true, liveNetwork: false, messages: visibleTo(actorId) };
  }
  return { send, inbox, read, all: () => messages.map((message) => ({ ...message, liveNetwork: false })), liveNetwork: false };
}

module.exports = { createAgentBus };
