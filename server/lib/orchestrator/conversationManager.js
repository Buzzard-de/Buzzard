const crypto = require("crypto");
const { db } = require("../db");
const { CONVERSATION_STATUS, LANGUAGES } = require("./constants");
const { sanitizeText } = require("./securityGuard");

function resolveLanguage(locale) {
  const short = String(locale || "de").slice(0, 2).toLowerCase();
  return LANGUAGES.includes(short) ? short : "de";
}

function createConversation({ userId, channel, language, sessionId } = {}) {
  const id = `conv_${crypto.randomBytes(8).toString("hex")}`;
  db.prepare(
    `INSERT INTO orch_conversations(id, user_id, channel, language, session_id, status, context_json)
     VALUES (?,?,?,?,?,?,?)`
  ).run(
    id,
    userId || null,
    channel || "TEXT",
    resolveLanguage(language),
    sessionId || id,
    CONVERSATION_STATUS.NEW,
    JSON.stringify({})
  );
  return getConversation(id);
}

function getConversation(id) {
  const row = db.prepare("SELECT * FROM orch_conversations WHERE id = ?").get(id);
  if (!row) return null;
  return {
    ...row,
    context: safeJson(row.context_json, {}),
    messages: listMessages(id),
  };
}

function listMessages(conversationId) {
  return db
    .prepare("SELECT * FROM orch_messages WHERE conversation_id = ? ORDER BY created_at ASC")
    .all(conversationId);
}

function appendMessage(conversationId, { role, content, intent, agent }) {
  const id = `msg_${crypto.randomBytes(6).toString("hex")}`;
  db.prepare(
    `INSERT INTO orch_messages(id, conversation_id, role, content, intent, agent)
     VALUES (?,?,?,?,?,?)`
  ).run(id, conversationId, role, sanitizeText(content), intent || null, agent || null);
  db.prepare(
    "UPDATE orch_conversations SET updated_at = CURRENT_TIMESTAMP, status = ? WHERE id = ?"
  ).run(CONVERSATION_STATUS.ACTIVE, conversationId);
  return id;
}

function updateConversation(id, patch = {}) {
  const current = getConversation(id);
  if (!current) return null;
  const context = { ...current.context, ...(patch.context || {}) };
  db.prepare(
    `UPDATE orch_conversations
     SET status = ?, intent = ?, active_agent = ?, active_task = ?, language = ?, context_json = ?, updated_at = CURRENT_TIMESTAMP
     WHERE id = ?`
  ).run(
    patch.status || current.status,
    patch.intent || current.intent,
    patch.activeAgent || current.active_agent,
    patch.activeTask || current.active_task,
    resolveLanguage(patch.language || current.language),
    JSON.stringify(context),
    id
  );
  return getConversation(id);
}

function safeJson(raw, fallback) {
  try {
    return JSON.parse(raw || "null") ?? fallback;
  } catch {
    return fallback;
  }
}

module.exports = {
  resolveLanguage,
  createConversation,
  getConversation,
  appendMessage,
  updateConversation,
  listMessages,
  CONVERSATION_STATUS,
};
