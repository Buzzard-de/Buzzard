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
const { createApprovalCenter } = require("../lib/pusat/humanApproval");
const { tickScheduler, startSchedulerLoop, stopSchedulerLoop, createSchedule, SCHEDULE_TYPE } = require("../lib/jobScheduler");
const { assertApprovedForExecution } = require("../lib/controlCenterJobAdmission");
const { isSalesEnabled } = require("../lib/salesMode");
const orderService = require("../lib/commerce/orderService");
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

    const swapped = createOrchestrator({ dbPath: path.join(tempRoot, "orch-swap.sqlite") });
    swapped.schedule({
      title: "brand gate",
      assigneeId: "mira",
      ownerId: "pusat",
      kind: "APPROVAL_REQUEST",
      input: { action: "BRAND_LIVE_PUBLISH", note: "dry" },
    });
    const swappedGate = swapped.tick({ limit: 1 });
    const swappedId = swappedGate.executed[0].taskId;
    const swappedTask = swapped.queue.get(swappedId);
    const swappedInput = { ...swappedTask.payload.input, note: "swapped" };
    swapped.queue.setPayload(swappedId, {
      ...swappedTask.payload,
      input: swappedInput,
      gateInputHash: approvalInputHash({ actorId: "mira", action: swappedInput.action, input: swappedInput }),
      gateBound: { actorId: "mira", action: swappedInput.action, input: swappedInput },
    });
    const center = createApprovalCenter({ dbPath: path.join(tempRoot, "orch-swap.sqlite") });
    expect(center.decide({ id: swapped.approvals.pending()[0].id, approved: true, actorId: "human" }).code).toBe(
      "INPUT_HASH_MISMATCH"
    );
    expect(swapped.executeTask(swapped.queue.get(swappedId)).code).toBe("INPUT_HASH_MISMATCH");
    center.close();
    swapped.close();

    const job = controlCenter.createApproval({
      resourceType: "background_job",
      resourceId: "job-1",
      reason: "scheduler NOTIFICATION",
      riskLevel: "MEDIUM",
      metadata: {
        origin: "scheduler",
        spec: {
          jobType: "NOTIFICATION",
          priority: "NORMAL",
          maxRetries: 3,
          payload: { note: "dry" },
          source: "scheduler",
          actor: "synthetic",
          scheduleId: null,
        },
      },
    }, { trustMetadata: true });
    const brokenSpec = { ...job.metadata, spec: { ...job.metadata.spec, payload: { note: "changed" } } };
    db.prepare("UPDATE core_approvals SET metadata_json = ? WHERE id = ?").run(JSON.stringify(brokenSpec), job.id);
    expect(controlCenter.decideApproval(job.id, "approve", "operator@example.test")).toBeNull();
    expect(isSalesEnabled()).toBe(false);
  });

  it("keeps a human gate without a hash blocked and rejects a changed job payload", () => {
    const orch = createOrchestrator({ dbPath: path.join(tempRoot, "orch-stock.sqlite") });
    orch.schedule({ title: "buy", assigneeId: "stock_ai", ownerId: "pusat", kind: "STOCK_BUY" });
    const gated = orch.tick({ limit: 1 });
    expect(gated.executed[0].status).toBe("GATED");
    expect(gated.executed[0].code).toBeUndefined();
    expect(orch.queue.get(gated.executed[0].taskId).state).toBe("BLOCKED_APPROVAL");
    expect(orch.approvals.pending()[0].payload.inputHash).toBeUndefined();
    orch.close();

    const job = controlCenter.createApproval({
      resourceType: "background_job",
      resourceId: "job-2",
      reason: "scheduler NOTIFICATION",
      riskLevel: "MEDIUM",
      metadata: {
        origin: "scheduler",
        spec: {
          jobType: "NOTIFICATION",
          priority: "NORMAL",
          maxRetries: 3,
          payload: { note: "dry" },
          source: "scheduler",
          actor: "synthetic",
          scheduleId: null,
        },
      },
    }, { trustMetadata: true });
    const approved = controlCenter.decideApproval(job.id, "approve", "operator@example.test");
    expect(approved?.status).toBe("APPROVED");
    approved.metadata.jobId = "job-2";
    db.prepare("UPDATE core_approvals SET metadata_json = ? WHERE id = ?").run(JSON.stringify(approved.metadata), job.id);
    const load = (id) => controlCenter.listApprovals().find((row) => row.id === id);
    const changed = assertApprovedForExecution(
      {
        id: "job-2",
        jobType: "NOTIFICATION",
        payload: { note: "changed", dryRun: true, origin: "scheduler", approvalId: job.id },
      },
      load
    );
    expect(changed.code).toBe("INPUT_HASH_MISMATCH");
    const same = assertApprovedForExecution(
      {
        id: "job-2",
        jobType: "NOTIFICATION",
        payload: { note: "dry", dryRun: true, origin: "scheduler", approvalId: job.id },
      },
      load
    );
    expect(same.ok).toBe(true);
  });

  it("expires due approvals from the scheduler tick", () => {
    const due = controlCenter.createApproval({ reason: "scheduler", riskLevel: "HIGH" });
    tickScheduler(new Date(Date.parse(due.metadata.expiresAt) + 1000));
    expect(controlCenter.listApprovals("EXPIRED").some((row) => row.id === due.id)).toBe(true);
    expect(isSalesEnabled()).toBe(false);
  });

  it("keeps later schedules running when expiry or one job throws", () => {
    const admission = require("../lib/controlCenterJobAdmission");
    const originalExpire = controlCenter.expireDue;
    const originalAdmit = admission.admitBackgroundJob;
    const bad = createSchedule({
      name: "bad-tick",
      jobType: "NOTIFICATION",
      scheduleType: SCHEDULE_TYPE.ONE_TIME,
      nextRunAt: new Date(Date.now() - 10_000).toISOString(),
      createdBy: "synthetic-scheduler@example.test",
    });
    const good = createSchedule({
      name: "good-tick",
      jobType: "NOTIFICATION",
      scheduleType: SCHEDULE_TYPE.ONE_TIME,
      nextRunAt: new Date(Date.now() - 5_000).toISOString(),
      createdBy: "synthetic-scheduler@example.test",
    });
    controlCenter.expireDue = () => {
      throw new Error("expiry-down");
    };
    admission.admitBackgroundJob = (input) => {
      if (input.resourceId === bad.id) throw new Error("job-down");
      return originalAdmit(input);
    };
    try {
      const admitted = tickScheduler();
      expect(admitted.some((row) => row.code === "SCHEDULE_TICK_FAILED" && row.scheduleId === bad.id)).toBe(true);
      expect(admitted.some((row) => row.approval?.resourceId === good.id && row.pendingApproval === true)).toBe(true);
    } finally {
      controlCenter.expireDue = originalExpire;
      admission.admitBackgroundJob = originalAdmit;
    }
  });

  it("reports an expired approval while the worker is off", () => {
    expect(process.env.BUZZARD_WORKER_ENABLED).not.toBe("1");
    const due = controlCenter.createApproval({ reason: "worker-off", riskLevel: "HIGH" });
    const metadata = { ...due.metadata, expiresAt: new Date(Date.now() - 1000).toISOString() };
    db.prepare("UPDATE core_approvals SET metadata_json = ? WHERE id = ?").run(JSON.stringify(metadata), due.id);
    expect(controlCenter.listApprovals("EXPIRED").some((row) => row.id === due.id)).toBe(true);
    expect(db.prepare("SELECT status FROM core_approvals WHERE id = ?").get(due.id).status).toBe("EXPIRED");
    expect(startSchedulerLoop().code).toBe("WORKER_DISABLED");
  });

  it("runs approval expiry on the worker interval", async () => {
    process.env.BUZZARD_WORKER_ENABLED = "1";
    const due = controlCenter.createApproval({ reason: "worker-on", riskLevel: "HIGH" });
    const metadata = { ...due.metadata, expiresAt: new Date(Date.now() - 1000).toISOString() };
    db.prepare("UPDATE core_approvals SET metadata_json = ? WHERE id = ?").run(JSON.stringify(metadata), due.id);
    const original = controlCenter.expireDue;
    let calls = 0;
    controlCenter.expireDue = (now) => {
      calls += 1;
      return original(now);
    };
    const loop = startSchedulerLoop({ pollMs: 30 });
    try {
      expect(loop.started).toBe(true);
      await new Promise((resolve) => setTimeout(resolve, 250));
      expect(calls).toBeGreaterThanOrEqual(2);
      expect(db.prepare("SELECT status FROM core_approvals WHERE id = ?").get(due.id).status).toBe("EXPIRED");
    } finally {
      stopSchedulerLoop();
      controlCenter.expireDue = original;
      process.env.BUZZARD_WORKER_ENABLED = "0";
    }
    expect(isSalesEnabled()).toBe(false);
  });

  it("refuses another customer's cart when creating an order", () => {
    db.prepare(`
      INSERT INTO commerce_carts(id, customer_id, country, currency, status, expires_at)
      VALUES ('cart-owner-a', 'customer-a', 'DE', 'EUR', 'active', datetime('now', '+1 day'))
    `).run();
    const before = db.prepare("SELECT COUNT(*) AS n FROM commerce_orders").get().n;
    const denied = orderService.createOrderFromCheckout({
      checkout: {
        id: "chk-cross",
        cartId: "cart-owner-a",
        customerId: "customer-b",
        totals: { currency: "EUR", total: 0 },
      },
      payment: { dryRun: true },
      orderType: "DRY_RUN",
    });
    expect(denied.code).toBe("idor_denied");
    expect(denied.blocked).toBe(true);
    expect(db.prepare("SELECT COUNT(*) AS n FROM commerce_orders").get().n).toBe(before);
    expect(isSalesEnabled()).toBe(false);
  });
});
