const crypto = require("crypto");
const { db } = require("../db");
const { TASK_STATUS } = require("./constants");

function createTask({ type, owner, agent, input, conversationId, priority = "NORMAL" } = {}) {
  const id = `task_${crypto.randomBytes(8).toString("hex")}`;
  db.prepare(
    `INSERT INTO orch_tasks(id, type, status, priority, owner, agent, conversation_id, input_json)
     VALUES (?,?,?,?,?,?,?,?)`
  ).run(
    id,
    type || "generic",
    TASK_STATUS.QUEUED,
    priority,
    owner || null,
    agent || null,
    conversationId || null,
    JSON.stringify(input || {})
  );
  return getTask(id);
}

function getTask(id) {
  return db.prepare("SELECT * FROM orch_tasks WHERE id = ?").get(id) || null;
}

function updateTask(id, { status, output, error } = {}) {
  db.prepare(
    `UPDATE orch_tasks SET status = ?, output_json = ?, error = ?, retry_count = retry_count + ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`
  ).run(status || TASK_STATUS.RUNNING, output ? JSON.stringify(output) : null, error || null, error ? 1 : 0, id);
  return getTask(id);
}

function listTasks({ status, limit = 40 } = {}) {
  if (status) {
    return db.prepare("SELECT * FROM orch_tasks WHERE status = ? ORDER BY created_at DESC LIMIT ?").all(status, limit);
  }
  return db.prepare("SELECT * FROM orch_tasks ORDER BY created_at DESC LIMIT ?").all(limit);
}

module.exports = {
  createTask,
  getTask,
  updateTask,
  listTasks,
  TASK_STATUS,
};
