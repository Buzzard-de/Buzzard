import type { FulfillmentOperationalView, ReconciliationFinding, ReconciliationLevel } from "./types";

function finding(
  checkId: string,
  category: ReconciliationFinding["category"],
  level: ReconciliationLevel,
  code: string,
  message: string
): ReconciliationFinding {
  return { checkId, category, level, code, message };
}

export function evaluateStateCompatibilityMatrix(view: FulfillmentOperationalView): ReconciliationFinding[] {
  const out: ReconciliationFinding[] = [];

  const paidLike = ["PAID", "CONFIRMED", "PROCESSING", "SUPPLIER_PENDING", "SUPPLIER_CONFIRMED", "SHIPPED", "DELIVERED"].includes(
    view.orderStatus
  );

  if (paidLike && view.inventoryStatus === "MISSING") {
    out.push(finding("MATRIX-A", "INVENTORY", "CRITICAL", "PAID_NO_RESERVATION", "Paid order without inventory reservation"));
  } else if (paidLike && view.inventoryStatus === "ACTIVE") {
    out.push(finding("MATRIX-A", "INVENTORY", "PASS", "PAID_WITH_RESERVATION", "Paid order has active reservation"));
  }

  if (view.orderStatus === "SUPPLIER_PENDING" && !view.supplierOrderId) {
    out.push(
      finding("MATRIX-B", "SUPPLIER_ORDER", "CRITICAL", "SUPPLIER_PENDING_NO_ORDER", "Central order pending supplier without supplier order reference")
    );
  }

  if (view.supplierOrderClassification === "SANDBOX" && view.supplierOrderStatus === "SANDBOX_ACCEPTED") {
    out.push(finding("MATRIX-C", "SUPPLIER_ORDER", "PASS", "SANDBOX_ACCEPTED_OK", "Sandbox supplier order accepted with sandbox reference"));
  }

  if (view.supplierOrderClassification === "LIVE" && view.supplierOrderId?.startsWith("SANDBOX-ORDER-")) {
    out.push(
      finding("MATRIX-D", "SUPPLIER_ORDER", "CRITICAL", "SANDBOX_REF_MARKED_LIVE", "Sandbox supplier reference incorrectly classified as live")
    );
  }

  if (view.orderStatus === "SHIPPED" && view.trackingStatus === "NOT_AVAILABLE") {
    out.push(finding("MATRIX-E", "TRACKING", "WARNING", "SHIPPED_NO_TRACKING", "Order shipped without tracking information"));
  }

  if (view.orderStatus === "DELIVERED" && view.stateView.shipment === "NOT_SHIPPED") {
    out.push(finding("MATRIX-F", "TRACKING", "CRITICAL", "DELIVERED_NO_SHIPMENT", "Delivered order without shipment history"));
  }

  if (view.orderStatus === "CANCELLED" && view.inventoryStatus === "ACTIVE") {
    out.push(finding("MATRIX-G", "INVENTORY", "MISMATCH", "CANCELLED_ACTIVE_RESERVATION", "Cancelled order still has active reservation"));
  }

  if (view.orderStatus === "PROCESSING" && view.supplierOrderStatus === "FAILED") {
    out.push(finding("MATRIX-H", "SUPPLIER_ORDER", "CRITICAL", "PROCESSING_SUPPLIER_FAILED", "Central order processing while supplier order failed"));
  }

  if (view.orderStatus === "SHIPPED" && view.supplierOrderStatus === "SANDBOX_ACCEPTED") {
    out.push(
      finding("MATRIX-I", "SUPPLIER_ORDER", "MISMATCH", "SHIPPED_SANDBOX_ONLY", "Central order shipped but supplier order still sandbox-accepted")
    );
  }

  if (view.supplierHealth === "DISABLED" && paidLike) {
    out.push(finding("MATRIX-J", "SUPPLIER", "CRITICAL", "DISABLED_SUPPLIER_ACTIVE_FULFILLMENT", "Disabled supplier on active fulfillment"));
  } else if (view.supplierHealth === "UNHEALTHY" && paidLike) {
    out.push(finding("MATRIX-J", "SUPPLIER", "WARNING", "UNHEALTHY_SUPPLIER", "Unhealthy supplier on active fulfillment"));
  } else if (view.supplierHealth === "DEGRADED" && paidLike) {
    out.push(finding("MATRIX-J", "SUPPLIER", "WARNING", "DEGRADED_SUPPLIER", "Degraded supplier on active fulfillment"));
  } else if (view.supplierHealth === "HEALTHY" && paidLike) {
    out.push(finding("MATRIX-J", "SUPPLIER", "PASS", "SUPPLIER_HEALTHY", "Supplier health acceptable"));
  }

  return out;
}

export function aggregateOverallLevel(findings: ReconciliationFinding[]): ReconciliationLevel {
  if (findings.some((f) => f.level === "CRITICAL")) return "CRITICAL";
  if (findings.some((f) => f.level === "MISMATCH")) return "MISMATCH";
  if (findings.some((f) => f.level === "WARNING")) return "WARNING";
  return "PASS";
}
