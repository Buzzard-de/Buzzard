/**
 * Part 23 — Shipping/tracking readiness architecture (no real shipment calls).
 */
const { SUPPLIER_READINESS_STATUS } = require("../../core/supplierIntegrationConstants");
const { getSupplierDefinition } = require("./supplierRegistry");

function evaluateShippingReadiness(supplierId) {
  const def = getSupplierDefinition(supplierId);
  if (!def) {
    return { ok: false, supplierId, error: "unknown_supplier" };
  }

  const flow = [
    { step: "supplier", status: SUPPLIER_READINESS_STATUS.PASS, detail: def.id },
    { step: "order", status: SUPPLIER_READINESS_STATUS.BLOCKED, detail: "supplierOrdersBlocked" },
    { step: "shipment", status: SUPPLIER_READINESS_STATUS.BLOCKED, detail: "no_live_shipment_calls" },
    { step: "tracking", status: SUPPLIER_READINESS_STATUS.CONDITION, detail: "architecture_ready" },
  ];

  return {
    ok: true,
    supplierId,
    diagnosticOnly: true,
    autoActivate: false,
    flow,
    dropshipping: def.dropshipping || {},
    capabilities: {
      shipping: SUPPLIER_READINESS_STATUS.BLOCKED,
      tracking: SUPPLIER_READINESS_STATUS.CONDITION,
    },
  };
}

module.exports = {
  evaluateShippingReadiness,
};
