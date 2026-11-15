const fulfillmentStore = require("./fulfillmentStore");
const salesGuard = require("./commerce/salesGuard");
const { isSalesEnabled } = require("./salesMode");
const { selectTransportCost } = require("./commerce/pricingPolicy");

const seenSupplierRequests = new Set();
const fulfillmentInFlight = new Set();
const fulfillmentPlans = new Map();
const shipmentClaims = new Set();

function groupLinesBySupplier(lines, productsById) {
  const groups = new Map();
  for (const line of lines || []) {
    const product = productsById.get(line.productId);
    const supplierId = product?.supplier_id || null;
    const bucket = groups.get(supplierId) || [];
    bucket.push({ ...line, supplierId, supplierSku: product?.supplier_sku || line.sku });
    groups.set(supplierId, bucket);
  }
  return groups;
}

function moneyPresent(value) {
  return typeof value === "number" && Number.isFinite(value) && value >= 0;
}

function commercialReasons(order = {}) {
  const reasons = [];
  if (!isSalesEnabled()) reasons.push("SALES_CLOSED");
  if (order.mock === true || order.demo === true || order.source === "mock" || order.source === "DEMO") {
    reasons.push("MOCK_NOT_COMMERCIAL");
  }
  reasons.push("ORDER_UNVERIFIED");
  reasons.push("PAYMENT_UNVERIFIED");
  reasons.push("SUPPLIER_COST_UNVERIFIED");
  reasons.push("STOCK_UNVERIFIED");
  const transport = selectTransportCost(order.transport || {});
  if (transport.ok !== true || transport.live === true) reasons.push("SHIPPING_RATE_UNVERIFIED");
  if (!moneyPresent(order.marketplaceFee)) reasons.push("MARKETPLACE_FEE_UNVERIFIED");
  if (!moneyPresent(order.paymentFee)) reasons.push("PAYMENT_FEE_UNVERIFIED");
  return reasons;
}

function blockedFulfillment(code, reasons, extra = {}) {
  return {
    ok: false,
    blocked: true,
    error: code,
    code,
    status: 403,
    reasons,
    submissionStatus: "BLOCKED_EXTERNAL",
    fulfillmentCreated: false,
    supplierOrderCreated: false,
    shipmentCreated: false,
    submitted: false,
    sent: false,
    accepted: false,
    purchased: false,
    delivered: false,
    trackingNumber: null,
    supplierOrderNumber: null,
    live: false,
    mock: false,
    ...extra,
  };
}

function classifySubmission(supplierOrder = {}, supplier = {}) {
  if (supplierOrder.timeout === true || supplier?.timeout === true || supplierOrder.forceTimeout === true) {
    return { code: "TIMEOUT", submissionStatus: "SUBMISSION_FAILED" };
  }
  if (supplierOrder.networkError === true || supplier?.networkError === true) {
    return { code: "NETWORK_ERROR", submissionStatus: "SUBMISSION_FAILED" };
  }
  const tracking = String(supplierOrder.trackingNumber || supplierOrder.label || "");
  if (
    supplierOrder.mock === true ||
    supplier?.mock === true ||
    supplierOrder.demo === true ||
    tracking.startsWith("DEMO")
  ) {
    return { code: "MOCK_NOT_COMMERCIAL", submissionStatus: "BLOCKED_EXTERNAL" };
  }
  if (tracking || supplierOrder.carrierResponse) {
    return { code: "TRACKING_NOT_A_SHIPMENT", submissionStatus: "BLOCKED_EXTERNAL" };
  }
  if (!isSalesEnabled()) return { code: "SALES_CLOSED", submissionStatus: "BLOCKED_EXTERNAL" };
  if (!supplier?.active) return { code: "SUPPLIER_UNKNOWN", submissionStatus: "UNKNOWN" };
  return { code: "SUPPLIER_NOT_LIVE", submissionStatus: "BLOCKED_EXTERNAL" };
}

function submitSupplierOrder(supplierOrder = {}, supplier = null, req = null) {
  const block = salesGuard.assertSupplierOrderAllowed({ req });
  const requestId = supplierOrder.requestId || supplierOrder.idempotencyKey || null;
  if (requestId && seenSupplierRequests.has(requestId)) {
    return blockedFulfillment("DUPLICATE_SUPPLIER_SUBMISSION", ["DUPLICATE_SUPPLIER_SUBMISSION"], {
      duplicate: true,
      errorKey: "DUPLICATE_SUPPLIER_SUBMISSION",
      status: 409,
    });
  }
  if (requestId) seenSupplierRequests.add(requestId);
  const classified = classifySubmission(supplierOrder, supplier);
  return {
    ...blockedFulfillment(classified.code, [classified.code], {
      error: block?.code || classified.code,
      errorKey: block?.code || classified.code,
      status: block?.status || 409,
      message: block?.message || "Supplier submission is not live",
    }),
    submissionStatus: classified.submissionStatus,
    supplierResponse: null,
  };
}

function createFulfillmentsForOrder(order = {}, productsById = new Map(), req = null) {
  salesGuard.assertSupplierOrderAllowed({ req });
  const reasons = commercialReasons(order);
  if (order.customerId != null && order.ownerId != null && String(order.customerId) !== String(order.ownerId)) {
    reasons.push("OWNERSHIP_UNVERIFIED");
  }
  const orderNumber = order.orderNumber ? String(order.orderNumber) : "";
  if (!orderNumber) {
    return [blockedFulfillment("ORDER_UNVERIFIED", reasons.concat("ORDER_UNVERIFIED"))];
  }
  if (fulfillmentInFlight.has(orderNumber)) {
    return [blockedFulfillment("DUPLICATE_FULFILLMENT", reasons.concat("DUPLICATE_FULFILLMENT"), {
      duplicate: true,
      status: 409,
    })];
  }
  fulfillmentInFlight.add(orderNumber);
  try {
    const existing = fulfillmentStore.readFulfillments().filter((row) => row.orderNumber === orderNumber);
    if (existing.length) {
      return [blockedFulfillment("DUPLICATE_FULFILLMENT", reasons.concat("DUPLICATE_FULFILLMENT"), {
        duplicate: true,
        status: 409,
      })];
    }
    groupLinesBySupplier(order.lines, productsById);
    return [blockedFulfillment(reasons[0] || "BLOCKED_EXTERNAL", reasons)];
  } finally {
    fulfillmentInFlight.delete(orderNumber);
  }
}

function closedPlan(code, status, stage, extra = {}) {
  return {
    ok: false,
    live: false,
    code,
    status,
    stage,
    fulfillmentCreated: false,
    supplierOrderCreated: false,
    shipmentCreated: false,
    purchased: false,
    reserved: false,
    packed: false,
    supplierAccepted: false,
    carrierConnected: false,
    trackingNumber: null,
    label: null,
    stockStatus: "UNKNOWN",
    ...extra,
  };
}

function runFulfillmentPlan(input = {}) {
  const orderNumber = input.orderNumber ? String(input.orderNumber) : "";
  if (!orderNumber) return closedPlan("ORDER_UNVERIFIED", "ORDER_UNVERIFIED", "ORDER");
  const existing = fulfillmentPlans.get(orderNumber);
  if (input.action === "cancel" || input.action === "fail") {
    if (!existing) return closedPlan("ORDER_UNKNOWN", "ORDER_UNKNOWN", "ORDER");
    if (existing.status === "CANCELLED" || existing.status === "FAILED") {
      return { ...existing, code: "ILLEGAL_TRANSITION" };
    }
    existing.status = input.action === "cancel" ? "CANCELLED" : "FAILED";
    existing.stage = "STOPPED";
    existing.shipmentCreated = false;
    existing.purchased = false;
    existing.reserved = false;
    return { ...existing, code: input.action === "cancel" ? "FULFILLMENT_CANCELLED" : "FULFILLMENT_FAILED" };
  }
  if (existing && input.action !== "partial") {
    return { ...closedPlan("DUPLICATE_FULFILLMENT", existing.status, existing.stage), duplicate: true };
  }
  const customerOrder = input.customerOrderVerified === true && input.customerApproved === true;
  if (!customerOrder) {
    const blocked = closedPlan("ORDER_UNVERIFIED", "BLOCKED", "ORDER");
    fulfillmentPlans.set(orderNumber, blocked);
    return blocked;
  }
  if (input.supplierAccepted !== true) {
    const held = closedPlan("SUPPLIER_NOT_ACCEPTED", "HELD", "SUPPLIER");
    fulfillmentPlans.set(orderNumber, held);
    return held;
  }
  if (input.action === "partial") {
    const partial = closedPlan("PARTIAL_FULFILLMENT", "PARTIAL", "PACK", {
      linesHeld: Array.isArray(input.lines) ? input.lines.length : 0,
      linesShipped: 0,
    });
    fulfillmentPlans.set(orderNumber, partial);
    return partial;
  }
  const packed = closedPlan("CARRIER_NOT_LIVE", "HELD", "PACK");
  fulfillmentPlans.set(orderNumber, packed);
  return packed;
}

function claimShipment(input = {}) {
  const key = input.shipmentKey || input.orderNumber || "";
  if (!key) return closedPlan("SHIPMENT_KEY_UNKNOWN", "BLOCKED", "SHIPMENT");
  const synthetic = Boolean(input.trackingNumber || input.label || input.carrierResponse);
  if (shipmentClaims.has(key)) {
    return closedPlan(synthetic ? "TRACKING_NOT_A_SHIPMENT" : "DUPLICATE_SHIPMENT", "BLOCKED", "SHIPMENT", { duplicate: true });
  }
  shipmentClaims.add(key);
  if (synthetic) return closedPlan("TRACKING_NOT_A_SHIPMENT", "BLOCKED", "SHIPMENT");
  return closedPlan("CARRIER_NOT_LIVE", "HELD", "SHIPMENT");
}

function retryFulfillment(fulfillmentId, actor, req = null) {
  salesGuard.assertSupplierOrderAllowed({ req });
  const fulfillment = fulfillmentStore.readFulfillments().find((row) => row.id === fulfillmentId) || null;
  return blockedFulfillment(fulfillment ? "SUPPLIER_NOT_LIVE" : "UNKNOWN", [fulfillment ? "SUPPLIER_NOT_LIVE" : "UNKNOWN"], {
    fulfillmentId: fulfillmentId || null,
    actorRecorded: Boolean(actor),
    supplierCancelled: false,
  });
}

module.exports = {
  groupLinesBySupplier,
  createFulfillmentsForOrder,
  retryFulfillment,
  submitSupplierOrder,
  runFulfillmentPlan,
  claimShipment,
};
