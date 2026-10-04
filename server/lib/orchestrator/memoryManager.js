const crypto = require("crypto");
const { db } = require("../db");
const { redactObject, containsSensitivePayment } = require("./securityGuard");

const KINDS = Object.freeze({
  USER: "USER",
  CONVERSATION: "CONVERSATION",
  CUSTOMER: "CUSTOMER",
  TASK: "TASK",
  AGENT: "AGENT",
  BUSINESS: "BUSINESS",
  SUPPLIER: "SUPPLIER",
  OPERATIONAL: "OPERATIONAL",
});

function put({ kind, ownerId, conversationId, payload, summary }) {
  if (containsSensitivePayment(JSON.stringify(payload || {}))) {
    return { ok: false, code: "SENSITIVE_REJECTED" };
  }
  const id = `mem_${crypto.randomBytes(8).toString("hex")}`;
  db.prepare(
    `INSERT INTO orch_memory(id, kind, owner_id, conversation_id, summary, payload_json)
     VALUES (?,?,?,?,?,?)`
  ).run(
    id,
    kind || KINDS.CONVERSATION,
    ownerId || null,
    conversationId || null,
    String(summary || "").slice(0, 400),
    JSON.stringify(redactObject(payload || {}))
  );
  return { ok: true, id };
}

function list({ kind, ownerId, conversationId, limit = 20 } = {}) {
  if (conversationId) {
    return db
      .prepare(
        "SELECT * FROM orch_memory WHERE conversation_id = ? ORDER BY created_at DESC LIMIT ?"
      )
      .all(conversationId, limit);
  }
  if (kind && ownerId) {
    return db
      .prepare("SELECT * FROM orch_memory WHERE kind = ? AND owner_id = ? ORDER BY created_at DESC LIMIT ?")
      .all(kind, ownerId, limit);
  }
  return db.prepare("SELECT * FROM orch_memory ORDER BY created_at DESC LIMIT ?").all(limit);
}

function contextWindow({ conversationId, recentLimit = 8 } = {}) {
  const recent = list({ conversationId, limit: recentLimit });
  const summaries = recent.map((row) => row.summary).filter(Boolean);
  return {
    recentMessages: recent,
    summary: summaries.slice(0, 3).join(" | ").slice(0, 500),
    relevantMemory: recent.slice(0, 3),
  };
}

module.exports = {
  KINDS,
  put,
  list,
  contextWindow,
};
