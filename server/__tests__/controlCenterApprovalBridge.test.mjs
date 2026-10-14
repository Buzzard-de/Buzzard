import { describe, it, expect } from "vitest";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

describe("Human Approval Center control-center bridge", () => {
  it("creates bound approvals with hash, expiry, and required approver", () => {
    const controlCenter = require("../lib/controlCenter.js");
    const created = controlCenter.createApproval({
      taskId: null,
      resourceType: "ai_task",
      resourceId: "task_bridge_test",
      reason: "Bound approval from control center",
      riskLevel: "HIGH",
      financialImpact: { currency: "EUR", amount: 0, live: false },
    });
    expect(created.status).toBe("PENDING");
    expect(created.inputHash).toBeTruthy();
    expect(created.expiresAt).toBeTruthy();
    expect(created.requiredApprover).toBe("admin");
    expect(created.financialImpact).toEqual({ currency: "EUR", amount: 0, live: false });

    const listed = controlCenter.listApprovals("PENDING");
    expect(listed.some((row) => row.id === created.id)).toBe(true);

    const decided = controlCenter.decideApproval(created.id, "approve", "reviewer@test");
    expect(decided.status).toBe("APPROVED");
  });

  it("does not approve when material inputs change", () => {
    const controlCenter = require("../lib/controlCenter.js");
    const created = controlCenter.createApproval({
      reason: "Change bind",
      input: { sku: "BR-1", qty: 1 },
    });
    const changed = require("../lib/pusat").approval.decide(created.id, "approve", "reviewer@test", {
      currentInput: { sku: "BR-1", qty: 99 },
    });
    expect(changed.inputChanged).toBe(true);
    expect(changed.approval.status).toBe("CANCELLED");
  });
});
