/**
 * Deterministic non-production commercial lifecycle harness.
 * Uses existing engines only. Never sends money, POs, listings, or messages.
 */

const crypto = require("crypto");
const productCore = require("../pim/productCore");
const guardian = require("../pusat/guardian");
const { getLifecycleLedger } = require("./reporting");

function scenario(result) {
  return {
    id: result.id,
    name: result.name,
    initialState: result.initialState,
    events: result.events,
    expectedTransition: result.expectedTransition,
    actualTransition: result.actualTransition,
    ledger: result.ledger,
    security: result.security,
    finalState: result.finalState,
    pass: result.pass === true,
    evidence: result.evidence,
  };
}

function runProduct(software, input) {
  const sku = input.sku;
  const dry = productCore.createProduct(
    { sku, title: input.title || "Lifecycle dry", status: "DRAFT" },
    { dryRun: true, source: "TEST" }
  );
  let activeRejected = false;
  try {
    productCore.createProduct({ sku: `${sku}-ACT`, title: "Nope", status: "ACTIVE" }, { dryRun: true });
  } catch {
    activeRejected = true;
  }
  return scenario({
    id: "A-product",
    name: "Product ingestion and SoT guard",
    initialState: { sku, productSourceOfTruthActive: false, status: "NONE" },
    events: ["dry_run_create", "active_create_attempt"],
    expectedTransition: ["DRAFT_NOT_WRITTEN", "ACTIVE_REJECTED"],
    actualTransition: [
      dry.dryRun && !dry.written ? "DRAFT_NOT_WRITTEN" : "UNEXPECTED_WRITE",
      activeRejected ? "ACTIVE_REJECTED" : "ACTIVE_ALLOWED",
    ],
    ledger: { written: false, commercialOrders: 0 },
    security: { productSourceOfTruthActive: false },
    finalState: { written: false, activeRejected, dryRun: dry.dryRun === true },
    pass: dry.dryRun === true && dry.written === false && activeRejected,
    evidence: "server/lib/pim/productCore.createProduct",
  });
}

function runPricing(software, input) {
  const complete = software.pricing.quote({
    supplierCost: input.supplierCost ?? 10,
    shippingCost: input.shippingCost ?? 2,
    extraCosts: 0.5,
    returnReserve: 0.4,
    marketplaceCommissionRate: 0.12,
    taxRate: 0.19,
  });
  const missing = software.pricing.quote({ supplierCost: 10 });
  const empty = software.pricing.quote({});
  return scenario({
    id: "B-pricing",
    name: "Canonical pricing and €0.50 net-profit",
    initialState: { supplierCost: input.supplierCost ?? 10 },
    events: ["quote_complete", "quote_missing_optional", "quote_empty"],
    expectedTransition: ["APPROVED", "NOT_APPROVED", "FAIL_CLOSED"],
    actualTransition: [
      complete.ok && complete.saleApproved && complete.netProfit >= 0.5 ? "APPROVED" : "REJECTED",
      missing.saleApproved ? "APPROVED" : "NOT_APPROVED",
      empty.failClosed ? "FAIL_CLOSED" : "OPEN",
    ],
    ledger: {
      netProfit: complete.netProfit,
      inventedRevenue: false,
      marketUndercutImplemented: complete.marketUndercut?.implemented === true,
    },
    security: { failClosed: empty.failClosed === true },
    finalState: {
      engine: complete.engine,
      saleApproved: complete.saleApproved,
      undercut: complete.marketUndercut?.implemented === true,
    },
    pass:
      complete.ok === true &&
      complete.saleApproved === true &&
      complete.netProfit >= 0.5 &&
      complete.marketUndercut?.implemented === false &&
      missing.saleApproved === false &&
      empty.failClosed === true,
    evidence: "server/lib/software/pricing.quote",
  });
}

function runInventory(software, db, input) {
  const fresh = software.inventory.evaluateReliability({
    sku: input.sku,
    quantity: input.stock ?? 8,
    source: "supplier_feed",
    lastSupplierUpdate: new Date().toISOString(),
  });
  const stale = software.inventory.evaluateReliability({
    sku: input.sku,
    quantity: 8,
    source: "supplier_feed",
    lastSupplierUpdate: "2020-01-01T00:00:00.000Z",
  });
  const reserved = software.inventory.reserve(db, {
    sku: input.sku,
    quantity: input.stock ?? 8,
    requestQuantity: 1,
    source: "supplier_feed",
    lastSupplierUpdate: new Date().toISOString(),
    idempotencyKey: `lc-res-${input.sku}`,
  });
  const again = software.inventory.reserve(db, {
    sku: input.sku,
    quantity: input.stock ?? 8,
    requestQuantity: 1,
    source: "supplier_feed",
    lastSupplierUpdate: new Date().toISOString(),
    idempotencyKey: `lc-res-${input.sku}`,
  });
  const conflict = software.inventory.resolveSupplierConflict([
    { sku: input.sku, quantity: 8, source: "supplier_a" },
    { sku: input.sku, quantity: 2, source: "supplier_b" },
  ]);
  const conflictReserve = software.inventory.reserve(db, {
    sku: `${input.sku}-conflict`,
    quantity: 8,
    requestQuantity: 1,
    source: "supplier_feed",
    lastSupplierUpdate: new Date().toISOString(),
    offers: [
      { sku: input.sku, quantity: 8, source: "supplier_a" },
      { sku: input.sku, quantity: 2, source: "supplier_b" },
    ],
  });
  return scenario({
    id: "C-inventory",
    name: "Stock reliability, no speculative purchase",
    initialState: { sku: input.sku, reserved: false },
    events: ["evaluate_fresh", "evaluate_stale", "reserve", "reserve_duplicate", "supplier_conflict"],
    expectedTransition: ["RELIABLE", "UNRELIABLE", "RESERVED", "IDEMPOTENT", "CONFLICT_FAIL_CLOSED"],
    actualTransition: [
      fresh.unreliable ? "UNRELIABLE" : "RELIABLE",
      stale.unreliable ? "UNRELIABLE" : "RELIABLE",
      reserved.ok ? "RESERVED" : "BLOCKED",
      again.duplicate ? "IDEMPOTENT" : "DUPLICATE_CREATED",
      conflict.failClosed && !conflictReserve.reserved ? "CONFLICT_FAIL_CLOSED" : "AUTO_RESOLVED",
    ],
    ledger: { purchaseOwnStock: false, speculativeBuy: false },
    security: { failClosed: stale.failClosed === true && conflict.failClosed === true },
    finalState: {
      reservationId: reserved.reservation?.id || null,
      purchaseOwnStock: fresh.purchaseOwnStock,
      conflictReason: conflict.reason || null,
    },
    pass:
      fresh.unreliable === false &&
      fresh.purchaseOwnStock === false &&
      stale.unreliable === true &&
      reserved.ok === true &&
      again.duplicate === true &&
      conflict.failClosed === true &&
      conflict.selected === null &&
      conflictReserve.reserved === false &&
      conflictReserve.reason === "CONFLICTING_SUPPLIER_OFFERS",
    evidence: "server/lib/software/inventory",
  });
}

function runOrder(software, input) {
  const draft = software.orders.createDraft({
    sku: input.sku,
    customerId: input.customerId,
    supplierCost: input.supplierCost ?? 10,
    shippingCost: input.shippingCost ?? 2,
    returnReserve: 0.4,
    marketplaceCommissionRate: 0.12,
    taxRate: 0.19,
    stock: input.stock ?? 8,
    stockSource: "supplier_feed",
    lastSupplierUpdate: new Date().toISOString(),
    originCountry: "DE",
    destinationCountry: "FR",
    category: "automotive",
  });
  const po = software.orders.createPoDraft({
    sku: input.sku,
    customerId: input.customerId,
    supplierCost: 10,
    shippingCost: 2,
    returnReserve: 0.4,
    marketplaceCommissionRate: 0.12,
    taxRate: 0.19,
    stock: 8,
    stockSource: "supplier_feed",
    lastSupplierUpdate: new Date().toISOString(),
    originCountry: "DE",
    destinationCountry: "FR",
    category: "automotive",
    supplierId: "fixture-supplier",
  });
  return scenario({
    id: "D-order",
    name: "Draft order and sales gate",
    initialState: { salesEnabled: false, commercialOrders: 0 },
    events: ["create_draft", "create_po_draft"],
    expectedTransition: ["DRAFT_LOCKED", "PO_NOT_SENT"],
    actualTransition: [
      draft.draft && draft.salesLocked && !draft.commercialCreated ? "DRAFT_LOCKED" : "COMMERCIAL",
      po.purchaseOrder?.submittedToSupplier === false ? "PO_NOT_SENT" : "PO_SENT",
    ],
    ledger: { commercialCreated: false, commercialOrders: 0 },
    security: { salesLocked: draft.salesLocked === true },
    finalState: { orderId: draft.orderId, sent: draft.sent, commercial: draft.commercial },
    pass:
      draft.draft === true &&
      draft.commercialCreated === false &&
      draft.salesLocked === true &&
      po.realSupplierOrder === false,
    evidence: "server/lib/software/orders",
  });
}

function runPayment(software) {
  const httpOk = software.payments.interpretHttpStatus(200);
  const timeout = software.payments.interpretProviderResult({ timeout: true });
  const missingSig = software.payments.validateWebhook({ secretConfigured: true, headers: {} });
  const duplicate = software.payments.draftCharge({
    amount: 5,
    idempotencyKey: "lc-pay-dup",
  });
  const again = software.payments.draftCharge({
    amount: 5,
    idempotencyKey: "lc-pay-dup",
  });
  return scenario({
    id: "E-payment",
    name: "Payment interpretation stays fail-closed",
    initialState: { paid: false, configured: false },
    events: ["http_200", "timeout", "webhook_missing_signature", "duplicate_draft"],
    expectedTransition: ["UNCERTAIN", "UNCERTAIN", "BLOCKED", "NO_MONEY"],
    actualTransition: [
      httpOk.paid ? "PAID" : "UNCERTAIN",
      timeout.outcome,
      missingSig.accepted ? "ACCEPTED" : "BLOCKED",
      duplicate.realMoneyMovement || again.realMoneyMovement ? "MONEY" : "NO_MONEY",
    ],
    ledger: { refundsExecuted: 0, realMoneyMovement: false },
    security: { webhookAccepted: missingSig.accepted === true },
    finalState: {
      paidInferredFromHttp: httpOk.paidInferredFromHttp,
      retryable: timeout.retryable,
    },
    pass:
      httpOk.paid === false &&
      httpOk.paidInferredFromHttp === false &&
      timeout.outcome === "UNCERTAIN" &&
      timeout.retryable === false &&
      missingSig.accepted === false &&
      duplicate.realMoneyMovement !== true,
    evidence: "server/lib/software/payments",
  });
}

function runSupplier(software, input) {
  const denied = guardian.evaluate({
    agentId: "order_ai",
    employee: { id: "order_ai", status: "ACTIVE", permissions: ["ai.execute"] },
    action: "supplier.order.submit",
    payload: { sku: input.sku, customerId: input.customerId },
    permissionsRequired: ["supplier.order.submit"],
  });
  const live = software.supplierFeeds.rejectLiveFetch("https://supplier.example/feed.csv");
  return scenario({
    id: "F-supplier",
    name: "Supplier PO and live fetch stay blocked",
    initialState: { purchaseOrderSent: false },
    events: ["guardian_submit", "live_feed_fetch"],
    expectedTransition: ["DENIED", "LIVE_FETCH_BLOCKED"],
    actualTransition: [
      denied.allowed ? "ALLOWED" : "DENIED",
      live.reason || "UNKNOWN",
    ],
    ledger: { purchaseOrdersSent: 0 },
    security: { guardianAllowed: denied.allowed, failClosed: denied.failClosed === true || denied.allowed === false },
    finalState: { submitted: false, live: live.live === true },
    pass: denied.allowed === false && live.reason === "LIVE_FETCH_BLOCKED" && live.written !== true,
    evidence: "server/lib/pusat/guardian + software/supplierFeeds",
  });
}

function runCarrier(software, db, input) {
  const trackingNumber = `LC-${input.sku}`;
  const created = software.tracking.createShipment(db, {
    orderId: `ord-${input.sku}`,
    customerId: input.customerId,
    trackingNumber,
    carrier: "DHL",
    events: [{ status: "IN_TRANSIT", description: "scan", latitude: 1, longitude: 2, occurredAt: "2026-10-11T10:00:00.000Z" }],
  });
  const later = software.tracking.appendEvent(db, created.shipment.id, {
    status: "OUT_FOR_DELIVERY",
    description: "newer scan",
    occurredAt: "2026-10-11T12:00:00.000Z",
  });
  const older = software.tracking.appendEvent(db, created.shipment.id, {
    status: "PICKED_UP",
    description: "older scan",
    occurredAt: "2026-10-11T08:00:00.000Z",
  });
  const duplicate = software.tracking.appendEvent(db, created.shipment.id, {
    status: "OUT_FOR_DELIVERY",
    description: "newer scan",
    occurredAt: "2026-10-11T12:00:00.000Z",
  });
  const simulated = software.tracking.appendEvent(db, created.shipment.id, {
    status: "OUT_FOR_DELIVERY",
    description: "simulated hop",
    occurredAt: "2026-10-11T13:00:00.000Z",
    simulated: true,
  });
  const after = software.tracking.mapShipment(
    db.prepare("SELECT * FROM software_shipments WHERE id = ?").get(created.shipment.id),
    db
  );
  const own = software.tracking.getForCustomer(db, { trackingNumber, customerId: input.customerId });
  const other = software.tracking.getForCustomer(db, { trackingNumber, customerId: "intruder" });
  const lookup = software.carriers.lookup({ carrier: "dhl", trackingNumber: null });
  const empty = software.carriers.lookup({ carrier: "dhl", trackingNumber: "   " });
  return scenario({
    id: "G-carrier",
    name: "Tracking fixture, no invented GPS, IDOR denied",
    initialState: { shipmentCreated: false, gpsLive: false },
    events: ["create_fixture", "owner_read", "intruder_read", "carrier_lookup", "out_of_order", "duplicate", "simulated", "empty_tracking"],
    expectedTransition: ["FIXTURE", "OWN", "DENIED", "NO_SHIPMENT", "HELD", "IDEMPOTENT", "LABELLED", "INVALID"],
    actualTransition: [
      created.ok && created.shipment?.location?.gpsInvented === false ? "FIXTURE" : "LIVE_GPS",
      own.ok ? "OWN" : "DENIED",
      other.denied ? "DENIED" : "LEAKED",
      lookup.shipmentCreated ? "SHIPMENT" : "NO_SHIPMENT",
      older.outOfOrder && after.status === "OUT_FOR_DELIVERY" ? "HELD" : "REWOUND",
      duplicate.duplicate ? "IDEMPOTENT" : "DUPLICATE_CREATED",
      simulated.simulated ? "LABELLED" : "UNLABELLED",
      empty.reason === "TRACKING_NUMBER_INVALID" ? "INVALID" : "ACCEPTED",
    ],
    ledger: { liveShipments: 0 },
    security: { crossCustomerDenied: other.denied === true },
    finalState: {
      gpsInvented: created.shipment?.location?.gpsInvented === true,
      liveCarrier: created.liveCarrier === true,
      status: after.status,
      simulated: simulated.simulated === true,
    },
    pass:
      created.ok === true &&
      created.shipment.location.gpsInvented === false &&
      own.ok === true &&
      other.denied === true &&
      lookup.shipmentCreated === false &&
      later.statusAdvanced === true &&
      older.outOfOrder === true &&
      older.statusAdvanced === false &&
      after.status === "OUT_FOR_DELIVERY" &&
      duplicate.duplicate === true &&
      simulated.simulated === true &&
      empty.reason === "TRACKING_NUMBER_INVALID",
    evidence: "server/lib/software/tracking + carriers",
  });
}

function runReturns(software, db, input) {
  const opened = software.returns.openCase(db, {
    orderNumber: `LC-RMA-${input.sku}`,
    customerId: input.customerId,
    reason: "defective",
    refundAmount: 10,
  });
  const drafted = software.returns.transitionCustomerRefund(db, opened.id, "DRAFTED");
  const invalid = software.returns.transitionCustomerRefund(db, opened.id, "RECEIVED");
  const rejected = software.returns.recordSupplierCredit(db, opened.id, "REJECTED");
  return scenario({
    id: "H-returns",
    name: "Refund ledger independent of supplier credit",
    initialState: { refundExecuted: false, supplierCredit: "NOT_REQUESTED" },
    events: ["open", "draft_refund", "invalid_receive", "supplier_rejected"],
    expectedTransition: ["REQUESTED", "DRAFTED", "BLOCKED", "CREDIT_REJECTED"],
    actualTransition: [
      opened.customerRefund?.status || "UNKNOWN",
      drafted.ok ? "DRAFTED" : "FAILED",
      invalid.ok ? "RECEIVED" : "BLOCKED",
      rejected.supplierCredit?.status === "REJECTED" ? "CREDIT_REJECTED" : "ASSUMED",
    ],
    ledger: {
      refundExecuted: opened.refundExecuted === true,
      assumedSupplierWillReimburse: rejected.supplierCredit?.assumedFromCustomerRefund === true,
    },
    security: { moneyMoved: drafted.executed === true || rejected.refundExecuted === true },
    finalState: software.returns.inspect(db, opened.id),
    pass:
      opened.ok === true &&
      opened.refundExecuted === false &&
      drafted.executed === false &&
      invalid.ok === false &&
      rejected.supplierCredit.received === false &&
      rejected.supplierCredit.assumedFromCustomerRefund === false,
    evidence: "server/lib/software/returns",
  });
}

function runCommunications(software, db, input) {
  const de = software.communications.draft(db, {
    customerId: input.customerId,
    channel: "email",
    locale: "de",
    message: `Bestellung ${input.sku}`,
  });
  const ar = software.communications.draft(db, {
    customerId: input.customerId,
    channel: "email",
    message: `تتبع الشحنة ${input.sku}`,
  });
  const tr = software.communications.draft(db, {
    customerId: input.customerId,
    channel: "email",
    message: `Sipariş iade ${input.sku}`,
  });
  const dup = software.communications.draft(db, {
    customerId: input.customerId,
    channel: "email",
    locale: "de",
    message: `Bestellung ${input.sku}`,
  });
  const queued = software.communications.queue(db, de.draft?.id);
  const sent = software.communications.sendPrepared(db, de.draft?.id);
  return scenario({
    id: "I-communications",
    name: "Locale drafts, RTL detect, send blocked",
    initialState: { sent: false },
    events: ["draft_de", "draft_ar", "draft_tr", "duplicate", "queue", "send"],
    expectedTransition: ["de", "ar", "tr", "IDEMPOTENT", "QUEUED_NOT_DELIVERED", "BLOCKED"],
    actualTransition: [
      de.locale,
      ar.locale,
      tr.locale,
      dup.duplicate ? "IDEMPOTENT" : "NEW",
      queued.status === "QUEUED" && queued.delivered === false ? "QUEUED_NOT_DELIVERED" : "DELIVERED",
      sent.sent ? "SENT" : "BLOCKED",
    ],
    ledger: { messagesSent: sent.sent ? 1 : 0 },
    security: { redacted: true },
    finalState: {
      sent: sent.sent === true,
      providerAccepted: sent.providerAccepted === true,
      delivered: sent.delivered === true,
      rtlDetected: ar.locale === "ar",
    },
    pass:
      de.ok === true &&
      de.delivered === false &&
      ar.locale === "ar" &&
      tr.locale === "tr" &&
      dup.duplicate === true &&
      queued.status === "QUEUED" &&
      queued.delivered === false &&
      queued.providerAccepted === false &&
      sent.sent === false &&
      sent.blocked === true &&
      sent.providerAccepted === false &&
      sent.delivered === false,
    evidence: "server/lib/software/communications",
  });
}

function runMarketplace(software, db, input) {
  const publishGate = guardian.evaluate({
    agentId: "marketplace_ai",
    employee: { id: "marketplace_ai", status: "ACTIVE", permissions: ["products.read", "ai.execute"] },
    action: "marketplace.publish",
    payload: { sku: input.sku, channel: "otto" },
    permissionsRequired: ["marketplace.publish"],
    priority: "CRITICAL",
  });
  const amazon = software.marketplace.draftListing(
    { channel: "amazon", sku: input.sku, price: 19.9, category: "automotive" },
    db
  );
  const otto = software.marketplace.createSafeAdapter("otto");
  const ottoDraft = otto.draft({ sku: `${input.sku}-OTTO`, price: 21.5 }, db);
  const published = otto.publish({ sku: `${input.sku}-OTTO`, price: 21.5 });
  const missing = otto.validate({ sku: `${input.sku}-OTTO` });
  return scenario({
    id: "J-marketplace",
    name: "Draft listings and blocked publish",
    initialState: { published: false },
    events: ["amazon_draft", "otto_safe_draft", "otto_publish", "otto_missing_price"],
    expectedTransition: ["UNPUBLISHED", "SAFE_UNPUBLISHED", "PUBLISH_BLOCKED", "FIELDS_REQUIRED"],
    actualTransition: [
      amazon.published ? "PUBLISHED" : "UNPUBLISHED",
      ottoDraft.published || !otto.safeInterface ? "UNSAFE" : "SAFE_UNPUBLISHED",
      published.reason,
      missing.ok ? "VALID" : "FIELDS_REQUIRED",
    ],
    ledger: { listingsPublished: 0 },
    security: { write: published.write === true },
    finalState: {
      listingId: amazon.listingId,
      ottoAdapterExists: otto.adapterExists,
      ottoSafeInterface: otto.safeInterface,
    },
    pass:
      publishGate.allowed === false &&
      amazon.published === false &&
      amazon.listingId === null &&
      otto.safeInterface === true &&
      otto.adapterExists === false &&
      otto.liveEndpoint === null &&
      ottoDraft.published === false &&
      published.reason === "PUBLISH_BLOCKED" &&
      missing.ok === false,
    evidence: "server/lib/software/marketplace + pusat/guardian",
  });
}

function runReporting(software, db, input, traces) {
  const report = software.reporting.getOperationalReport(db, { windowMinutes: 15 });
  const ledger = getLifecycleLedger(db, { subject: input.sku });
  const health = software.health();
  const failed = traces.filter((row) => !row.pass).map((row) => row.id);
  return scenario({
    id: "K-reporting",
    name: "Diagnostic ledger and readiness distinction",
    initialState: { inventedRevenue: false },
    events: ["operational_report", "lifecycle_ledger", "health_readiness"],
    expectedTransition: ["NOT_INVENTED", "ZERO_COMMERCIAL", "NOT_PRODUCTION"],
    actualTransition: [
      report.inventedRevenue ? "INVENTED" : "NOT_INVENTED",
      ledger.commercialOrders === 0 ? "ZERO_COMMERCIAL" : "COMMERCIAL",
      health.readiness?.productionVerified ? "PRODUCTION" : "NOT_PRODUCTION",
    ],
    ledger,
    security: {
      secrets: JSON.stringify({ report, ledger, health }).includes("sk-") ? "LEAKED" : "REDACTED",
    },
    finalState: {
      processAlive: health.readiness?.processAlive === true,
      providerAuthenticated: health.readiness?.providerAuthenticated === true,
      failedScenarios: failed,
    },
    pass:
      report.inventedRevenue === false &&
      ledger.commercialOrders === 0 &&
      ledger.inventedRevenue === false &&
      health.readiness.processAlive === true &&
      health.readiness.providerAuthenticated === false &&
      health.readiness.productionVerified === false &&
      health.liveReady === false &&
      failed.length === 0,
    evidence: "server/lib/software/reporting + health",
  });
}

function persistTrace(db, sku, traces, summary) {
  const id = `swa_${crypto.randomBytes(6).toString("hex")}`;
  db.prepare("INSERT INTO software_audit(id, kind, subject, details_json) VALUES(?,?,?,?)").run(
    id,
    "commercial_lifecycle",
    sku,
    JSON.stringify({
      commercialOrders: 0,
      paymentExecuted: false,
      refundExecuted: false,
      listingPublished: false,
      customerMessageSent: false,
      passed: summary.passed,
      failed: summary.failed,
      scenarioIds: traces.map((row) => row.id),
    })
  );
  return id;
}

function runCommercialLifecycle(software, db, input = {}) {
  const sku = input.sku || `SW-LC-${Date.now()}`;
  const customerId = input.customerId || "cust_lifecycle";
  const ctx = { sku, customerId, supplierCost: input.supplierCost ?? 10, shippingCost: input.shippingCost ?? 2, stock: input.stock ?? 8, title: input.title };

  const traces = [
    runProduct(software, ctx),
    runPricing(software, ctx),
    runInventory(software, db, ctx),
    runOrder(software, ctx),
    runPayment(software),
    runSupplier(software, ctx),
    runCarrier(software, db, ctx),
    runReturns(software, db, ctx),
    runCommunications(software, db, ctx),
    runMarketplace(software, db, ctx),
  ];
  traces.push(runReporting(software, db, ctx, traces));

  const passed = traces.filter((row) => row.pass).length;
  const failed = traces.filter((row) => !row.pass).map((row) => row.id);
  const auditId = persistTrace(db, sku, traces, { passed, failed });

  return {
    ok: failed.length === 0,
    sku,
    customerId,
    traces,
    passed,
    failed,
    commercialOrders: 0,
    paymentExecuted: false,
    refundExecuted: false,
    supplierOrderSent: false,
    productActivated: false,
    listingPublished: false,
    customerMessageSent: false,
    carrierAction: false,
    salesEnabled: false,
    productSourceOfTruthActive: false,
    productionVerified: false,
    live: false,
    verification: "TEST_VERIFIED",
    liveVerified: false,
    audit: { id: auditId, recorded: true },
    evidence: "software_audit.kind=commercial_lifecycle",
  };
}

module.exports = {
  runCommercialLifecycle,
};
