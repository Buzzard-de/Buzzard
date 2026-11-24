import os from "node:os";
import path from "node:path";
import { mkdtempSync } from "node:fs";
import { createRequire } from "node:module";
import { describe, expect, it } from "vitest";

const tempRoot = mkdtempSync(path.join(os.tmpdir(), "buzzard-local-gaps-"));
process.env.BUZZARD_DB_PATH = path.join(tempRoot, "app.sqlite");
process.env.BUZZARD_DATA_DIR = path.join(tempRoot, "data");
process.env.BUZZARD_SALES_ENABLED = "0";

const require = createRequire(import.meta.url);
const { requestApproval, approvalInputHash } = require("../lib/buzzardNative/core/specialists/brandDraft");
const { dispatch } = require("../lib/buzzardNative/core/specialistDispatch");
const { executeReadOnly } = require("../lib/pusat/runtime");
const controlCenter = require("../lib/controlCenter");
const { db } = require("../lib/db");
const { createOrchestrator } = require("../lib/pusat/orchestrator");
const { tickScheduler } = require("../lib/jobScheduler");
const { isSalesEnabled } = require("../lib/salesMode");
const { capturePayment } = require("../lib/commerce/paymentService");

describe("local open gaps", () => {
  it("binds an approval request to the submitted input", () => {
    const input = { action: "BRAND_LIVE_PUBLISH", note: "dry" };
    const first = requestApproval({ actorId: "mira", action: input.action, input });
    const same = approvalInputHash({ actorId: "mira", action: input.action, input });
    const changed = approvalInputHash({ actorId: "mira", action: "OTHER", input });
    expect(first.code).toBe("HUMAN_GATE_REQUIRED");
    expect(first.livePublish).toBe(false);
    expect(first.inputHash).toBe(same);
    expect(first.inputHash).not.toBe(changed);

    const routed = dispatch({ agentId: "mira", kind: "APPROVAL_REQUEST", input });
    expect(routed.code).toBe("HUMAN_GATE_REQUIRED");
    expect(routed.live).toBe(false);
    expect(routed.result.inputHash).toBe(approvalInputHash({ actorId: "mira", action: input.action, input }));
  });

  it("expires a due admin approval and marks a denied Pusat write as not retryable", () => {
    const created = controlCenter.createApproval({ reason: "due", riskLevel: "HIGH" });
    expect(controlCenter.decideApproval(created.id, "approve", "operator@example.test").status).toBe("APPROVED");

    const due = controlCenter.createApproval({ reason: "past", riskLevel: "HIGH" });
    const closed = controlCenter.expireDue(Date.parse(due.metadata.expiresAt) + 1);
    expect(closed.expired).toBeGreaterThanOrEqual(1);
    expect(controlCenter.decideApproval(due.id, "approve", "operator@example.test")).toBeNull();
    expect(controlCenter.listApprovals("EXPIRED").some((row) => row.id === due.id)).toBe(true);

    const previous = process.env.PUSAT_RUNTIME_ENABLED;
    process.env.PUSAT_RUNTIME_ENABLED = "1";
    try {
      const denied = executeReadOnly("CAPTURE_PAYMENT", { amount: 1 }, { actorId: "pricing_ai" });
      expect(denied.code).toBe("PERMISSION_DENIED");
      expect(denied.retryable).toBe(false);
    } finally {
      if (previous === undefined) delete process.env.PUSAT_RUNTIME_ENABLED;
      else process.env.PUSAT_RUNTIME_ENABLED = previous;
    }
    expect(isSalesEnabled()).toBe(false);
    expect(capturePayment({ amount: 1, actorId: "local-gaps" }).code).toBe("PAYMENT_NOT_LIVE");
  });

  it("rejects a changed approval input at the decision and at execution", () => {
    const bound = controlCenter.createApproval({ reason: "bound", riskLevel: "HIGH" });
    db.prepare("UPDATE core_approvals SET reason = ? WHERE id = ?").run("changed", bound.id);
    expect(controlCenter.decideApproval(bound.id, "approve", "operator@example.test")).toBeNull();
    expect(controlCenter.listApprovals("PENDING").some((row) => row.id === bound.id)).toBe(true);

    const orch = createOrchestrator({ dbPath: path.join(tempRoot, "orch.sqlite") });
    orch.schedule({
      title: "brand gate",
      assigneeId: "mira",
      ownerId: "pusat",
      kind: "APPROVAL_REQUEST",
      input: { action: "BRAND_LIVE_PUBLISH", note: "dry" },
    });
    const gated = orch.tick({ limit: 1 });
    expect(gated.executed[0].status).toBe("GATED");
    const taskId = gated.executed[0].taskId;
    const pending = orch.approvals.pending();
    const task = orch.queue.get(taskId);
    orch.queue.setPayload(taskId, {
      ...task.payload,
      gateBound: {
        ...task.payload.gateBound,
        input: { ...task.payload.gateBound.input, note: "changed" },
      },
    });
    expect(orch.approvals.decide({ id: pending[0].id, approved: true, actorId: "human" }).code).toBe(
      "INPUT_HASH_MISMATCH"
    );
    expect(orch.approvals.pending().some((row) => row.id === pending[0].id)).toBe(true);

    orch.queue.setPayload(taskId, task.payload);
    expect(orch.approvals.decide({ id: pending[0].id, approved: true, actorId: "human" }).ok).toBe(true);
    const approved = orch.queue.get(taskId);
    orch.queue.setPayload(taskId, {
      ...approved.payload,
      input: { ...approved.payload.input, note: "changed" },
    });
    const executed = orch.tick({ limit: 1 });
    expect(executed.executed[0].code).toBe("INPUT_HASH_MISMATCH");
    expect(executed.executed[0].status).toBe("FAILED");
    orch.close();
  });

  it("expires due approvals from the scheduler tick", () => {
    const due = controlCenter.createApproval({ reason: "scheduler", riskLevel: "HIGH" });
    tickScheduler(new Date(Date.parse(due.metadata.expiresAt) + 1000));
    expect(controlCenter.listApprovals("EXPIRED").some((row) => row.id === due.id)).toBe(true);
    expect(isSalesEnabled()).toBe(false);
  });
});
