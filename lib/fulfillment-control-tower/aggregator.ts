import { getOrder, getPriceSnapshot, listAllOrders } from "@/lib/order-engine/registry";
import type { BuzzardOrder, OrderItem } from "@/lib/order-engine/types";
import { getReservation } from "@/lib/inventory-engine/reservation";
import { getProduct } from "@/lib/product-engine";
import { isSupplierSelectable } from "@/lib/supplier-engine/registry";
import { getSupplierHealth } from "@/lib/supplier-engine/health";
import { getSupplierOrderSandboxByReference } from "@/lib/supplier-engine/orderSandbox/persistence";
import { listOrderMappings } from "@/lib/marketplace-engine/registry";
import { getReturnByOrder } from "@/lib/returns-engine/registry";
import type {
  FulfillmentControlTowerFilter,
  FulfillmentOperationalView,
  FulfillmentStateView,
  SupplierOrderClassification,
} from "./types";

export function buildFulfillmentId(orderId: string, orderItemId: string): string {
  return `ff_${orderId}_${orderItemId}`;
}

function classifySupplierOrderReference(ref?: string): SupplierOrderClassification {
  if (!ref) return "UNKNOWN";
  if (ref.startsWith("SANDBOX-ORDER-")) return "SANDBOX";
  if (ref.startsWith("DRY-SUP-") || ref.startsWith("DRY-")) return "SANDBOX";
  return "LIVE";
}

function mapInventoryStatus(reservationId?: string): string {
  if (!reservationId) return "MISSING";
  const reservation = getReservation(reservationId);
  if (!reservation) return "MISSING";
  return reservation.status;
}

function mapSupplierHealthState(supplierId: string): string {
  if (!isSupplierSelectable(supplierId)) return "DISABLED";
  const health = getSupplierHealth(supplierId);
  return health.healthStatus || "UNKNOWN";
}

function mapShipmentStatus(order: BuzzardOrder): string {
  if (["SHIPPED", "DELIVERED"].includes(order.status)) return "SHIPPED";
  if (order.fulfillmentStatus === "SUPPLIER_PREPARED" || order.fulfillmentStatus === "SUPPLIER_SUBMITTED") {
    return "PREPARED";
  }
  return "NOT_SHIPPED";
}

function mapTrackingStatus(
  supplierOrderId?: string,
  orderStatus?: string
): { status: string; trackingNumber?: string; carrier?: string; trackingUrl?: string } {
  if (!supplierOrderId) {
    return { status: orderStatus === "SHIPPED" || orderStatus === "DELIVERED" ? "MISSING" : "NOT_AVAILABLE" };
  }
  const sandbox = getSupplierOrderSandboxByReference(supplierOrderId);
  if (sandbox?.tracking) {
    return {
      status: sandbox.tracking.shipmentStatus,
      trackingNumber: sandbox.tracking.trackingNumber,
      carrier: sandbox.tracking.carrier,
      trackingUrl: sandbox.tracking.trackingUrl,
    };
  }
  return { status: "NOT_AVAILABLE" };
}

function resolveSupplierOrderForItem(order: BuzzardOrder, item: OrderItem) {
  const supplierOrder = order.supplierOrders.find((so) => so.supplierId === item.supplierId);
  const sandbox = supplierOrder?.supplierOrderId
    ? getSupplierOrderSandboxByReference(supplierOrder.supplierOrderId)
    : undefined;
  return {
    supplierOrderId: supplierOrder?.supplierOrderId,
    supplierOrderStatus: sandbox?.status || supplierOrder?.status || "NOT_CREATED",
    classification: classifySupplierOrderReference(supplierOrder?.supplierOrderId),
    lastKnownSupplierState: sandbox?.status,
    idempotencyKey: sandbox?.idempotencyKey,
    correlationId: sandbox?.correlationId,
  };
}

function resolveMarketplaceMapping(orderId: string) {
  const mapping = listOrderMappings().find((m) => m.orderId === orderId);
  return mapping
    ? { marketplaceId: mapping.marketplaceId, marketplaceOrderId: mapping.marketplaceOrderId }
    : {};
}

function buildStateView(
  order: BuzzardOrder,
  item: OrderItem,
  supplierOrderStatus: string,
  supplierHealth: string,
  inventoryStatus: string,
  trackingStatus: string,
  returnStatus: string
): FulfillmentStateView {
  let supplierState = "UNKNOWN";
  if (!isSupplierSelectable(item.supplierId)) supplierState = "DISABLED";
  else if (supplierHealth === "HEALTHY") supplierState = "HEALTHY";
  else if (supplierHealth === "DEGRADED") supplierState = "DEGRADED";
  else if (supplierHealth === "UNHEALTHY") supplierState = "UNHEALTHY";
  else supplierState = "ELIGIBLE";

  return {
    order: order.status,
    inventory: inventoryStatus,
    supplier: supplierState,
    supplierOrder: supplierOrderStatus,
    shipment: mapShipmentStatus(order),
    tracking: trackingStatus,
    returns: returnStatus,
  };
}

export function buildFulfillmentOperationalView(order: BuzzardOrder, item: OrderItem): FulfillmentOperationalView {
  const supplierOrder = resolveSupplierOrderForItem(order, item);
  const inventoryStatus = mapInventoryStatus(item.inventoryReservationId);
  const supplierHealth = mapSupplierHealthState(item.supplierId);
  const tracking = mapTrackingStatus(supplierOrder.supplierOrderId, order.status);
  const marketplace = resolveMarketplaceMapping(order.orderId);
  const returnRecord = getReturnByOrder(order.orderId);
  const returnStatus = returnRecord?.status || order.returnRefund.returnStatus;
  const refundStatus = order.returnRefund.refundStatus;

  const stateView = buildStateView(
    order,
    item,
    supplierOrder.supplierOrderStatus,
    supplierHealth,
    inventoryStatus,
    tracking.status,
    returnStatus
  );

  const now = new Date().toISOString();
  return {
    fulfillmentId: buildFulfillmentId(order.orderId, item.orderItemId),
    orderItemId: item.orderItemId,
    orderId: order.orderId,
    orderNumber: order.orderNumber,
    customerId: order.customerId,
    marketId: order.marketId,
    channel: order.channel,
    supplierId: item.supplierId,
    supplierSku: item.sku,
    productId: item.productId,
    quantity: item.quantity,
    inventoryReservationId: item.inventoryReservationId,
    supplierOrderId: supplierOrder.supplierOrderId,
    supplierOrderStatus: supplierOrder.supplierOrderStatus,
    supplierOrderClassification: supplierOrder.classification,
    orderStatus: order.status,
    fulfillmentStatus: order.fulfillmentStatus,
    inventoryStatus,
    priceSnapshotId: item.priceSnapshotId,
    trackingStatus: tracking.status,
    trackingNumber: tracking.trackingNumber,
    carrier: tracking.carrier,
    trackingUrl: tracking.trackingUrl,
    lastKnownSupplierState: supplierOrder.lastKnownSupplierState,
    supplierHealth,
    marketplaceId: marketplace.marketplaceId,
    marketplaceOrderId: marketplace.marketplaceOrderId,
    returnStatus,
    refundStatus,
    correlationId: supplierOrder.correlationId || order.orderId,
    idempotencyKey: supplierOrder.idempotencyKey || order.idempotencyKey,
    operationalStatus: "UNKNOWN",
    stateView,
    createdAt: order.createdAt,
    updatedAt: now,
  };
}

export function listFulfillmentOperationalViews(filter?: FulfillmentControlTowerFilter): FulfillmentOperationalView[] {
  const views: FulfillmentOperationalView[] = [];
  for (const order of listAllOrders()) {
    for (const item of order.items) {
      const view = buildFulfillmentOperationalView(order, item);
      views.push(view);
    }
  }

  return views.filter((view) => {
    if (filter?.supplierId && view.supplierId !== filter.supplierId) return false;
    if (filter?.orderId && view.orderId !== filter.orderId) return false;
    if (filter?.status && view.operationalStatus !== filter.status) return false;
    if (filter?.marketplaceId && view.marketplaceId !== filter.marketplaceId) return false;
    if (filter?.dateFrom && view.createdAt < filter.dateFrom) return false;
    if (filter?.dateTo && view.createdAt > filter.dateTo) return false;
    return true;
  });
}

export function getFulfillmentOperationalView(fulfillmentId: string): FulfillmentOperationalView | undefined {
  for (const order of listAllOrders()) {
    for (const item of order.items) {
      if (buildFulfillmentId(order.orderId, item.orderItemId) === fulfillmentId) {
        return buildFulfillmentOperationalView(order, item);
      }
    }
  }
  return undefined;
}

export function getFulfillmentViewsForOrder(orderId: string): FulfillmentOperationalView[] {
  const order = getOrder(orderId);
  if (!order) return [];
  return order.items.map((item) => buildFulfillmentOperationalView(order, item));
}

/** Read-only diagnostics helpers used by reconciliation checks. */
export function readPriceSnapshotConsistency(item: OrderItem) {
  const snapshot = item.priceSnapshotId ? getPriceSnapshot(item.priceSnapshotId) : undefined;
  const product = getProduct(item.productId);
  const offer = product?.supplierOffers.find(
    (o) => o.supplierId === item.supplierId && o.supplierSku === item.sku
  );
  return { snapshot, offer, productExists: Boolean(product), offerExists: Boolean(offer) };
}
