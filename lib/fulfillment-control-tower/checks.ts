import { getOrder } from "@/lib/order-engine/registry";
import { getReservation } from "@/lib/inventory-engine/reservation";
import { getProduct } from "@/lib/product-engine";
import { getSupplier, isSupplierSelectable } from "@/lib/supplier-engine/registry";
import { getSupplierHealth } from "@/lib/supplier-engine/health";
import { getSupplierOrderSandboxByReference } from "@/lib/supplier-engine/orderSandbox/persistence";
import { listOrderMappings } from "@/lib/marketplace-engine/registry";
import { getReturnByOrder } from "@/lib/returns-engine/registry";
import { readPriceSnapshotConsistency } from "./aggregator";
import { evaluateStateCompatibilityMatrix } from "./matrix";
import type { FulfillmentOperationalView, ReconciliationFinding, ReconciliationLevel } from "./types";

function f(
  checkId: string,
  category: ReconciliationFinding["category"],
  level: ReconciliationLevel,
  code: string,
  message: string
): ReconciliationFinding {
  return { checkId, category, level, code, message };
}

export function runFulfillmentChecks(view: FulfillmentOperationalView): ReconciliationFinding[] {
  const findings: ReconciliationFinding[] = [];

  const order = getOrder(view.orderId);
  if (!order) {
    findings.push(f("A", "ORDER", "CRITICAL", "ORDER_MISSING", "Central order not found"));
    return findings;
  }
  findings.push(f("A", "ORDER", "PASS", "ORDER_EXISTS", "Central order exists"));

  const assignment = order.supplierAssignments.find((a) => a.supplierId === view.supplierId);
  if (!assignment) {
    findings.push(f("B", "SUPPLIER", "CRITICAL", "ASSIGNMENT_MISSING", "Supplier assignment missing"));
  } else {
    findings.push(f("B", "SUPPLIER", "PASS", "ASSIGNMENT_EXISTS", "Supplier assignment exists"));
  }

  const product = getProduct(view.productId);
  const offer = product?.supplierOffers.find((o) => o.supplierId === view.supplierId);
  if (!offer) {
    findings.push(f("C", "SUPPLIER", "WARNING", "OFFER_MISSING", "Supplier offer no longer exists"));
  } else {
    findings.push(f("C", "SUPPLIER", "PASS", "OFFER_EXISTS", "Supplier offer exists"));
  }

  if (!view.inventoryReservationId) {
    findings.push(f("D", "INVENTORY", "CRITICAL", "RESERVATION_MISSING", "Inventory reservation missing"));
  } else {
    const reservation = getReservation(view.inventoryReservationId);
    if (!reservation) {
      findings.push(f("D", "INVENTORY", "CRITICAL", "RESERVATION_NOT_FOUND", "Inventory reservation record missing"));
    } else {
      findings.push(f("D", "INVENTORY", "PASS", "RESERVATION_EXISTS", "Inventory reservation exists"));
      if (reservation.quantity !== view.quantity) {
        findings.push(
          f("E", "INVENTORY", "CRITICAL", "RESERVATION_QTY_MISMATCH", "Reservation quantity differs from order quantity")
        );
      } else {
        findings.push(f("E", "INVENTORY", "PASS", "RESERVATION_QTY_OK", "Reservation quantity matches order"));
      }
    }
  }

  const item = order.items.find((i) => i.orderItemId === view.orderItemId) || order.items[0];
  const { snapshot, offerExists } = readPriceSnapshotConsistency(item);
  if (!view.priceSnapshotId || !snapshot) {
    findings.push(f("F", "PRICE", "CRITICAL", "PRICE_SNAPSHOT_MISSING", "Price snapshot missing"));
  } else {
    findings.push(f("F", "PRICE", "PASS", "PRICE_SNAPSHOT_EXISTS", "Price snapshot exists"));
    if (snapshot.currency !== order.currency) {
      findings.push(f("F-PRICE", "PRICE", "MISMATCH", "CURRENCY_MISMATCH", "Price snapshot currency mismatch"));
    }
    if (snapshot.supplierCost !== view.quantity * (order.items.find((i) => i.productId === view.productId)?.supplierCostSnapshot || 0) / Math.max(view.quantity, 1)) {
      /* quantity-scaled cost check uses item snapshot directly below */
    }
    if (item && snapshot.supplierCost !== item.supplierCostSnapshot) {
      findings.push(f("F-PRICE", "PRICE", "MISMATCH", "SUPPLIER_COST_DRIFT", "Live pricing differs from order snapshot"));
    } else {
      findings.push(f("F-PRICE", "PRICE", "PASS", "SUPPLIER_COST_IMMUTABLE", "Supplier cost snapshot immutable"));
    }
  }

  if (!view.supplierOrderId) {
    findings.push(f("G", "SUPPLIER_ORDER", "WARNING", "SUPPLIER_ORDER_MISSING", "Supplier order reference missing"));
  } else {
    findings.push(f("G", "SUPPLIER_ORDER", "PASS", "SUPPLIER_ORDER_EXISTS", "Supplier order reference exists"));
    const sandbox = getSupplierOrderSandboxByReference(view.supplierOrderId);
    if (view.supplierOrderClassification === "SANDBOX" && !sandbox && !view.supplierOrderId.startsWith("SANDBOX-ORDER-")) {
      findings.push(f("J", "SUPPLIER_ORDER", "MISMATCH", "SANDBOX_CLASS_INCONSISTENT", "Sandbox/live classification inconsistent"));
    } else {
      findings.push(f("J", "SUPPLIER_ORDER", "PASS", "SANDBOX_CLASS_OK", "Sandbox/live classification consistent"));
    }
  }

  if (view.idempotencyKey && view.supplierOrderId) {
    const sandbox = getSupplierOrderSandboxByReference(view.supplierOrderId);
    if (sandbox && sandbox.idempotencyKey !== view.idempotencyKey) {
      findings.push(f("K", "SUPPLIER_ORDER", "MISMATCH", "IDEMPOTENCY_MISMATCH", "Idempotency key mismatch"));
    } else {
      findings.push(f("K", "SUPPLIER_ORDER", "PASS", "IDEMPOTENCY_OK", "Idempotency key consistent"));
    }
  }

  const supplier = getSupplier(view.supplierId);
  if (!supplier) {
    findings.push(f("L", "SUPPLIER", "CRITICAL", "UNKNOWN_SUPPLIER", "Unknown supplier"));
  } else if (!isSupplierSelectable(view.supplierId)) {
    findings.push(f("L", "SUPPLIER", "CRITICAL", "SUPPLIER_DISABLED", "Supplier disabled"));
  } else {
    const health = getSupplierHealth(view.supplierId);
    if (health.healthStatus === "UNHEALTHY") {
      findings.push(f("L", "SUPPLIER", "WARNING", "SUPPLIER_UNHEALTHY", "Supplier connector unhealthy"));
    } else {
      findings.push(f("L", "SUPPLIER", "PASS", "SUPPLIER_OK", "Supplier selectable"));
    }
  }

  if (view.marketplaceId) {
    const mapping = listOrderMappings().find((m) => m.orderId === view.orderId);
    if (!mapping) {
      findings.push(f("MP", "MARKETPLACE", "MISMATCH", "MAPPING_MISSING", "Marketplace mapping missing"));
    } else {
      findings.push(f("MP", "MARKETPLACE", "PASS", "MAPPING_OK", "Marketplace mapping exists"));
    }
  }

  const returnRecord = getReturnByOrder(view.orderId);
  if (returnRecord && order.status === "DELIVERED" && returnRecord.status === "REQUESTED") {
    findings.push(f("RET", "RETURN", "WARNING", "RETURN_ORDER_STATE", "Return requested on delivered order — review"));
  }

  if (view.trackingNumber) {
    const dupes = listAllTrackingNumbers(view.trackingNumber, view.fulfillmentId);
    if (dupes > 0) {
      findings.push(f("TRK", "TRACKING", "WARNING", "DUPLICATE_TRACKING", "Duplicate tracking number detected"));
    }
  }

  if (!offerExists && product) {
    findings.push(f("INV-OFFER", "INVENTORY", "WARNING", "OFFER_DISCONTINUED", "Supplier offer discontinued"));
  }

  findings.push(...evaluateStateCompatibilityMatrix(view));

  return findings;
}

const trackingIndex = new Map<string, Set<string>>();

function listAllTrackingNumbers(trackingNumber: string, excludeFulfillmentId: string): number {
  let count = 0;
  for (const [num, ids] of trackingIndex) {
    if (num === trackingNumber) {
      for (const id of ids) {
        if (id !== excludeFulfillmentId) count++;
      }
    }
  }
  return count;
}

export function indexTrackingForTests(fulfillmentId: string, trackingNumber?: string): void {
  if (!trackingNumber) return;
  if (!trackingIndex.has(trackingNumber)) trackingIndex.set(trackingNumber, new Set());
  trackingIndex.get(trackingNumber)!.add(fulfillmentId);
}

export function resetTrackingIndexForTests(): void {
  trackingIndex.clear();
}
