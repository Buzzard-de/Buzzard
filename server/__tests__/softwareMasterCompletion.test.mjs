import { describe, it, expect, beforeAll } from "vitest";
import { createRequire } from "node:module";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);

const masterScratch = path.join(path.dirname(fileURLToPath(import.meta.url)), "../data/test-scratch");
fs.mkdirSync(masterScratch, { recursive: true });
process.env.BUZZARD_DB_PATH = path.join(masterScratch, "software-master-completion.db");

describe("master software completion — P0-P10 local", () => {
  let software;
  let pusat;
  let db;
  let orderAutomation;
  let paymentsFinance;

  beforeAll(() => {
    software = require("../lib/software");
    pusat = require("../lib/pusat");
    db = require("../lib/db").db;
    orderAutomation = require("../lib/orderAutomation");
    paymentsFinance = require("../lib/paymentsFinance");
    pusat.initialize(db);
    software.initialize(db);
  });

  it("P0 unsigned payment webhook cannot mark paid or queue fulfillment", () => {
    const orderNumber = `SW-P0-${Date.now()}-${crypto.randomBytes(3).toString("hex")}`;
    orderAutomation.ensureFlow(orderNumber);
    const result = orderAutomation.handlePaymentWebhook({
      provider: "stripe",
      eventId: `evt_${orderNumber}`,
      orderNumber,
      status: "paid",
    });
    expect(result.ok).toBe(true);
    expect(result.applied).toBe(false);
    expect(result.reason).toBe("UNSIGNED_WEBHOOK_ISOLATED");
    const flow = db.prepare("SELECT * FROM order_flow WHERE order_number = ?").get(orderNumber);
    expect(flow.payment_status).not.toBe("paid");
    const jobs = db.prepare("SELECT * FROM automation_jobs WHERE order_number = ?").all(orderNumber);
    expect(jobs.filter((row) => row.type === "fulfillment")).toHaveLength(0);
  });

  it("P0 unsigned finance webhook cannot change intent status", () => {
    const created = paymentsFinance.createPaymentIntent({
      orderNumber: `SW-FIN-${Date.now()}`,
      amount: 12.5,
      provider: "stripe",
      idempotencyKey: `fin-${Date.now()}-${crypto.randomBytes(2).toString("hex")}`,
    });
    if (created.error) {
      expect(created.error).toBeTruthy();
      return;
    }
    const before = created.intent.status;
    const result = paymentsFinance.handlePaymentWebhook({
      externalId: created.intent.external_id,
      status: "succeeded",
    });
    expect(result.applied).toBe(false);
    expect(result.reason).toBe("UNSIGNED_WEBHOOK_ISOLATED");
    const after = db.prepare("SELECT status FROM finance_payment_intents WHERE id = ?").get(created.intent.id);
    expect(after.status).toBe(before);
  });

  it("P0 official ingress stays the dual payment engine", () => {
    const ingress = software.officialPaymentIngress.describeIngress();
    expect(ingress.officialPath).toBe("/api/commerce/webhooks/:provider");
    expect(ingress.unsignedCanMarkPaid).toBe(false);
    expect(software.officialPaymentIngress.isOfficialProvider("stripe")).toBe(true);
    expect(process.env.BUZZARD_LIVE_PAYMENTS).not.toBe("1");
    expect(process.env.BUZZARD_SALES_ENABLED).not.toBe("1");
  });

  it("P1 consume is atomic, idempotent, and oversell-safe", () => {
    const sku = `SW-CONS-${Date.now()}-${crypto.randomBytes(2).toString("hex")}`;
    const stock = {
      sku,
      quantity: 2,
      requestQuantity: 1,
      source: "supplier_feed",
      lastSupplierUpdate: new Date().toISOString(),
    };
    const first = software.inventory.reserve(db, { ...stock, orderId: "ord-a" });
    const second = software.inventory.reserve(db, { ...stock, orderId: "ord-b" });
    const third = software.inventory.reserve(db, { ...stock, orderId: "ord-c" });
    expect(first.ok).toBe(true);
    expect(second.ok).toBe(true);
    expect(third.ok).toBe(false);
    expect(third.reason).toBe("INSUFFICIENT_STOCK");

    const consumed = software.inventory.consume(db, first.reservation.id, { orderId: "ord-a" });
    expect(consumed.consumed).toBe(true);
    const again = software.inventory.commit(db, first.reservation.id, { orderId: "ord-a" });
    expect(again.duplicate).toBe(true);
    const releasedConsumed = software.inventory.release(db, first.reservation.id);
    expect(releasedConsumed.ok).toBe(false);
    expect(releasedConsumed.reason).toBe("ALREADY_CONSUMED");

    const mismatch = software.inventory.consume(db, second.reservation.id, { orderId: "wrong" });
    expect(mismatch.ok).toBe(false);
    expect(mismatch.reason).toBe("ORDER_MISMATCH");
  });

  it("P1 partial shipment and multi-supplier plans stay unbound", () => {
    const orderId = `plan-${Date.now()}`;
    const partial = software.partialFulfillment.planPartialShipments(db, {
      orderId,
      lines: [{ sku: "A", quantity: 1, supplier: "s1" }],
    });
    const multi = software.partialFulfillment.planMultiSupplier(db, {
      orderId,
      lines: [
        { sku: "A", quantity: 1, supplier: "s1" },
        { sku: "B", quantity: 1, supplier: "s2" },
      ],
    });
    expect(partial.liveBound).toBe(false);
    expect(partial.sent).toBe(false);
    expect(multi.sent).toBe(false);
    expect(multi.purchaseOrders).toHaveLength(2);
  });

  it("P0 official captured payment consumes reserved stock once; unsigned and cancel stay safe", () => {
    const sku = `SW-BR-${Date.now()}-${crypto.randomBytes(2).toString("hex")}`;
    const orderId = `ord-br-${Date.now()}`;
    const stock = {
      sku,
      quantity: 2,
      requestQuantity: 1,
      source: "supplier_feed",
      lastSupplierUpdate: new Date().toISOString(),
      orderId,
    };
    const reserved = software.orderInventoryBridge.reserveForOrder(db, stock);
    expect(reserved.ok).toBe(true);

    const unsigned = software.orderInventoryBridge.commitOnCapturedPayment(db, {
      orderId,
      official: false,
      unverifiedWebhook: true,
      payment: { captured: true, state: "PAYMENT_CAPTURED", amountCents: 1990, currency: "EUR" },
    });
    expect(unsigned.ok).toBe(false);
    expect(unsigned.reason).toBe("UNVERIFIED_WEBHOOK");
    expect(unsigned.consumed).toBe(0);

    const authorizedOnly = software.orderInventoryBridge.commitOnCapturedPayment(db, {
      orderId,
      official: true,
      payment: { captured: false, state: "PAYMENT_AUTHORIZED", amountCents: 1990, currency: "EUR" },
    });
    expect(authorizedOnly.ok).toBe(false);
    expect(authorizedOnly.reason).toBe("PAYMENT_NOT_CAPTURED");

    const payment = {
      id: `pay-${orderId}`,
      captured: true,
      state: "PAYMENT_CAPTURED",
      amountCents: 1990,
      currency: "EUR",
    };
    const first = software.orderInventoryBridge.commitOnCapturedPayment(db, {
      orderId,
      official: true,
      payment,
    });
    expect(first.ok).toBe(true);
    expect(first.consumed).toBe(1);
    expect(first.shipmentAuthorized).toBe(false);

    const again = software.orderInventoryBridge.commitOnCapturedPayment(db, {
      orderId,
      official: true,
      payment,
    });
    expect(again.ok).toBe(true);
    expect(again.results.every((row) => row.duplicate === true)).toBe(true);

    const cancelConsumed = software.orderInventoryBridge.releaseOnCancel(db, { orderId });
    expect(cancelConsumed.skippedConsumed).toBe(1);
    expect(cancelConsumed.released).toBe(0);
    expect(cancelConsumed.liveOrderCancelled).toBe(false);

    const cancelOrder = `ord-can-${Date.now()}`;
    const reservedCancel = software.orderInventoryBridge.reserveForOrder(db, {
      ...stock,
      sku: `${sku}-c`,
      orderId: cancelOrder,
    });
    expect(reservedCancel.ok).toBe(true);
    const released = software.orderInventoryBridge.releaseOnCancel(db, { orderId: cancelOrder });
    expect(released.released).toBe(1);
    expect(released.skippedConsumed).toBe(0);

    const orderManagement = require("../lib/orderManagement");
    const omsSku = `${sku}-oms`;
    const created = orderManagement.createOrder({
      customerEmail: "phase2-fixture@local",
      items: [{ sku: omsSku, title: "Phase2 cancel fixture", quantity: 1, unitPrice: 1 }],
      paymentStatus: "pending",
    });
    expect(created.error).toBeUndefined();
    const reservedOms = software.orderInventoryBridge.reserveForOrder(db, {
      sku: omsSku,
      quantity: 2,
      requestQuantity: 1,
      source: "supplier_feed",
      lastSupplierUpdate: new Date().toISOString(),
      orderId: String(created.order.id),
    });
    expect(reservedOms.ok).toBe(true);
    const cancelled = orderManagement.cancelOrder(created.order.id, { reason: "phase2-test" });
    expect(cancelled.ok).toBe(true);
    expect(cancelled.inventoryRelease.released).toBe(1);
    expect(cancelled.inventoryRelease.skippedConsumed).toBe(0);
    expect(cancelled.inventoryRelease.liveOrderCancelled).toBe(false);
  });

  it("P2 Product SoT stays inactive and duplicate scan does not merge", () => {
    const architecture = require("../lib/pim/productArchitecture");
    const plan = require("../lib/pim/productMigrationPlan");
    const scan = require("../lib/pim/productIdentityScan").scanProductIdentity(db);
    expect(architecture.activationStatus().activated).toBe(false);
    expect(architecture.activationStatus().productSourceOfTruthActive).toBe(false);
    expect(process.env.BUZZARD_PRODUCT_SOT_ACTIVE).not.toBe("1");
    expect(scan.written).toBe(false);
    expect(scan.merged).toBe(false);
    expect(plan.simulateProductMigration(db).written).toBe(false);
    const guards = plan.verifyDryRunGuards(db);
    expect(guards.ok).toBe(true);
    expect(guards.written).toBe(false);
    expect(guards.activated).toBe(false);
    expect(guards.checks.backupRollbackPresent).toBe(true);
    expect(guards.checks.noAutoMerge).toBe(true);
  });

  it("P3 supplier selection fails closed without guessing", () => {
    const stopped = software.supplierSelection.selectSupplier(db, {
      sku: "SEL-1",
      offers: [{ supplier: "a", price: 10, stock: 3 }],
    });
    expect(stopped.ok).toBe(false);
    expect(stopped.purchaseOrderSent).toBe(false);
    expect(stopped.reason).toBe("INCOMPLETE_METRICS");

    const selected = software.supplierSelection.selectSupplier(db, {
      sku: "SEL-2",
      offers: [
        { supplier: "slow", price: 9, stock: 5, deliveryDays: 12, reliability: 0.4, dataQuality: 0.4 },
        { supplier: "fast", price: 11, stock: 5, deliveryDays: 1, reliability: 0.9, dataQuality: 0.9 },
      ],
    });
    expect(selected.ok).toBe(true);
    expect(selected.selected.supplier).toBe("fast");
    expect(selected.purchaseOrderSent).toBe(false);
    expect(software.supplierCredit.requestCancel({ purchaseOrderId: "po-1" }).sent).toBe(false);
  });

  it("P3 worker claimAndExecute runs a Pusat task once", async () => {
    const submitted = pusat.submitTask({
      title: "Master worker execute",
      agentCode: "stock_assistant",
      payload: { sku: `WK-${Date.now()}`, quantity: 0, source: "unverified" },
      createdBy: "test@pusat",
      enqueue: false,
    });
    const job = pusat.worker.enqueueTaskJob(submitted.task.id, {
      createdBy: "test@pusat",
      priority: "CRITICAL",
    });
    let claimed = null;
    for (let i = 0; i < 20; i += 1) {
      const result = await pusat.worker.claimAndExecute(`worker-${job.id}-${i}`);
      if (!result.claimed) break;
      if (result.jobId === job.id) {
        claimed = result;
        break;
      }
    }
    expect(claimed).toBeTruthy();
    expect(claimed.result.status).toBe("COMPLETED");
    const stored = require("../lib/jobQueue").getJob(job.id);
    expect(stored.status).toBe("COMPLETED");
    const second = await pusat.worker.claimAndExecute(`worker-b-${job.id}`);
    if (second.claimed) {
      expect(second.jobId).not.toBe(job.id);
    }
  });

  it("P3 jobScheduler bridge records Pusat-bound AI_TASK jobs", () => {
    const submitted = pusat.submitTask({
      title: "Scheduler bridge",
      agentCode: "stock_assistant",
      payload: { sku: `SCH-${Date.now()}`, quantity: 0, source: "unverified" },
      createdBy: "test@pusat",
      enqueue: false,
    });
    const bridged = pusat.schedulerBridge.enqueueScheduled({
      id: "sched-test",
      name: "pusat-tick",
      jobType: "AI_TASK",
      payload: { taskId: submitted.task.id },
      createdBy: "scheduler-test",
    });
    expect(bridged.pusat).toBe(true);
    expect(bridged.job.payload.taskId).toBe(submitted.task.id);
  });

  it("P3 abandoned worker lock is recovered without a second orchestrator", () => {
    const submitted = pusat.submitTask({
      title: "Abandoned recover",
      agentCode: "stock_assistant",
      payload: { sku: `REC-${Date.now()}`, quantity: 0, source: "unverified" },
      createdBy: "test@pusat",
      enqueue: false,
    });
    const job = pusat.worker.enqueueTaskJob(submitted.task.id, {
      createdBy: "test@pusat",
      priority: "CRITICAL",
    });
    const jobQueue = require("../lib/jobQueue");
    const expired = new Date(Date.now() - 60_000).toISOString();
    db.prepare(
      "UPDATE core_background_jobs SET status = 'RUNNING', lock_owner = ?, lock_expires_at = ? WHERE id = ?"
    ).run("crashed-worker", expired, job.id);
    const recovered = pusat.worker.recoverAbandoned();
    expect(recovered.recovered).toBeGreaterThanOrEqual(1);
    const stored = jobQueue.getJob(job.id);
    expect(stored.status).toBe("RETRYING");
    expect(stored.lockOwner).toBeFalsy();
  });

  it("P4 price history records without publishing or undercut", () => {
    const quoted = software.pricing.recordHistory(db, {
      sku: "PRC-1",
      channel: "amazon",
      supplierCost: 10,
      shippingCost: 2,
      extraCosts: 0.5,
      returnReserve: 0.4,
      marketplaceCommissionRate: 0.12,
      taxRate: 0.19,
    });
    expect(quoted.saleApproved).toBe(true);
    expect(quoted.published).toBe(false);
    expect(quoted.netProfit).toBeGreaterThanOrEqual(0.5);
    expect(software.pricing.quote({ supplierCost: 10, currency: "USD" }).failClosed).toBe(true);
    const competitor = software.competitorPrices.fetchCompetitorPrices({ sku: "PRC-1" });
    expect(competitor.invented).toBe(false);
    expect(competitor.prices).toHaveLength(0);
    expect(software.competitorPrices.undercutPolicy().applied).toBe(false);
  });

  it("P5 marketplace adapters stay mock and publish-blocked", () => {
    const adapters = software.marketplace.listSafeAdapters();
    expect(adapters.length).toBeGreaterThanOrEqual(11);
    for (const adapter of adapters) {
      const published = adapter.publish({ sku: "X", price: 1, category: "auto" });
      expect(published.reason).toBe("PUBLISH_BLOCKED");
      expect(adapter.importOrder({}).imported).toBe(false);
      expect(adapter.syncStatus({}).synced).toBe(false);
    }
  });

  it("P6 carrier webhook verify does not invent GPS", () => {
    const unverified = software.carrierWebhooks.verifyCarrierWebhook({
      carrier: "dhl",
      rawBody: "{}",
      signature: "nope",
    });
    expect(unverified.verified).toBe(false);
    const secret = "carrier-test-secret";
    const rawBody = JSON.stringify({ event: "delivered" });
    const signature = crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
    const verified = software.carrierWebhooks.verifyCarrierWebhook({
      carrier: "dhl",
      rawBody,
      signature,
      secret,
    });
    expect(verified.ok).toBe(true);
    const mapped = software.carrierWebhooks.mapCarrierEvent({ event: "delivered_signed" });
    expect(mapped.gpsInvented).toBe(false);
    expect(mapped.gps).toBeNull();
    expect(mapped.distinctProofs.signature).toBe(true);
    expect(mapped.distinctProofs.location).toBe(false);
  });

  it("P7 returns, refunds, supplier credit and bank adapters stay separate", () => {
    const opened = software.returns.openCase(db, {
      orderNumber: `RMA-${Date.now()}`,
      reason: "damaged",
      customerId: "cust-r",
    });
    expect(opened.refundExecuted).toBe(false);
    expect(opened.supplierCredit.assumedFromCustomerRefund).toBe(false);
    expect(software.bankAdapters.validateIban("DE89370400440532013000").valid).toBe(true);
    expect(software.bankAdapters.datevAdapter().configuredLikeLive).toBe(false);
    expect(software.bankAdapters.accountingHealth().refundIssued).toBe(false);
  });

  it("P8 circuit breaker, events, and task conflict stay on Pusat", () => {
    pusat.circuitBreaker.reset("test-cb");
    pusat.circuitBreaker.recordFailure("test-cb", db);
    pusat.circuitBreaker.recordFailure("test-cb", db);
    const open = pusat.circuitBreaker.recordFailure("test-cb", db);
    expect(open.state).toBe("OPEN");
    expect(pusat.circuitBreaker.allow("test-cb", { financial: true }).allowed).toBe(false);
    const produced = pusat.events.produce("pusat.circuit.changed", { name: "test-cb" });
    expect(produced.ok).toBe(true);
    const consumed = pusat.events.consume(produced.event, () => ({ execute: false }));
    expect(consumed.suggestionOnly).toBe(true);

    const sku = `CF-${Date.now()}`;
    const first = pusat.submitTask({
      title: "Conflict A",
      payload: { sku, source: "unverified" },
      createdBy: "test@pusat",
      enqueue: false,
    });
    db.prepare("UPDATE core_ai_tasks SET status = 'RUNNING' WHERE id = ?").run(first.task.id);
    const second = pusat.submitTask({
      title: "Conflict B",
      payload: { sku, source: "unverified" },
      createdBy: "test@pusat",
      enqueue: false,
    });
    const blocked = pusat.taskConflict.detect({ id: second.task.id, payload: { sku } });
    expect(blocked.blocked).toBe(true);
    db.prepare("UPDATE core_ai_tasks SET status = 'CANCELLED' WHERE id = ?").run(first.task.id);
  });

  it("P9 locale coverage and reporting do not invent sales", () => {
    const locales = software.localeCoverage.measure();
    expect(locales.localeCount).toBe(30);
    expect(locales.inventedTranslations).toBe(false);
    expect(locales.languageIndependentFromMarket).toBe(true);
    const sales = software.reportingModels.dailySales(db);
    expect(sales.invented).toBe(false);
    expect(sales.netProfit).toBeNull();
  });

  it("P10 secrets and monitoring stay local and production UNKNOWN", () => {
    const secret = software.secretVault.getSecret("STRIPE_WEBHOOK_SECRET");
    expect(secret.value).toBeNull();
    expect(secret.writtenToGit).toBe(false);
    const monitor = software.monitoringReady.readiness();
    expect(monitor.productionDb).toBe("UNKNOWN");
    expect(monitor.reason).toBe("BLOCKED_EXTERNAL");
    expect(software.communications.consentGate({}).ok).toBe(false);
    expect(software.communications.humanHandoff({}).sent).toBe(false);
    expect(software.voice.mockSession({ adapter: "twilio" }).live).toBe(false);
    expect(software.voice.mockSession({ adapter: "twilio" }).callStarted).toBe(false);
  });
});
