import { describe, it, expect, beforeAll } from "vitest";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

describe("Pusat approval center", () => {
  let pusat;

  beforeAll(() => {
    pusat = require("../lib/pusat");
    pusat.initialize(require("../lib/db").db);
  });

  it("approves and rejects bound requests", () => {
    const input = { sku: "APPR-1", qty: 1 };
    const created = pusat.approval.requestApproval({
      requestingAgent: "price_ai",
      action: "prices.update",
      reason: "Adjust list price",
      input,
      expectedSideEffects: ["update price row"],
      riskLevel: "HIGH",
    });
    expect(created.status).toBe("PENDING");
    expect(created.inputHash).toBeTruthy();
    expect(created.expiresAt).toBeTruthy();
    expect(created.requiredApprover).toBe("admin");
    expect(created.financialImpact).toBeNull();

    const approved = pusat.approval.decide(created.id, "approve", "reviewer@test");
    expect(approved.approval.status).toBe("APPROVED");
    expect(pusat.approval.assertBound(approved.approval, input).ok).toBe(true);

    const rejectedReq = pusat.approval.requestApproval({
      requestingAgent: "price_ai",
      action: "prices.update",
      reason: "Reject me",
      input: { sku: "APPR-2" },
    });
    const rejected = pusat.approval.decide(rejectedReq.id, "reject", "reviewer@test");
    expect(rejected.approval.status).toBe("REJECTED");
  });

  it("expires pending approvals and treats a second decide as duplicate", () => {
    const created = pusat.approval.requestApproval({
      requestingAgent: "order_ai",
      action: "order.create",
      reason: "Expire me",
      input: { n: 1 },
      ttlMs: 60_000,
    });
    require("../lib/db").db.prepare(
      "UPDATE core_approvals SET expires_at = ? WHERE id = ?"
    ).run(new Date(Date.now() - 1000).toISOString(), created.id);
    const expired = pusat.approval.decide(created.id, "approve", "reviewer@test");
    expect(expired.expired || expired.approval.status === "EXPIRED").toBe(true);

    const again = pusat.approval.decide(created.id, "approve", "reviewer@test");
    expect(again.duplicate || again.expired).toBe(true);
  });

  it("refuses AI self-approval and missing approver identity", () => {
    const created = pusat.approval.requestApproval({
      requestingAgent: "price_ai",
      action: "prices.update",
      reason: "Self approve",
      input: { sku: "APPR-SELF" },
    });
    const self = pusat.approval.decide(created.id, "approve", "price_ai");
    expect(self.rejected).toBe(true);
    expect(self.code).toBe("ai_cannot_self_approve");
    expect(self.approval.status).toBe("PENDING");

    const missing = pusat.approval.decide(created.id, "approve", "");
    expect(missing.rejected).toBe(true);
    expect(missing.code).toBe("approver_identity_required");
    expect(missing.approval.status).toBe("PENDING");

    const human = pusat.approval.decide(created.id, "approve", "reviewer@test");
    expect(human.approval.status).toBe("APPROVED");
  });

  it("rejects named AI actors as approvers without mutating the pending record", () => {
    for (const actor of ["pusat", "guardian", "AI", "orchestrator", "esat_bey"]) {
      const created = pusat.approval.requestApproval({
        requestingAgent: "price_ai",
        action: "prices.update",
        reason: `Reject ${actor}`,
        input: { sku: `APPR-${actor}` },
      });
      const decided = pusat.approval.decide(created.id, "approve", actor);
      expect(decided.rejected).toBe(true);
      expect(decided.code).toBe("ai_cannot_self_approve");
      expect(decided.approval.status).toBe("PENDING");
    }
  });

  it("cancels approval when material inputs change", () => {
    const created = pusat.approval.requestApproval({
      requestingAgent: "price_ai",
      action: "prices.update",
      reason: "Hash bind",
      input: { sku: "APPR-CHANGE", price: 10 },
    });
    const changed = pusat.approval.decide(created.id, "approve", "reviewer@test", {
      currentInput: { sku: "APPR-CHANGE", price: 99 },
    });
    expect(changed.inputChanged).toBe(true);
    expect(changed.approval.status).toBe("CANCELLED");
  });
});

describe("Pusat exceptions and retries", () => {
  let pusat;

  beforeAll(() => {
    pusat = require("../lib/pusat");
  });

  it("does not retry payments or other sensitive side effects", () => {
    const classified = pusat.exceptions.classify(new Error("provider blip"), { action: "payment.refund" });
    expect(classified.retryable).toBe(false);
    expect(classified.sensitive).toBe(true);
  });

  it("retries unknown non-sensitive failures with backoff, then dead-letters", () => {
    const recorded = pusat.exceptions.recordException({
      code: "PUSAT_UNKNOWN",
      taskId: "task_exc_retry",
      correlationId: "corr_exc",
      retryable: true,
      lastError: "flaky",
      maxRetries: 1,
    });
    const first = pusat.exceptions.shouldRetry(recorded);
    expect(first.retry).toBe(true);
    expect(first.delayMs).toBeGreaterThan(0);
    pusat.exceptions.markRetry(recorded.id);
    const after = pusat.exceptions.getException(recorded.id);
    expect(pusat.exceptions.shouldRetry(after).retry).toBe(false);
    const dead = pusat.exceptions.deadLetter(recorded.id, "retry_limit");
    expect(dead.status).toBe("DEAD_LETTER");
  });

  it("records structured exception details", () => {
    const handled = pusat.exceptions.handleFailure(new Error("Permission denied for tool"), {
      taskId: "task_exc_perm",
      correlationId: "corr_perm",
      action: "prices.update",
    });
    expect(handled.classified.code).toBe("PUSAT_PERMISSION_DENIED");
    expect(handled.exception.taskId).toBe("task_exc_perm");
    expect(handled.retry.retry).toBe(false);
  });
});
