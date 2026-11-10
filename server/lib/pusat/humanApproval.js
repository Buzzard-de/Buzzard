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

const NEVER_AUTO = new Set([
  "GIT_PUSH",
  "GIT_MERGE",
  "DEPLOY",
  "PRODUCTION_WRITE",
  "PAYMENT_ACTIVATE",
  "SALES_ACTIVATE",
  "DATA_EXPORT",
  "DATA_DELETE",
  "SECURITY_POLICY_CHANGE",
  "BANK_TRANSFER",
  "LIVE_PAYMENT",
  "STOCK_BUY",
  "SUPPLIER_PAY",
  "CUSTOMER_REFUND",
  "PHONE_LIVE_CALL",
  "FIAT_POLICY_CHANGE",
  "LIVE_CONNECTOR",
  "CARD_STORE",
]);

function containsCardNumber(value) {
  const stack = [value];
  while (stack.length) {
    const current = stack.pop();
    if (typeof current === "string" && /^\d{13,19}$/.test(current.replace(/[\s-]/g, ""))) return true;
    if (current && typeof current === "object") stack.push(...Object.values(current));
  }
  return false;
}

function createApprovalCenter({ dbPath } = {}) {
  const resolved = dbPath || path.join(os.tmpdir(), "buzzard-approvals.sqlite");
  const queue = createDurableTaskQueue({ dbPath: resolved });

  function submit({ action, requestedBy, reason, risk = RISK.HIGH, payload = {}, taskId = "standalone" } = {}) {
    if (containsCardNumber(payload) || containsCardNumber(reason)) {
      return { ok: false, code: "CARD_DATA_REJECTED", stored: false };
    }
    const irreversible = NEVER_AUTO.has(String(action || "").toUpperCase());
    if (!irreversible && risk === RISK.LOW) {
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
      risk: irreversible ? RISK.CRITICAL : risk,
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
