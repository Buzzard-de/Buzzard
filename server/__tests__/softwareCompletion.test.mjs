import { describe, it, expect, beforeAll } from "vitest";
import { createRequire } from "node:module";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const require = createRequire(import.meta.url);

describe("software completion — isolated engines", () => {
  let software;
  let pusat;
  let db;
  let productCore;
  let productValidator;
  let jobQueue;
  let salesMode;

  beforeAll(() => {
    software = require("../lib/software");
    pusat = require("../lib/pusat");
    db = require("../lib/db").db;
    productCore = require("../lib/pim/productCore");
    productValidator = require("../lib/productValidator");
    jobQueue = require("../lib/jobQueue");
    salesMode = require("../lib/salesMode");
    pusat.initialize(db);
    software.initialize(db);
  });

  it("1 product dry-run validates without writing", () => {
    const dry = productCore.createProduct(
      { sku: `SW-DRY-${Date.now()}`, title: "Software dry", status: "DRAFT" },
      { dryRun: true, source: "TEST" }
    );
    expect(dry.dryRun).toBe(true);
    expect(dry.written).toBe(false);
  });

  it("2 ACTIVE product create is rejected", () => {
    expect(() =>
      productCore.createProduct({ sku: `SW-ACT-${Date.now()}`, title: "Nope", status: "ACTIVE" }, { dryRun: true })
    ).toThrow(/ACTIVE/);
  });

  it("3 price uses canonical Node engine and does not apply undercut", () => {
    const quote = software.pricing.quote({
      supplierCost: 10,
      shippingCost: 2,
      extraCosts: 0.5,
      returnReserve: 0.4,
      marketplaceCommissionRate: 0.12,
      taxRate: 0.19,
    });
    expect(quote.ok).toBe(true);
    expect(quote.engine).toBe("server/lib/pricing.js");
    expect(quote.marketUndercut.implemented).toBe(false);
    expect(quote.salePrice).toBeGreaterThan(10);
    const incomplete = software.pricing.quote({ supplierCost: 10 });
    expect(incomplete.precise).toBe(false);
    expect(incomplete.missingOptional.length).toBeGreaterThan(0);
    expect(software.pricing.quote({}).failClosed).toBe(true);
  });

  it("4 unreliable stock blocks reservation", () => {
    const blocked = software.inventory.reserve(db, {
      sku: "PAD-1",
      quantity: 4,
      requestQuantity: 1,
      source: "estimate",
      lastSupplierUpdate: new Date().toISOString(),
    });
    expect(blocked.reserved).toBe(false);
    expect(blocked.failClosed).toBe(true);
    expect(blocked.purchaseOwnStock).toBe(false);

    const stale = software.inventory.reserve(db, {
      sku: "PAD-2",
      quantity: 20,
      requestQuantity: 1,
      source: "supplier_feed",
      lastSupplierUpdate: "2020-01-01T00:00:00.000Z",
    });
    expect(stale.failClosed).toBe(true);
    expect(stale.reason).toBe("STALE_STOCK");
  });

  it("5 order draft is created safely and not commercial", () => {
    const draft = software.orders.createDraft({
      sku: "SW-ORD-1",
      customerId: "cust-a",
      supplierCost: 8,
      shippingCost: 2,
      returnReserve: 0.3,
      marketplaceCommissionRate: 0.1,
      taxRate: 0.19,
      stock: 12,
      stockSource: "supplier_feed",
      lastSupplierUpdate: new Date().toISOString(),
      originCountry: "DE",
      destinationCountry: "FR",
      category: "automotive",
    });
    expect(draft.draft).toBe(true);
    expect(draft.commercial).toBe(false);
    expect(draft.sent).toBe(false);
    expect(draft.salesLocked).toBe(true);
  });

  it("6 PO draft is not sent", () => {
    const po = software.orders.createPoDraft({
      sku: "SW-PO-1",
      customerId: "cust-a",
      supplierId: "mock",
      supplierCost: 8,
      shippingCost: 2,
      returnReserve: 0.3,
      marketplaceCommissionRate: 0.1,
      taxRate: 0.19,
      stock: 5,
      stockSource: "supplier_feed",
      lastSupplierUpdate: new Date().toISOString(),
      originCountry: "TR",
      destinationCountry: "DE",
      category: "home",
    });
    expect(po.purchaseOrder.status).toBe("DRAFT");
    expect(po.purchaseOrder.submittedToSupplier).toBe(false);
    expect(po.realSupplierOrder).toBe(false);
  });

  it("7 worker cannot double-claim the same job", () => {
    const job = jobQueue.enqueueJob({
      jobType: "SOFTWARE_ISOLATED",
      payload: { mock: true },
      createdBy: "software-test",
    });
    const first = jobQueue.claimNextJob("sw-a", 5000, { jobType: "SOFTWARE_ISOLATED" });
    expect(first.id).toBe(job.id);
    const second = jobQueue.claimNextJob("sw-b", 5000, { jobType: "SOFTWARE_ISOLATED" });
    if (second) expect(second.id).not.toBe(job.id);
    jobQueue.updateJob(job.id, { status: "COMPLETED", result: { isolated: true } });
  });

  it("8-9 process restart preserves tracking and memory", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "sw-restart-"));
    const dbPath = path.join(dir, "isolated.db");
    const child = path.join(process.cwd(), "server/__tests__/helpers/softwareRestartChild.cjs");
    const trackingNumber = `TRK-${Date.now()}`;
    const env = { ...process.env, BUZZARD_DB_PATH: dbPath };
    const write = spawnSync(process.execPath, [child, "write", trackingNumber], { env, encoding: "utf8" });
    expect(write.status).toBe(0);
    const wrote = JSON.parse(write.stdout);
    const read = spawnSync(process.execPath, [child, "read", trackingNumber], { env, encoding: "utf8" });
    expect(read.status).toBe(0);
    const loaded = JSON.parse(read.stdout);
    expect(loaded.ok).toBe(true);
    expect(loaded.id).toBe(wrote.id);
    expect(loaded.pid).not.toBe(wrote.pid);
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it("10 Guardian rejects a dangerous task", () => {
    const denied = pusat.guardian.evaluate({
      agentId: "order_ai",
      employee: { id: "order_ai", status: "ACTIVE", permissions: ["ai.execute"] },
      action: "supplier.order.submit",
      payload: { po: "1" },
      permissionsRequired: ["supplier.order.submit"],
    });
    expect(denied.allowed).toBe(false);
  });

  it("11 changed approval input invalidates the old approval", () => {
    const created = pusat.approval.requestApproval({
      requestingAgent: "price_ai",
      action: "prices.update",
      reason: "software",
      input: { sku: "S1", price: 10 },
    });
    const approved = pusat.approval.decide(created.id, "approve", "reviewer");
    expect(approved.approval.status).toBe("APPROVED");
    expect(pusat.approval.assertBound(approved.approval, { sku: "S1", price: 11 }).ok).toBe(false);
  });

  it("12 financial retry is not auto-started", () => {
    const classified = pusat.exceptions.classify(new Error("timeout"), { action: "payment.refund" });
    expect(classified.retryable).toBe(false);
    const pay = pusat.integrations.paymentSafety({
      amount: 5,
      kind: "refund",
      idempotencyKey: `sw-pay-${Date.now()}`,
    });
    expect(pay.realMoneyMovement).toBe(false);
    expect(pay.retryable).toBe(false);
  });

  it("13 customs fail-closed on missing data", () => {
    const blocked = productValidator.validateCustomsDecision({});
    expect(blocked.ok).toBe(false);
    expect(blocked.failClosed).toBe(true);
    expect(blocked.legalClaim).toBe(false);
  });

  it("14 supplier mock errors stay mock", () => {
    const result = pusat.automations.supplierImport({ supplierId: "mock" });
    expect(result.live).toBe(false);
    expect(result.mock).toBe(true);
  });

  it("15 marketplace mock errors do not publish", () => {
    const err = software.marketplace.draftListing({ channel: "amazon", sku: "X", forceError: "timeout" });
    expect(err.ok).toBe(false);
    expect(err.published).toBe(false);
    const draft = software.marketplace.draftListing({ channel: "kaufland", sku: "Y" });
    expect(draft.published).toBe(false);
    expect(draft.live).toBe(false);
    expect(software.marketplace.classify("amazon").status).toBe("mock_connector");
  });

  it("16-17 tracking is limited to the owning customer", () => {
    const created = software.tracking.createShipment(db, {
      orderId: `ord-${Date.now()}`,
      customerId: "owner-1",
      trackingNumber: `DHL-${Date.now()}`,
      carrier: "DHL",
      events: [{ status: "IN_TRANSIT", description: "scan", latitude: 1, longitude: 2 }],
    });
    expect(created.ok).toBe(true);
    expect(created.shipment.location.gpsInvented).toBe(false);
    const own = software.tracking.getForCustomer(db, {
      trackingNumber: created.shipment.trackingNumber,
      customerId: "owner-1",
    });
    expect(own.ok).toBe(true);
    const other = software.tracking.getForCustomer(db, {
      trackingNumber: created.shipment.trackingNumber,
      customerId: "intruder",
    });
    expect(other.ok).toBe(false);
    expect(other.denied).toBe(true);
    expect(software.customerAccess.assertOwnOrder({ orderCustomerId: "owner-1", requesterCustomerId: "intruder" }).denied).toBe(true);
  });

  it("18 Arabic RTL does not invent overflow-safe GPS and is marked rtl", async () => {
    const { isRtlLocale, localeDirection } = await import("../../lib/i18n/types.ts");
    expect(isRtlLocale("ar")).toBe(true);
    expect(localeDirection("ar")).toBe("rtl");
    const css = fs.readFileSync(path.join(process.cwd(), "styles/rtl.css"), "utf8");
    expect(css).toMatch(/html\[dir=["']rtl["']\]/);
    expect(css).toMatch(/overflow-x:\s*clip/);
  });

  it("19 language and market stay independent", async () => {
    const { resolveLocaleAfterMarketChange } = await import("../../lib/i18n/marketCompatibility.ts");
    expect(resolveLocaleAfterMarketChange("tr", "DE")).toBe("tr");
    expect(resolveLocaleAfterMarketChange("de", "DE")).toBe("de");
    expect(salesMode.isSalesEnabled()).toBe(false);
  });

  it("20 sales lock blocks sales transition", () => {
    expect(salesMode.isSalesEnabled()).toBe(false);
    expect(process.env.BUZZARD_SALES_ENABLED).not.toBe("1");
    const activation = pusat.automations.productCreation({
      sku: `SW-LOCK-${Date.now()}`,
      title: "Locked",
      activate: true,
    });
    expect(activation.activation.allowed).toBe(false);
    expect(activation.written).toBe(false);
  });

  it("21 missing external services report BLOCKED, not live", () => {
    const health = software.health();
    expect(health.liveReady).toBe(false);
    expect(health.live.llm).toBe(false);
    expect(health.blocked).toContain("llm_live");
    expect(health.blocked).toContain("marketplace_publish");
    expect(software.voice.health().liveVerified).toBe(false);
    expect(software.voice.adapterStatus("twilio").blocked).toBe(true);
  });

  it("22 secrets are not written to health/report payloads", async () => {
    const health = software.health(await pusat.getHealth());
    const report = pusat.report();
    const blob = JSON.stringify({ health, report, canonical: software.canonical.getCanonicalMap() });
    expect(blob).not.toMatch(/sk-|BEGIN PRIVATE|TWILIO_AUTH_TOKEN=/i);
    expect(health.productSourceOfTruthActive).toBe(false);
  });

  it("23 expired lock recovery stays consistent after worker crash", async () => {
    const job = jobQueue.enqueueJob({
      jobType: "SOFTWARE_RECOVERY",
      payload: { mock: true },
      createdBy: "software-test",
    });
    const claimed = jobQueue.claimNextJob("sw-crash", 1, { jobType: "SOFTWARE_RECOVERY" });
    expect(claimed.id).toBe(job.id);
    await new Promise((r) => setTimeout(r, 20));
    const recovered = jobQueue.claimNextJob("sw-recover", 5000, { jobType: "SOFTWARE_RECOVERY" });
    expect(recovered?.id).toBe(job.id);
    jobQueue.updateJob(job.id, { status: "COMPLETED", result: { recovered: true } });
  });

  it("24 transaction rollback keeps reservation consistent", () => {
    const sku = `SW-TX-${Date.now()}`;
    try {
      software.inventory.withTransaction(db, () => {
        const reserved = software.inventory.reserve(db, {
          sku,
          quantity: 9,
          requestQuantity: 1,
          source: "supplier_feed",
          lastSupplierUpdate: new Date().toISOString(),
        });
        expect(reserved.ok).toBe(true);
        throw new Error("forced_rollback");
      });
    } catch (error) {
      expect(error.message).toBe("forced_rollback");
    }
    const leftover = db.prepare("SELECT * FROM software_reservations WHERE sku = ?").all(sku);
    expect(leftover).toHaveLength(0);
  });

  it("25 API-shaped errors stay consistent and reservation is idempotent", () => {
    const sku = `SW-IDEM-${Date.now()}`;
    const key = `res-${sku}`;
    const first = software.inventory.reserve(db, {
      sku,
      quantity: 6,
      requestQuantity: 1,
      source: "supplier_feed",
      lastSupplierUpdate: new Date().toISOString(),
      idempotencyKey: key,
    });
    const second = software.inventory.reserve(db, {
      sku,
      quantity: 6,
      requestQuantity: 1,
      source: "supplier_feed",
      lastSupplierUpdate: new Date().toISOString(),
      idempotencyKey: key,
    });
    expect(first.ok).toBe(true);
    expect(second.duplicate).toBe(true);
    expect(second.reservation.id).toBe(first.reservation.id);
    const released = software.inventory.release(db, first.reservation.id);
    expect(released.ok).toBe(true);
    expect(software.inventory.history(db, sku).length).toBeGreaterThan(0);

    const search = software.searchCatalog(
      [
        { sku: "A", title: "Bremse", category: "auto" },
        { sku: "B", title: "Gartenschlauch", category: "garden" },
      ],
      { q: "bremse", category: "auto" }
    );
    expect(search.items).toHaveLength(1);
    expect(search.invented).toBe(false);
    expect(software.canonical.assertCanonicalOrchestrator()).toBe(true);
  });

  it("26 returns ledger keeps supplier credit independent of customer refund", () => {
    const opened = software.returns.openCase(db, {
      orderNumber: `SW-RMA-${Date.now()}`,
      customerId: "cust_sw",
      reason: "defective",
      refundAmount: 10,
    });
    expect(opened.ok).toBe(true);
    expect(opened.refundExecuted).toBe(false);
    expect(opened.customerRefund.status).toBe("REQUESTED");
    expect(opened.supplierCredit.status).toBe("NOT_REQUESTED");
    expect(opened.supplierCredit.assumedFromCustomerRefund).toBe(false);
    const rejected = software.returns.recordSupplierCredit(db, opened.id, "REJECTED");
    expect(rejected.supplierCredit.status).toBe("REJECTED");
    expect(rejected.supplierCredit.received).toBe(false);
    expect(rejected.refundExecuted).toBe(false);
  });

  it("27 reporting does not invent revenue and health engines stay explicit", () => {
    const report = software.reporting.getOperationalReport(db, { windowMinutes: 15 });
    expect(report.inventedRevenue).toBe(false);
    expect(report.productionVerified).toBe(false);
    expect(report.health.liveReady).toBe(false);
    const health = software.health();
    expect(health.engines.live).toBe("BLOCKED");
    expect(health.engines.production).toBe("NOT_TESTED");
    expect(health.engines.payment).toBe("BLOCKED");
    expect(health.engines.voice).toBe("NOT_CONFIGURED");
    expect(health.liveReady).toBe(false);
  });

  it("28 canonical catalog search does not invent products", () => {
    const search = software.searchCanonicalCatalog({ q: "zzzz-no-such-sku", pageSize: 5 });
    expect(search.invented).toBe(false);
    expect(search.fitmentClaimed).toBe(false);
    expect(search.source).toBe("catalogReadService");
    expect(Array.isArray(search.items)).toBe(true);
  });

  it("29 specialist assistants stay recommendation-only", () => {
    const returns = pusat.agents.executeAgent("returns_assistant", { orderNumber: "x" });
    expect(returns.refundExecuted).toBe(false);
    const shipping = pusat.agents.executeAgent("shipping_assistant", { orderId: "y" });
    expect(shipping.gpsInvented).toBe(false);
    const market = pusat.agents.executeAgent("marketplace_assistant", {});
    expect(market.published).toBe(false);
    const health = pusat.agents.executeAgent("software_health_assistant", {});
    expect(health.liveReady).toBe(false);
  });

  it("30 CSV and XML feed previews validate without writing or buying stock", () => {
    const csv = software.supplierFeeds.preview({
      format: "csv",
      payload: [
        "sku,ean,price,currency,stock,timestamp,category,title",
        "SW-FEED-1,5901234123457,12.5,EUR,4,2026-10-11T12:00:00Z,automotive,Pad",
        "SW-FEED-1,5901234123457,12.5,EUR,4,2026-10-11T12:00:00Z,automotive,Pad",
      ].join("\n"),
    });
    expect(csv.written).toBe(false);
    expect(csv.live).toBe(false);
    expect(csv.purchaseOrderSent).toBe(false);
    expect(csv.duplicates.length).toBeGreaterThan(0);
    expect(csv.status).not.toBe("CONNECTED");

    const xml = software.supplierFeeds.preview({
      format: "xml",
      payload:
        "<products><product><sku>SW-FEED-2</sku><ean>4006381333931</ean><price>9.9</price><currency>EUR</currency><stock>3</stock></product></products>",
    });
    expect(xml.rowCount).toBe(1);
    expect(xml.written).toBe(false);
    expect(xml.importReady).toBe(false);
    expect(software.supplierFeeds.adapterStatus("csv").networkBlocked).toBe(true);
    expect(software.supplierFeeds.adapterStatus("xml").status).toBe("NOT_CONFIGURED");
  });

  it("31 customer message drafts never send and reject duplicate send", () => {
    const message = `Wo ist meine Bestellung SW-MSG-${Date.now()}?`;
    const first = software.communications.draft(db, {
      customerId: "cust_sw",
      channel: "email",
      message,
    });
    expect(first.status).toBe("DRAFT");
    expect(first.sent).toBe(false);
    expect(first.classification).toBe("order");
    const dup = software.communications.draft(db, {
      customerId: "cust_sw",
      channel: "email",
      message,
    });
    expect(dup.duplicate).toBe(true);
    expect(dup.sent).toBe(false);
    const queued = software.communications.queue(db, first.draft.id);
    expect(queued.status).toBe("QUEUED");
    const blocked = software.communications.sendPrepared(db, first.draft.id);
    expect(blocked.sent).toBe(false);
    expect(blocked.status).toBe("BLOCKED");
    const persisted = db.prepare("SELECT * FROM software_message_drafts WHERE id = ?").get(first.draft.id);
    expect(persisted.sent).toBe(0);
    expect(persisted.status).toBe("BLOCKED");
  });

  it("32 WMS reservations stay a separate table and do not create a second commercial reserve", () => {
    const sku = `SW-WMS-${Date.now()}`;
    const reserved = software.inventory.reserve(db, {
      sku,
      quantity: 5,
      requestQuantity: 1,
      source: "supplier_feed",
      lastSupplierUpdate: new Date().toISOString(),
    });
    expect(reserved.ok).toBe(true);
    const audit = software.inventory.recordWmsReservationAudit(db, {
      id: 99,
      product_sku: sku,
      quantity: 1,
      order_number: "READINESS_TEST",
    });
    expect(audit.secondReservationCreated).toBe(false);
    const inspect = software.inventory.inspectReservationTables(db, sku);
    expect(inspect.sharedAuthority).toBe(false);
    expect(inspect.softwareReservations).toHaveLength(1);
    expect(inspect.purchaseOwnStock).toBe(false);
  });

  it("33 API contract shapes stay fail-closed and unauthenticated admin routes require auth", async () => {
    const health = software.health();
    expect(health).toMatchObject({
      liveReady: false,
      salesEnabled: false,
      productSourceOfTruthActive: false,
    });
    expect(health.engines.live).toBe("BLOCKED");
    expect(health.engines.production).toBe("NOT_TESTED");
    expect(JSON.stringify(health)).not.toMatch(/sk-|TWILIO_AUTH_TOKEN|BEGIN PRIVATE/i);

    const { requireAuth } = require("../lib/auth");
    const denied = { statusCode: 200, body: null, status(code) { this.statusCode = code; return this; }, json(payload) { this.body = payload; return this; } };
    const session = requireAuth({ headers: {} }, denied);
    expect(session).toBeFalsy();
    expect(denied.statusCode).toBe(401);
    expect(denied.body.success).toBe(false);
  });

  it("34 payment timeout is uncertain and not retried", () => {
    const uncertain = software.payments.interpretProviderResult({ timeout: true });
    expect(uncertain.outcome).toBe("UNCERTAIN");
    expect(uncertain.success).toBe(false);
    expect(uncertain.failure).toBe(false);
    expect(uncertain.retryable).toBe(false);
    expect(uncertain.requiresReconciliation).toBe(true);
    expect(software.payments.validateWebhook({ headers: {} }).accepted).toBe(false);
    expect(software.payments.validateWebhook({ headers: { "stripe-signature": "sig" }, secretConfigured: true }).accepted).toBe(false);
    expect(software.payments.draftCharge({ amount: 10, timeout: true }).executed).toBe(false);
  });

  it("35 carriers stay scan-based and fail closed on outage or malformed payloads", () => {
    const ids = software.carriers.listCarriers().map((c) => c.id);
    expect(ids).toEqual(["dhl", "dpd", "gls", "hermes", "ups"]);
    expect(software.carriers.lookup({ carrier: "dhl" }).gpsInvented).toBe(false);
    expect(software.carriers.lookup({ carrier: "dhl" }).shipmentCreated).toBe(false);
    expect(software.carriers.lookup({ forceError: "outage" }).reason).toBe("CARRIER_OUTAGE");
    expect(software.carriers.lookup({ forceError: "malformed" }).reason).toBe("MALFORMED_TRACKING_PAYLOAD");
  });

  it("36 external checklist never includes secrets or live connections", () => {
    const inventory = software.externalIntegrations.inventory();
    expect(inventory.liveReady).toBe(false);
    expect(inventory.inventedConnections).toBe(false);
    expect(inventory.secretsIncluded).toBe(false);
    expect(inventory.counts.live).toBe(0);
    expect(inventory.items.length).toBeGreaterThan(15);
    const blob = JSON.stringify(inventory);
    expect(blob).not.toMatch(/sk-|whsec_|BEGIN PRIVATE|TWILIO_AUTH_TOKEN=/);
    const stripe = inventory.items.find((i) => i.id === "stripe");
    expect(stripe.authTested).toBe(false);
    expect(stripe.liveWriteConfigured).toBe(false);
    const checklist = software.externalIntegrations.checklist();
    expect(checklist.every((row) => row.status !== "LIVE")).toBe(true);
    expect(checklist.every((row) => Array.isArray(row.environmentVariables))).toBe(true);
  });

  it("37 safe customer workflow stays non-commercial", () => {
    const result = software.workflow.runSafeCustomerWorkflow(software, db, {
      sku: `SW-WF-${Date.now()}`,
      customerId: "cust_workflow",
    });
    expect(Object.values(result.steps).every((step) => step.pass)).toBe(true);
    expect(result.commercialOrders).toBe(0);
    expect(result.paymentExecuted).toBe(false);
    expect(result.refundExecuted).toBe(false);
    expect(result.supplierOrderSent).toBe(false);
    expect(result.productActivated).toBe(false);
    expect(result.listingPublished).toBe(false);
    expect(result.customerMessageSent).toBe(false);
    expect(result.carrierAction).toBe(false);
    expect(result.salesEnabled).toBe(false);
  });
});
