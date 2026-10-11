import { describe, it, expect, beforeAll } from "vitest";
import { createRequire } from "node:module";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const require = createRequire(import.meta.url);

describe("Pusat master completion A-Z", () => {
  let pusat;
  let db;
  let productCore;
  let productValidator;
  let jobQueue;

  beforeAll(() => {
    pusat = require("../lib/pusat");
    db = require("../lib/db").db;
    productCore = require("../lib/pim/productCore");
    productValidator = require("../lib/productValidator");
    jobQueue = require("../lib/jobQueue");
    pusat.initialize(db);
  });

  it("A-C lifecycle, idempotency, and correlation id", () => {
    const key = `master-idem-${Date.now()}`;
    const first = pusat.submitTask({
      title: "Master lifecycle",
      agentCode: "price_assistant",
      payload: { supplierCost: 9, salePrice: 19 },
      idempotencyKey: key,
      createdBy: "master-test",
      enqueue: false,
    });
    expect(first.task.id).toMatch(/^task_/);
    expect(first.task.correlationId).toMatch(/^corr_/);
    const second = pusat.submitTask({
      title: "Master lifecycle again",
      agentCode: "price_assistant",
      payload: { supplierCost: 9, salePrice: 19 },
      idempotencyKey: key,
      createdBy: "master-test",
      enqueue: false,
    });
    expect(second.duplicate).toBe(true);
    expect(second.task.id).toBe(first.task.id);
  });

  it("D timeout remains classified", async () => {
    const submitted = pusat.submitTask({
      title: "Master timeout",
      agentCode: "sales_assistant",
      payload: {},
      timeoutMs: 1,
      createdBy: "master-test",
      enqueue: false,
    });
    await new Promise((r) => setTimeout(r, 5));
    const result = await pusat.executeTask(submitted.task.id);
    expect(result.status).toBe("FAILED");
    expect(result.result.failureKind).toBe("TIMEOUT");
  });

  it("E-F memory persist, invalidate, and real process restart", () => {
    const written = pusat.memory.writeMemory({
      kind: "historical_record",
      subject: `master-mem-${Date.now()}`,
      content: { step: 1 },
      source: "master-test",
    });
    expect(written.ok).toBe(true);
    const invalidated = pusat.memory.invalidateMemory(written.record.id, { role: "admin" });
    expect(invalidated.ok).toBe(true);

    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "pusat-mem-"));
    const dbPath = path.join(dir, "isolated.db");
    const child = path.join(process.cwd(), "server/__tests__/helpers/pusatMemoryChild.cjs");
    const subject = `restart-${Date.now()}`;
    const env = { ...process.env, BUZZARD_DB_PATH: dbPath };
    const write = spawnSync(process.execPath, [child, "write", subject], { env, encoding: "utf8" });
    expect(write.status).toBe(0);
    const wrote = JSON.parse(write.stdout);
    const read = spawnSync(process.execPath, [child, "read", subject, wrote.id], { env, encoding: "utf8" });
    expect(read.status).toBe(0);
    const loaded = JSON.parse(read.stdout);
    expect(loaded.id).toBe(wrote.id);
    expect(loaded.content.marker).toBe("process-restart");
    expect(loaded.pid).not.toBe(wrote.pid);
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it("G-H Guardian enforcement and fail-closed secrets", () => {
    const denied = pusat.guardian.evaluate({
      agentId: "price_ai",
      employee: { id: "price_ai", status: "ACTIVE", permissions: ["ai.execute"] },
      action: "prices.update",
      payload: { sku: "1" },
      permissionsRequired: ["prices.update"],
    });
    expect(denied.allowed).toBe(false);
    const secrets = pusat.guardian.evaluate({
      agentId: "esat_bey",
      employee: { id: "esat_bey", status: "ACTIVE", permissions: ["ai.execute"] },
      action: "inspect",
      payload: { password: "nope" },
    });
    expect(secrets.allowed).toBe(false);
  });

  it("I-J approval input hash and duplicate", () => {
    const created = pusat.approval.requestApproval({
      requestingAgent: "price_ai",
      action: "prices.update",
      reason: "master",
      input: { sku: "M1", price: 1 },
    });
    const approved = pusat.approval.decide(created.id, "approve", "reviewer");
    expect(approved.approval.status).toBe("APPROVED");
    const dup = pusat.approval.decide(created.id, "approve", "reviewer");
    expect(dup.duplicate).toBe(true);
    expect(pusat.approval.assertBound(approved.approval, { sku: "M1", price: 2 }).ok).toBe(false);
  });

  it("K retry and dead-letter remain non-financial", () => {
    const financial = pusat.exceptions.classify(new Error("timeout"), { action: "payment.charge" });
    expect(financial.retryable).toBe(false);
    const recorded = pusat.exceptions.recordException({
      code: "PUSAT_UNKNOWN",
      taskId: "task_master_dlq",
      retryable: true,
      lastError: "flaky",
      maxRetries: 0,
    });
    const dead = pusat.exceptions.deadLetter(recorded.id, "limit");
    expect(dead.status).toBe("DEAD_LETTER");
  });

  it("L-M isolated claimAndExecute does not double-claim", async () => {
    const submitted = pusat.submitTask({
      title: "Claim isolation",
      agentCode: "sales_assistant",
      payload: {},
      createdBy: "master-test",
      enqueue: false,
    });
    const job = jobQueue.enqueueJob({
      jobType: "AI_TASK_ISOLATED",
      payload: { taskId: submitted.task.id, mock: true },
      createdBy: "master-test",
    });
    const first = jobQueue.claimNextJob("worker-a", 5000, { jobType: "AI_TASK_ISOLATED" });
    expect(first.id).toBe(job.id);
    const second = jobQueue.claimNextJob("worker-b", 5000, { jobType: "AI_TASK_ISOLATED" });
    if (second) expect(second.id).not.toBe(job.id);
    jobQueue.updateJob(job.id, { status: "COMPLETED", result: { isolated: true } });
  });

  it("N-O productCore.createProduct dry-run and ACTIVE rejected", () => {
    const dry = productCore.createProduct(
      { sku: `PUSAT-DRY-${Date.now()}`, title: "Dry", status: "DRAFT" },
      { dryRun: true, source: "AI" }
    );
    expect(dry.dryRun).toBe(true);
    expect(dry.written).toBe(false);
    expect(dry.status).toBe("DRAFT");
    expect(() =>
      productCore.createProduct({ sku: `PUSAT-ACT-${Date.now()}`, title: "Nope", status: "ACTIVE" }, { dryRun: true })
    ).toThrow(/ACTIVE/);
    const automation = pusat.automations.productCreation({
      sku: `PUSAT-AUTO-${Date.now()}`,
      title: "Auto product",
      activate: true,
    });
    expect(automation.written).toBe(false);
    expect(automation.productCore.written).toBe(false);
    expect(automation.activation.allowed).toBe(false);
  });

  it("P validateCustoms fail-closed on missing inputs", () => {
    const blocked = productValidator.validateCustomsDecision({});
    expect(blocked.ok).toBe(false);
    expect(blocked.failClosed).toBe(true);
    expect(blocked.legalClaim).toBe(false);
    const customs = pusat.automations.customsAutomation({ name: "Pad" });
    expect(customs.failClosed).toBe(true);
    expect(customs.legalClaim).toBe(false);
  });

  it("Q supplier mock is not live", () => {
    const result = pusat.agents.runSupplierAssistant({ supplierId: "mock" });
    expect(result.live).toBe(false);
    expect(result.mock).toBe(true);
  });

  it("R order/PO draft is not sent", () => {
    const result = pusat.automations.orderAutomation({
      paymentStatus: "paid",
      shippingAddress: "x",
      customerId: "c1",
    });
    expect(result.purchaseOrder.submitted).toBe(false);
    expect(result.purchaseOrder.distinctFromSend).toBe(true);
    expect(result.realSupplierOrder).toBe(false);
    expect(result.salesLocked).toBe(true);
  });

  it("S payment/refund duplicate protection", () => {
    const key = `pay-${Date.now()}`;
    const first = pusat.integrations.paymentSafety({ amount: 10, idempotencyKey: key, kind: "refund" });
    expect(first.realMoneyMovement).toBe(false);
    expect(first.retryable).toBe(false);
    const second = pusat.integrations.paymentSafety({ amount: 10, idempotencyKey: key, kind: "refund" });
    expect(second.duplicate).toBe(true);
    expect(second.retried).toBe(false);
  });

  it("T customer assistant does not send", () => {
    const draft = pusat.agents.runCustomerAssistant({ message: "Where is my order?" });
    expect(draft.invented).toBe(false);
    const send = pusat.integrations.customerSend({ message: "hi" });
    expect(send.sent).toBe(false);
    expect(send.blocked).toBe(true);
  });

  it("U marketplace mock connector does not publish", () => {
    const listing = pusat.integrations.marketplaceDraft({ channel: "amazon", sku: "X" });
    expect(listing.published).toBe(false);
    expect(listing.live).toBe(false);
    expect(listing.listing.status).toBe("DRAFT");
  });

  it("V provider adapter errors stay fail-closed and redacted", async () => {
    const { executeWithProvider, redact, classifyProviderError, PROVIDERS } = require("../lib/aiProviders");
    const stub = await executeWithProvider({ provider: PROVIDERS.STUB, prompt: "hi" });
    expect(stub.ok).toBe(true);
    expect(stub.live).toBe(false);
    const missing = await executeWithProvider({ provider: PROVIDERS.OPENAI, prompt: "hi" });
    expect(missing.ok).toBe(false);
    expect(missing.error).toBe("provider_not_configured");
    expect(redact("key=sk-abcdefghijklmnopqrstuvwxyz")).toContain("[redacted]");
    expect(classifyProviderError(new Error("401 unauthorized")).retryable).toBe(false);
  });

  it("W-X sales lock and unauthorized tasks remain blocked", async () => {
    expect(require("../lib/salesMode").isSalesEnabled()).toBe(false);
    expect(process.env.BUZZARD_SALES_ENABLED).not.toBe("1");
    expect(() =>
      pusat.submitTask({
        title: "Unauthorized prices update",
        employeeId: "seo_ai",
        agentCode: "seo_assistant",
        permissionsRequired: ["prices.update"],
        payload: { title: "x", action: "prices.update" },
        createdBy: "master-test",
        enqueue: false,
      })
    ).toThrow(/Permission denied/);
  });

  it("Y health and reports do not leak secrets", async () => {
    const health = await pusat.getHealth();
    const report = pusat.report();
    const blob = JSON.stringify({ health, report });
    expect(blob).not.toMatch(/sk-|api[_-]?key|BEGIN PRIVATE/i);
    expect(report.provider.liveVerified).toBe(false);
    expect(report.blockedIntegrations).toContain("llm_live");
  });

  it("Z shipping estimate is not GPS and worker health is visible", () => {
    const ship = pusat.integrations.shippingLookup({ country: "DE" });
    expect(ship.shipmentCreated).toBe(false);
    expect(ship.location.gpsInvented).toBe(false);
    expect(pusat.worker.health().ok).toBe(true);
  });
});
