/**
 * Prevent two AI teams from executing conflicting work on the same subject.
 */

const { db } = require("../db");
const { TASK_STATUS } = require("../../core/constants");

function subjectKey(task) {
  const payload = task.payload || {};
  return String(payload.subject || payload.sku || payload.orderId || payload.orderNumber || "")
    .trim()
    .toLowerCase();
}

function detect(task) {
  const subject = subjectKey(task);
  if (!subject) return { blocked: false };
  const rows = db
    .prepare(
      `SELECT id, title, status, employee_id, payload_json FROM core_ai_tasks
       WHERE status = ? AND id != ?
       ORDER BY created_at DESC LIMIT 50`
    )
    .all(TASK_STATUS.RUNNING, task.id);
  for (const row of rows) {
    let payload = {};
    try {
      payload = JSON.parse(row.payload_json || "{}");
    } catch {
      payload = {};
    }
    const other = subjectKey({ payload, title: row.title });
    if (other && other === subject) {
      return {
        blocked: true,
        reason: "CONFLICTING_RUNNING_TASK",
        otherTaskId: row.id,
        subject,
        executed: false,
      };
    }
  }
  return { blocked: false, subject };
}

module.exports = { detect, subjectKey };
