const fulfillmentStore = require("./fulfillmentStore");
const salesGuard = require("./commerce/salesGuard");
const { isSalesEnabled } = require("./salesMode");
const { selectTransportCost } = require("./commerce/pricingPolicy");

const seenSupplierRequests = new Set();
const fulfillmentInFlight = new Set();

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
  const tracking = String(supplierOrder.trackingNumber || "");
  if (
    supplierOrder.mock === true ||
    supplier?.mock === true ||
    supplierOrder.demo === true ||
    tracking.startsWith("DEMO")
  ) {
    return { code: "MOCK_NOT_COMMERCIAL", submissionStatus: "BLOCKED_EXTERNAL" };
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
};
