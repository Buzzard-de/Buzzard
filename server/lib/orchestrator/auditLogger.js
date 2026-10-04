const crypto = require("crypto");
const { db } = require("../db");
const { redactObject } = require("./securityGuard");

function writeAudit({
  who,
  what,
  channel,
  agent,
  tool,
  result,
  risk,
  approval,
  conversationId,
  requestId,
  why,
} = {}) {
  const id = `aud_${crypto.randomBytes(8).toString("hex")}`;
  const safe = redactObject({
    who,
    what,
    when: new Date().toISOString(),
    why,
    channel,
    agent,
    tool,
    result,
    risk,
    approval,
    conversationId,
    requestId,
  });
  db.prepare(
    `INSERT INTO orch_audit_events(id, request_id, conversation_id, who, what, channel, agent, tool, risk, approval, result_json)
     VALUES (?,?,?,?,?,?,?,?,?,?,?)`
  ).run(
    id,
    requestId || null,
    conversationId || null,
    who || "anonymous",
    what || "",
    channel || null,
    agent || null,
    tool || null,
    risk || null,
    approval || null,
    JSON.stringify(safe)
  );
  try {
    const controlCenter = require("../controlCenter");
    controlCenter.recordSystemEvent({
      eventType: "orchestrator.action",
      actorType: "ai_orchestrator",
      actorId: who || "anonymous",
      resourceType: "conversation",
      resourceId: conversationId || requestId,
      summary: `${what || "action"} ${result || ""}`.trim(),
      metadata: { channel, agent, tool, risk, approval },
    });
  } catch {
    /* optional */
  }
  return { id, immutable: true };
}

function listAudit({ limit = 50 } = {}) {
  return db
    .prepare("SELECT * FROM orch_audit_events ORDER BY created_at DESC LIMIT ?")
    .all(Number(limit) || 50);
}

module.exports = {
  writeAudit,
  listAudit,
};
