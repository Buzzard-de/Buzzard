/**
 * Automotive Production Integration — direct shipping / dropshipping manager.
 */
const { recordIntegrationAudit } = require("./integrationAudit");

function sanitizeShippingAddress(address = {}) {
  return {
    country: address.country,
    postalCode: address.postalCode ? "[REDACTED]" : null,
    city: address.city ? "[REDACTED]" : null,
  };
}

function buildSupplierShippingPayload(order = {}, customerAddress = {}) {
  return {
    orderId: order.orderId,
    supplierId: order.supplierId,
    items: (order.items || []).map((i) => ({
      supplierSku: i.supplierSku,
      quantity: i.quantity,
    })),
    shipTo: {
      name: "[ENCRYPTED]",
      street: "[ENCRYPTED]",
      city: "[ENCRYPTED]",
      postalCode: "[ENCRYPTED]",
      country: customerAddress.country || "DE",
    },
    directShipping: true,
    piiProtected: true,
  };
}

function processSupplierShippingResponse(response = {}) {
  recordIntegrationAudit({
    action: "SHIPMENT_CREATED",
    entityId: response.orderId,
    metadata: {
      carrier: response.carrier,
      trackingNumber: response.trackingNumber ? "[PRESENT]" : null,
      estimatedDelivery: response.estimatedDelivery,
    },
  });

  return {
    trackingNumber: response.trackingNumber || null,
    carrier: response.carrier || null,
    estimatedDelivery: response.estimatedDelivery || null,
    status: response.status || "PENDING",
    directShipping: true,
  };
}

function createShipment(order = {}, options = {}) {
  const payload = buildSupplierShippingPayload(order, options.customerAddress || {});
  return {
    ok: true,
    mode: "DRY_RUN",
    payload,
    sanitizedLog: sanitizeShippingAddress(options.customerAddress || {}),
    live: false,
  };
}

module.exports = {
  buildSupplierShippingPayload,
  processSupplierShippingResponse,
  createShipment,
  sanitizeShippingAddress,
};
