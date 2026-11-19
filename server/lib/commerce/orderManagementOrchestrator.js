/**
 * Dry order lifecycle: validate → reserve → draft → supplier route → track → cancel/recover.
 */
const crypto = require("crypto");
const { ORDER_STATUS, canTransitionOrder } = require("../../core/commerceConstants");
const { evaluateSalesGate } = require("../salesSafetyGate");
const { runCommercialDryRun, DECISIONS } = require("./commercialCore");
const { createDraftStore, draftOrdersFromDryRun } = require("./dryOrderDraft");
const { validateOrderPayload } = require("../supplier/supplierOrderReadiness");
const { selectSupplierForOrder } = require("../supplier/supplierSelectionEngine");
const { planSupplierRecovery } = require("../supplier/supplierErrorRecovery");

const tracker = new Map();

function validateOrderAutomatic(payload = {}) {
  const sales = evaluateSalesGate();
  const structural = validateOrderPayload({
    supplierId: payload.supplierId || "api-supplier-dry",
    items: payload.items || [{ supplierSku: payload.sku || "DRY-SKU-001", quantity: payload.qty || 1 }],
  });
  const priceOk = Number(payload.unitPrice) > 0 || payload.skipPrice === true;
  return {
    ok: structural.ok && priceOk && sales.status === "LOCKED",
    structural,
    salesGate: sales.status,
    live: false,
    paymentCapture: false,
  };
}

function dryReserveStock({ sku, quantity = 1, available = 10 } = {}) {
  const qty = Number(quantity);
  if (!Number.isFinite(qty) || qty <= 0) return { ok: false, code: "QTY_INVALID", live: false };
  if (qty > available) return { ok: false, code: "INSUFFICIENT_STOCK", saleable: available, live: false };
  const reservationId = `rsv_dry_${crypto.randomBytes(4).toString("hex")}`;
  return {
    ok: true,
    reservationId,
    sku,
    quantity: qty,
    remainingSaleable: available - qty,
    pimWrite: false,
    warehousePurchase: false,
    live: false,
  };
}

function transitionOrderStatus(from, to) {
  const allowed = canTransitionOrder(from, to);
  return { ok: allowed, from, to, live: false, executed: false };
}

function cancelOrderDry(orderId) {
  const row = tracker.get(orderId);
  const transition = transitionOrderStatus(row?.status || ORDER_STATUS.PENDING, ORDER_STATUS.CANCELLED);
  if (row && transition.ok) {
    row.status = ORDER_STATUS.CANCELLED;
    row.events.push({ event: "CANCELLED", at: new Date().toISOString() });
    tracker.set(orderId, row);
  }
  return {
    ok: transition.ok,
    orderId,
    status: ORDER_STATUS.CANCELLED,
    refundIssued: false,
    live: false,
  };
}

function routeToSupplier(order = {}) {
  const payload = {
    supplierId: order.supplierId || "api-supplier-dry",
    orderId: order.orderId || `DRY-ORD-${crypto.randomBytes(3).toString("hex")}`,
    items: order.items || [{ supplierSku: order.sku, quantity: order.qty || 1 }],
  };
  const validation = validateOrderPayload(payload);
  return {
    ok: validation.ok,
    orderId: payload.orderId,
    readiness: {
      ok: validation.ok,
      dryRun: true,
      createOrderBlocked: validation.createOrderBlocked,
    },
    transmitted: false,
    live: false,
  };
}

function runDryOrderPipeline(sampleRecord) {
  const validation = validateOrderAutomatic({
    supplierId: "api-supplier-dry",
    sku: sampleRecord.sku,
    qty: 1,
    unitPrice: 50,
    skipPrice: true,
  });
  const reserve = dryReserveStock({ sku: sampleRecord.sku, quantity: 1, available: sampleRecord.stock || 12 });
  const dryRun = runCommercialDryRun({
    supplierId: "api-supplier-dry",
    format: "api",
    records: [sampleRecord],
  });
  const store = createDraftStore();
  const drafted = draftOrdersFromDryRun(dryRun, { customerId: "SYN-CUST", qty: 1, store });
  const primaryOrder = drafted.drafts.find((d) => d.ok);
  const selection = selectSupplierForOrder({
    lineItems: [{ sku: sampleRecord.sku, quantity: 1 }],
    offersBySku: {
      [sampleRecord.sku]: [
        { supplierId: "api-supplier-dry", unitCost: 40, stock: 8 },
        { supplierId: "xml-supplier-dry", unitCost: 41, stock: 5 },
      ],
    },
  });
  const supplierForward = routeToSupplier({
    orderId: primaryOrder?.orderId,
    sku: sampleRecord.sku,
    supplierId: selection.lines?.[0]?.primary?.supplierId,
    offersBySku: selection.lines?.length ? { [sampleRecord.sku]: [selection.lines[0].primary, selection.lines[0].fallback].filter(Boolean) } : {},
  });
  store.db.close();

  if (primaryOrder?.orderId) {
    tracker.set(primaryOrder.orderId, {
      orderId: primaryOrder.orderId,
      status: ORDER_STATUS.PENDING,
      sku: sampleRecord.sku,
      supplierId: selection.lines?.[0]?.primary?.supplierId,
      events: [{ event: "CREATED", at: new Date().toISOString() }],
      live: false,
    });
  }

  const recovery = planSupplierRecovery({ code: "networkBlocked" }, { attempt: 1 });

  return {
    ok:
      validation.ok &&
      reserve.ok &&
      dryRun.salesGate === "LOCKED" &&
      drafted.summary.drafted >= 1 &&
      dryRun.products?.[0]?.decision === DECISIONS.READY_FOR_REVIEW,
    validation,
    reserve,
    drafted: drafted.summary,
    selection,
    supplierForward,
    recovery,
    trackerSize: tracker.size,
    live: false,
  };
}

function getCentralOrder(orderId) {
  return tracker.get(orderId) || null;
}

function listTrackedOrders() {
  return [...tracker.values()];
}

module.exports = {
  validateOrderAutomatic,
  dryReserveStock,
  transitionOrderStatus,
  cancelOrderDry,
  routeToSupplier,
  runDryOrderPipeline,
  getCentralOrder,
  listTrackedOrders,
};