/**
 * Supplier order forward (dry-run + safety gates). No live purchase.
 */
const { assertOrderReadiness, validateOrderPayload } = require("./supplierOrderReadiness");
const { getSupplierAdapter } = require("./supplierRegistry");
const { selectSupplierForOrder } = require("./supplierSelectionEngine");

async function forwardDrySupplierOrder(payload = {}) {
  const validation = validateOrderPayload(payload);
  if (!validation.ok) {
    return { ok: false, code: "ORDER_PAYLOAD_INVALID", validation, live: false };
  }
  const readiness = validation.createOrderBlocked
    ? {
        ok: true,
        dryRun: true,
        createOrderBlocked: true,
        status: validation.status,
        message: "Order payload valid; live submission blocked by safety gate",
      }
    : assertOrderReadiness(payload);
  if (!readiness.ok) {
    return { ok: false, code: readiness.code || "ORDER_NOT_READY", readiness, live: false };
  }

  const selection =
    payload.offersBySku && payload.lineItems
      ? selectSupplierForOrder({ lineItems: payload.lineItems, offersBySku: payload.offersBySku })
      : null;

  const adapter = getSupplierAdapter(payload.supplierId || selection?.lines?.[0]?.primary?.supplierId || "api-supplier-dry");
  let submit = { ok: false, code: "ORDERS_DISABLED" };
  try {
    submit = await adapter.submitOrder({
      orderId: payload.orderId,
      items: payload.items || payload.lineItems,
      dryRun: true,
    });
  } catch (err) {
    submit = { ok: false, code: err.code || "ORDERS_DISABLED", message: err.message, live: false };
  }

  return {
    ok: readiness.ok,
    readiness,
    selection,
    submit,
    tracked: {
      status: "DRY_QUEUED",
      live: false,
      trackingNumber: null,
    },
    live: false,
  };
}

module.exports = { forwardDrySupplierOrder };