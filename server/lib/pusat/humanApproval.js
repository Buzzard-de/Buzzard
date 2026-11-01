/**
 * Human Approval Center — high-risk actions stay WAITING_APPROVAL.
 */
const crypto = require("crypto");

const RISK = Object.freeze({
  LOW: "LOW",
  MEDIUM: "MEDIUM",
  HIGH: "HIGH",
  CRITICAL: "CRITICAL",
});

function createApprovalCenter() {
  const items = [];

  function submit({ action, requestedBy, reason, risk = RISK.HIGH, payload = {} } = {}) {
    const autoApprove = risk === RISK.LOW;
    const item = {
      id: `apr_${crypto.randomBytes(6).toString("hex")}`,
      action,
      requestedBy,
      reason,
      risk,
      payload,
      status: autoApprove ? "APPROVED" : "WAITING_APPROVAL",
      createdAt: new Date().toISOString(),
      decidedAt: autoApprove ? new Date().toISOString() : null,
      decidedBy: autoApprove ? "policy:low-risk" : null,
    };
    items.push(item);
    return { ok: true, item };
  }

  function decide({ id, approved, actorId }) {
    const item = items.find((i) => i.id === id);
    if (!item) return { ok: false, code: "NOT_FOUND" };
    if (item.status !== "WAITING_APPROVAL") return { ok: false, code: "ALREADY_DECIDED" };
    item.status = approved ? "APPROVED" : "REJECTED";
    item.decidedAt = new Date().toISOString();
    item.decidedBy = actorId || "human";
    return { ok: true, item };
  }

  function pending() {
    return items.filter((i) => i.status === "WAITING_APPROVAL");
  }

  return { submit, decide, pending, list: () => [...items] };
}

module.exports = { createApprovalCenter, RISK };
