/**
 * Phase 21 cross-module evidence. Synthetic records only.
 * Uses the existing journey, Pusat queue, memory, VAT, locale, supplier dry sync,
 * carrier contract, and egress policy. Does not capture, refund, notify, or buy.
 */
const fs = require("fs");
const os = require("os");
const path = require("path");
const { runSyntheticCustomerJourney } = require("./syntheticCustomerJourney");
const { createDurableTaskQueue } = require("../pusat/durableTaskQueue");
const { createMultiMemory } = require("../buzzardNative/core/multiMemory");
const { calculateVat } = require("../buzzardNative/core/tax/vatEngine");
const { renderTemplate } = require("../notificationEngine");
const { drySyncSupplierFeed } = require("../supplier/supplierSyncOrchestrator");
const { getAdapter } = require("../logistics/carrierContract");
const { evaluateEgress } = require("../security/egressPolicy");
const { evaluateSalesGate } = require("../salesSafetyGate");
const { SAMPLE } = require("./syntheticCustomerJourney");

const WORKFLOW_IDS = Object.freeze([
  "customer",
  "product_search",
  "product_validation",
  "pricing",
  "vat",
  "inventory",
  "order_validation",
  "payment_gate",
  "supplier_routing",
  "shipment_tracking",
  "customer_notification",
  "returns",
  "refund_gate",
]);

function workflowEvidence(journey) {
  const byId = new Map((journey.workflow || []).map((item) => [item.id, item]));
  const missing = WORKFLOW_IDS.filter((id) => !byId.has(id));
  const failed = WORKFLOW_IDS.filter((id) => byId.get(id)?.ok !== true);
  return {
    ok: journey.ok === true && missing.length === 0 && failed.length === 0,
    missing,
    failed,
    steps: WORKFLOW_IDS.map((id) => byId.get(id) || { id, ok: false }),
  };
}

function orchestrationEvidence(dbPath) {
  const first = createDurableTaskQueue({ dbPath });
  const queued = first.enqueue({
    title: "phase21 synthetic orchestration",
    ownerId: "pusat",
    assigneeId: "sinan_bey",
    idempotencyKey: "phase21-synthetic",
    input: { sku: SAMPLE.sku },
  });
  const denied = first.enqueue({
    title: "unauthorized",
    ownerId: "not_an_agent",
    assigneeId: "sinan_bey",
  });
  first.registerWorker({ workerId: "phase21-worker", identity: "sinan_bey" });
  const leased = first.lease({ workerId: "phase21-worker" });
  const recovered = leased.ok ? first.fail(leased.task.id, { reason: "SYNTHETIC_FAULT" }) : { ok: false };
  const taskId = queued.task?.id || null;
  first.close();

  const second = createDurableTaskQueue({ dbPath });
  const reloaded = taskId ? second.get(taskId) : null;
  second.close();
  return {
    executed: queued.ok === true && queued.task?.state === "QUEUED" && queued.task?.ownerId === "pusat",
    denied: denied.ok === false && denied.code === "PERMISSION_DENIED",
    recovered: recovered.ok === true && recovered.task?.state === "QUEUED",
    persisted: Boolean(reloaded && reloaded.id === taskId && reloaded.state === "QUEUED"),
    taskId,
    input: { sku: SAMPLE.sku },
    output: { state: reloaded?.state || null, assigneeId: reloaded?.assigneeId || null },
  };
}

function memoryEvidence() {
  const memory = createMultiMemory();
  const stored = memory.put({
    actorId: "sinan_bey",
    ownerId: "sinan_bey",
    type: "personal",
    key: "phase21",
    value: "synthetic-note",
  });
  const own = memory.get({ actorId: "sinan_bey", ownerId: "sinan_bey", type: "personal", key: "phase21" });
  const cross = memory.get({ actorId: "esat_bey", ownerId: "sinan_bey", type: "personal", key: "phase21" });
  return {
    ok: stored.ok === true && own.ok === true && own.value === "synthetic-note" && cross.ok === false && cross.code === "MEMORY_ISOLATION_DENIED",
    namespace: stored.namespace || null,
    crossCode: cross.code || null,
  };
}

function vatEvidence() {
  const de = calculateVat({ actorId: "nedim_bey", sellerCountry: "DE", customerCountry: "DE", deliveryCountry: "DE", goodsNet: 40 });
  const fr = calculateVat({ actorId: "nedim_bey", sellerCountry: "DE", customerCountry: "FR", deliveryCountry: "FR", goodsNet: 40 });
  const denied = calculateVat({ actorId: "sinan_bey", sellerCountry: "DE", customerCountry: "DE", deliveryCountry: "DE", goodsNet: 40 });
  return {
    ok: de.ok === true && fr.ok === true && de.rate !== fr.rate && de.filingReady === false && fr.liveLegal === false && denied.ok === false,
    deRate: de.rate,
    frRate: fr.rate,
    deniedCode: denied.code || null,
  };
}

function localeEvidence() {
  const deCopy = renderTemplate("new_order", "de", { orderNumber: "SYN-1" });
  const enCopy = renderTemplate("new_order", "en", { orderNumber: "SYN-1" });
  const unknown = renderTemplate("new_order", "zz", { orderNumber: "SYN-1" });
  return {
    ok: deCopy.subject !== enCopy.subject && unknown.subject === deCopy.subject && !String(enCopy.body).includes("http"),
    en: enCopy.subject,
    unknown: unknown.subject,
  };
}

function supplierEvidence() {
  const previous = process.env.BUZZARD_DATA_DIR;
  const dataDir = path.join(os.tmpdir(), "buzzard-phase21-supplier");
  fs.mkdirSync(dataDir, { recursive: true });
  process.env.BUZZARD_DATA_DIR = dataDir;
  try {
    const sync = drySyncSupplierFeed({
      supplierId: "api-supplier-dry",
      format: "api",
      records: [{ ...SAMPLE, stock: 9, previous_price: { amount: 40, currency: "EUR" } }],
    });
    const row = sync.priceStock?.[0];
    return {
      ok: sync.liveImport === false && sync.health?.canConnectLive === false && row?.dryRun === true && row?.applied !== true,
      liveImport: sync.liveImport,
      sku: row?.sku || null,
      applied: row?.applied === true,
    };
  } finally {
    if (previous == null) delete process.env.BUZZARD_DATA_DIR;
    else process.env.BUZZARD_DATA_DIR = previous;
  }
}

function carrierEvidence() {
  const carrier = getAdapter("DHL");
  const moving = carrier.trackShipment({ status: "IN_TRANSIT" });
  const arrived = carrier.trackShipment({ status: "DELIVERED" });
  return {
    ok: moving.ok === true && arrived.ok === true && moving.status !== arrived.status && arrived.liveShipment === false,
    from: moving.status,
    to: arrived.status,
  };
}

function securityEvidence() {
  const sales = evaluateSalesGate();
  const egress = evaluateEgress({
    destinationUrl: "https://api.openai.com/v1/chat",
    payload: { orderId: "SYN" },
  });
  return {
    ok: sales.status === "LOCKED" && sales.allowed !== true && egress.allowed === false && egress.code === "EXTERNAL_AI_EGRESS_DENIED",
    sales: sales.status,
    egress: egress.code,
  };
}

function runPhase21Evidence({ dbPath } = {}) {
  const resolvedDb = dbPath || path.join(os.tmpdir(), "buzzard-phase21", `orch-${process.pid}-${Date.now()}-${Math.random().toString(16).slice(2)}.sqlite`);
  fs.mkdirSync(path.dirname(resolvedDb), { recursive: true });
  const journey = runSyntheticCustomerJourney();
  const workflow = workflowEvidence(journey);
  const automation = orchestrationEvidence(resolvedDb);
  const memory = memoryEvidence();
  const vat = vatEvidence();
  const locale = localeEvidence();
  const supplier = supplierEvidence();
  const carrier = carrierEvidence();
  const security = securityEvidence();
  const cross = {
    pusat: automation.executed === true,
    memory: memory.ok === true,
    vat: vat.ok === true,
    locale: locale.ok === true,
    supplier: supplier.ok === true,
    carrier: carrier.ok === true,
    security: security.ok === true,
  };
  const failed = Object.entries(cross).filter(([, ok]) => ok !== true).map(([name]) => name);
  return {
    ok: workflow.ok && automation.recovered && automation.persisted && automation.denied && failed.length === 0,
    workflow,
    payment: {
      captured: journey.paymentCaptured === true || journey.workflow?.find((item) => item.id === "payment_gate")?.output?.captured === true,
      moneyMoved: journey.workflow?.find((item) => item.id === "payment_gate")?.output?.moneyMoved === true,
    },
    refund: {
      issued: journey.workflow?.find((item) => item.id === "refund_gate")?.output?.refundIssued === true,
      code: journey.workflow?.find((item) => item.id === "refund_gate")?.output?.code || null,
    },
    notification: { sent: journey.workflow?.find((item) => item.id === "customer_notification")?.output?.sent === true },
    salesLocked: journey.ok === true,
    salesEnabled: false,
    automation,
    memory,
    vat,
    locale,
    supplier,
    carrier,
    security,
    cross: { ok: failed.length === 0, failed },
    live: false,
    productionReady: false,
  };
}

module.exports = { WORKFLOW_IDS, runPhase21Evidence };
