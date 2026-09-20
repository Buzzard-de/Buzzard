import { describe, it, expect, beforeEach } from "vitest";
import {
  approveHumanAction,
  cancelHumanApproval,
  markApprovalExecuted,
  rejectHumanApproval,
  requestHumanApproval,
  resetHumanApprovalCenterForTests,
} from "./center";

describe("human-approval-center", () => {
  beforeEach(() => resetHumanApprovalCenterForTests());

  it("requires two distinct approvers for critical actions", () => {
    const payload = { orderId: "O1" };
    const req = requestHumanApproval({
      requestId: "r1",
      actor: "alice",
      scope: "order",
      action: "SUPPLIER_ORDER",
      risk: "CRITICAL",
      payload,
      reason: "test",
      expiresAt: new Date(Date.now() + 60_000).toISOString(),
    });
    expect(approveHumanAction(req.approvalId, "alice", payload).ok).toBe(false);
    expect(approveHumanAction(req.approvalId, "bob", payload).ok).toBe(true);
    const fin = approveHumanAction(req.approvalId, "carol", payload);
    expect(fin.ok).toBe(true);
    expect(fin.record?.status).toBe("APPROVED");
  });

  it("supports reject, cancel, and executed lifecycle", () => {
    const payload = { x: 1 };
    const req = requestHumanApproval({
      requestId: "r2",
      actor: "a",
      scope: "product",
      action: "UPDATE",
      risk: "LOW",
      payload,
      reason: "t",
      expiresAt: new Date(Date.now() + 60_000).toISOString(),
    });
    expect(rejectHumanApproval(req.approvalId, "b", "no").ok).toBe(true);
    const req2 = requestHumanApproval({
      requestId: "r3",
      actor: "a",
      scope: "product",
      action: "UPDATE",
      risk: "LOW",
      payload,
      reason: "t",
      expiresAt: new Date(Date.now() + 60_000).toISOString(),
    });
    approveHumanAction(req2.approvalId, "b", payload);
    expect(markApprovalExecuted(req2.approvalId).ok).toBe(true);
    expect(cancelHumanApproval(req2.approvalId, "a").ok).toBe(false);
  });
});
