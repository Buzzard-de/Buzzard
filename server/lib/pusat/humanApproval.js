/**
 * Human Approval Center — persists through the durable queue when a dbPath is given.
 * High-risk actions never auto-approve.
 */
const { createDurableTaskQueue } = require("./durableTaskQueue");
const os = require("os");
const path = require("path");

const RISK = Object.freeze({
  LOW: "LOW",
  MEDIUM: "MEDIUM",
  HIGH: "HIGH",
  CRITICAL: "CRITICAL",
});

function createApprovalCenter({ dbPath } = {}) {
  const resolved = dbPath || path.join(os.tmpdir(), "buzzard-approvals.sqlite");
  const queue = createDurableTaskQueue({ dbPath: resolved });

  function submit({ action, requestedBy, reason, risk = RISK.HIGH, payload = {}, taskId = "standalone" } = {}) {
    if (risk === RISK.LOW) {
      return {
        ok: true,
        item: {
          status: "APPROVED",
          risk,
          decidedBy: "policy:low-risk",
          auto: true,
        },
      };
    }
    return queue.submitApproval({
      taskId: payload.taskId || taskId,
      action,
      requestedBy,
      reason,
      risk,
      payload,
    });
  }

  function decide({ id, approved, actorId }) {
    return queue.decideApproval({ id, approved, actorId });
  }

  function pending() {
    return queue.listApprovals({ status: "WAITING_APPROVAL" });
  }

  return {
    submit,
    decide,
    pending,
    list: () => queue.listApprovals(),
    close: () => queue.close(),
    RISK,
  };
}

module.exports = { createApprovalCenter, RISK };
