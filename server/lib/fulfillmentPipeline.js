const crypto = require("crypto");
const supplierStore = require("./supplierStore");
const fulfillmentStore = require("./fulfillmentStore");
const { getTrackingUrl } = require("./carriers");
const { logAudit } = require("./audit");

function groupLinesBySupplier(lines, productsById) {
  const groups = new Map();
  for (const line of lines) {
    const product = productsById.get(line.productId);
    const supplierId = product?.supplier_id || "SUP-INTERNAL-001";
    const bucket = groups.get(supplierId) || [];
    bucket.push({ ...line, supplierId, supplierSku: product?.supplier_sku || line.sku });
    groups.set(supplierId, bucket);
  }
  return groups;
}

function supplierModel(supplierId) {
  const supplier = supplierStore.getSupplier(supplierId);
  if (!supplier) return "warehouse";
  return supplier.dropshipping ? "dropshipping" : "warehouse";
}

function submitSupplierOrder(supplierOrder, supplier) {
  if (!supplier?.active) {
    return { ok: false, error: "Supplier inactive" };
  }

  if (!process.env.SUPPLIER_API_SECRET && supplier?.auth_type !== "none") {
    const trackingNumber = `DEMO${Date.now().toString().slice(-10)}`;
    return {
      ok: true,
      demo: true,
      supplierResponse: { accepted: true, reference: `SUP-REF-${supplierOrder.id.slice(-8)}` },
      trackingNumber,
      trackingCarrier: supplier.dropshipping ? "DHL" : "DPD",
      status: "confirmed",
    };
  }

  if (supplier?.auth_type === "none" || supplier?.feed_type === "manual") {
    const trackingNumber = `DEMO${Date.now().toString().slice(-10)}`;
    return {
      ok: true,
      demo: true,
      supplierResponse: { accepted: true, reference: `WH-${supplierOrder.id.slice(-8)}` },
      trackingNumber,
      trackingCarrier: "DPD",
      status: "confirmed",
    };
  }

  return {
    ok: true,
    supplierResponse: { accepted: true, reference: supplierOrder.id },
    status: "confirmed",
  };
}

function createFulfillmentsForOrder(order, productsById) {
  const groups = groupLinesBySupplier(order.lines, productsById);
  const results = [];

  for (const [supplierId, lines] of groups.entries()) {
    const idempotencyKey = `${order.orderNumber}:${supplierId}`;
    let fulfillment = fulfillmentStore.findFulfillmentByIdempotency(idempotencyKey);
    if (!fulfillment) {
      fulfillment = fulfillmentStore.createFulfillment({
        orderNumber: order.orderNumber,
        supplierId,
        model: supplierModel(supplierId),
        lines,
      });
    }

    let supplierOrder = fulfillmentStore.readSupplierOrders().find((o) => o.idempotencyKey === idempotencyKey);
    if (!supplierOrder) {
      supplierOrder = fulfillmentStore.createSupplierOrder({
        orderNumber: order.orderNumber,
        supplierId,
        lines,
        shippingAddress: order.shippingAddress,
        idempotencyKey,
      });
      fulfillmentStore.updateFulfillment(fulfillment.id, {
        supplierOrderId: supplierOrder.id,
        status: "submitted",
      });
    }

    const supplier = supplierStore.getSupplier(supplierId);
    const submission = submitSupplierOrder(supplierOrder, supplier);

    if (!submission.ok) {
      fulfillmentStore.updateSupplierOrder(supplierOrder.id, {
        status: "failed",
        error: submission.error,
        retryCount: (supplierOrder.retryCount || 0) + 1,
      });
      fulfillmentStore.updateFulfillment(fulfillment.id, {
        status: "failed",
        error: submission.error,
        retryCount: (fulfillment.retryCount || 0) + 1,
      });
      try {
        const automationEngine = require("./automationEngine");
        automationEngine.emit(
          "supplier_import_failure",
          {
            supplierId,
            orderNumber: order.orderNumber,
            error: submission.error || "Supplier submission failed",
          },
          { idempotencyKey: `${order.orderNumber}:${supplierId}:fail` }
        );
      } catch {
        /* non-blocking */
      }
      results.push({ fulfillment, supplierOrder, shipment: null, error: submission.error });
      continue;
    }

    fulfillmentStore.updateSupplierOrder(supplierOrder.id, {
      status: submission.status || "confirmed",
      supplierResponse: submission.supplierResponse,
      trackingNumber: submission.trackingNumber || null,
      trackingCarrier: submission.trackingCarrier || null,
    });

    fulfillmentStore.updateFulfillment(fulfillment.id, { status: "confirmed" });

    let shipment = fulfillmentStore.readShipments().find((s) => s.fulfillmentId === fulfillment.id);
    if (!submission.trackingNumber) {
      shipment = shipment || fulfillmentStore.createShipment({
        orderNumber: order.orderNumber,
        fulfillmentId: fulfillment.id,
        supplierId,
        lines,
        carrier: submission.trackingCarrier || "DHL",
      });
      fulfillmentStore.updateShipment(shipment.id, { status: "preparing" });
    } else {
      shipment = shipment || fulfillmentStore.createShipment({
        orderNumber: order.orderNumber,
        fulfillmentId: fulfillment.id,
        supplierId,
        lines,
        carrier: submission.trackingCarrier || "DHL",
      });
      fulfillmentStore.updateShipment(shipment.id, {
        trackingNumber: submission.trackingNumber,
        trackingUrl: getTrackingUrl(submission.trackingCarrier, submission.trackingNumber),
        status: "handed_to_carrier",
      });
      try {
        const automationEngine = require("./automationEngine");
        automationEngine.emit(
          "order_shipped",
          {
            orderNumber: order.orderNumber,
            email: order.customer?.email,
            shipmentId: shipment.id,
            trackingNumber: submission.trackingNumber,
            language: "de",
          },
          { idempotencyKey: `ship:${shipment.id}` }
        );
      } catch {
        /* non-blocking */
      }
    }

    results.push({ fulfillment, supplierOrder, shipment });
  }

  return results;
}

function retryFulfillment(fulfillmentId, actor) {
  const fulfillment = fulfillmentStore.readFulfillments().find((f) => f.id === fulfillmentId);
  if (!fulfillment) return null;

  const supplierOrder = fulfillmentStore.readSupplierOrders().find((o) => o.id === fulfillment.supplierOrderId);
  if (!supplierOrder) return null;

  if (supplierOrder.status === "confirmed") {
    return { ok: false, errorKey: "logistics.fulfillment.alreadyConfirmed" };
  }

  const supplier = supplierStore.getSupplier(fulfillment.supplierId);
  const submission = submitSupplierOrder(supplierOrder, supplier);
  if (!submission.ok) {
    fulfillmentStore.updateSupplierOrder(supplierOrder.id, {
      status: "failed",
      error: submission.error,
      retryCount: (supplierOrder.retryCount || 0) + 1,
    });
    fulfillmentStore.updateFulfillment(fulfillment.id, {
      status: "failed",
      error: submission.error,
      retryCount: (fulfillment.retryCount || 0) + 1,
    });
    return { ok: false, errorKey: "logistics.fulfillment.retryFailed" };
  }

  fulfillmentStore.updateSupplierOrder(supplierOrder.id, {
    status: submission.status || "confirmed",
    supplierResponse: submission.supplierResponse,
    trackingNumber: submission.trackingNumber || supplierOrder.trackingNumber,
    trackingCarrier: submission.trackingCarrier || supplierOrder.trackingCarrier,
    error: null,
    retryCount: (supplierOrder.retryCount || 0) + 1,
  });
  fulfillmentStore.updateFulfillment(fulfillment.id, { status: "confirmed", error: null });

  if (submission.trackingNumber) {
    const shipment = fulfillmentStore.readShipments().find((s) => s.fulfillmentId === fulfillment.id);
    if (shipment) {
      fulfillmentStore.updateShipment(shipment.id, {
        trackingNumber: submission.trackingNumber,
        status: "handed_to_carrier",
      });
    }
  }

  if (actor) {
    logAudit({
      userId: actor.userId,
      userEmail: actor.email,
      action: "fulfillment_retry",
      entityType: "fulfillment",
      entityId: fulfillment.id,
      field: "status",
      oldValue: "failed",
      newValue: "confirmed",
    });
  }

  return { ok: true, fulfillment: fulfillmentStore.readFulfillments().find((f) => f.id === fulfillmentId) };
}

module.exports = {
  groupLinesBySupplier,
  createFulfillmentsForOrder,
  retryFulfillment,
  submitSupplierOrder,
};
