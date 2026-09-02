/**
 * Part 23 — Supplier order readiness (CREATE ORDER blocked while supplierOrdersBlocked=true).
 */
const { isSupplierOrdersBlocked, assertSupplierOperation } = require("./supplierSafetyGate");
const { SUPPLIER_READINESS_STATUS, SUPPLIER_ERROR_CODE } = require("../../core/supplierIntegrationConstants");
const { createSupplierError } = require("./supplierErrors");

function validateOrderPayload(payload = {}) {
  const issues = [];
  if (!payload.supplierId) issues.push({ field: "supplierId", code: "missing_supplier" });
  if (!payload.items?.length) issues.push({ field: "items", code: "missing_items" });
  for (const item of payload.items || []) {
    if (!item.supplierSku && !item.sku) {
      issues.push({ field: "items", code: "missing_sku", item });
    }
    if (item.quantity == null || Number(item.quantity) <= 0) {
      issues.push({ field: "items", code: "invalid_quantity", item });
    }
  }

  return {
    ok: issues.length === 0,
    status: issues.length ? SUPPLIER_READINESS_STATUS.BLOCKED : SUPPLIER_READINESS_STATUS.PASS,
    issues,
    createOrderBlocked: isSupplierOrdersBlocked(),
    blockedReason: isSupplierOrdersBlocked() ? "supplierOrdersBlocked=true" : null,
  };
}

function assertOrderReadiness(payload = {}, context = {}) {
  const validation = validateOrderPayload(payload);
  if (!validation.ok) {
    return createSupplierError(SUPPLIER_ERROR_CODE.VALIDATION_FAILED, {
      message: "Order payload validation failed",
      details: validation,
      supplierId: payload.supplierId,
    });
  }

  const gate = assertSupplierOperation("supplier_order", {
    req: context.req,
    body: { ...payload, submitOrder: true },
    dryRun: true,
    supplierId: payload.supplierId,
  });

  if (!gate.ok) {
    return createSupplierError(SUPPLIER_ERROR_CODE.SUPPLIER_ORDER_BLOCKED, {
      message: "Supplier order creation blocked",
      details: gate,
      supplierId: payload.supplierId,
    });
  }

  return {
    ok: true,
    status: SUPPLIER_READINESS_STATUS.PASS,
    dryRun: true,
    createOrderBlocked: true,
    message: "Order readiness validated — submission blocked by safety gate",
  };
}

module.exports = {
  validateOrderPayload,
  assertOrderReadiness,
};
