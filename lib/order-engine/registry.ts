import extensions from "@/data/global/order_engine_extensions.json";
import type { BuzzardOrder, OrderItemPriceSnapshot } from "./types";

const config = extensions as typeof extensions;

const orderRegistry = new Map<string, BuzzardOrder>();
const orderByNumber = new Map<string, string>();
const ordersByCustomer = new Map<string, Set<string>>();
const idempotencyRegistry = new Map<string, { orderId: string; createdAt: string }>();
const priceSnapshotRegistry = new Map<string, OrderItemPriceSnapshot>();

let orderCounter = 0;

export function generateOrderId(): string {
  return `ord_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

export function generateOrderNumber(): string {
  orderCounter += 1;
  const year = config.orderNumberYear;
  const seq = String(orderCounter).padStart(6, "0");
  return `${config.orderNumberPrefix}-${year}-${seq}`;
}

export function saveOrder(order: BuzzardOrder): BuzzardOrder {
  orderRegistry.set(order.orderId, order);
  orderByNumber.set(order.orderNumber, order.orderId);
  if (!ordersByCustomer.has(order.customerId)) {
    ordersByCustomer.set(order.customerId, new Set());
  }
  ordersByCustomer.get(order.customerId)!.add(order.orderId);
  if (order.idempotencyKey) {
    idempotencyRegistry.set(order.idempotencyKey, {
      orderId: order.orderId,
      createdAt: order.createdAt,
    });
  }
  return order;
}

export function getOrder(orderId: string): BuzzardOrder | undefined {
  return orderRegistry.get(orderId);
}

export function getOrderByNumber(orderNumber: string): BuzzardOrder | undefined {
  const orderId = orderByNumber.get(orderNumber);
  return orderId ? orderRegistry.get(orderId) : undefined;
}

export function getOrdersByCustomer(customerId: string): BuzzardOrder[] {
  const ids = ordersByCustomer.get(customerId);
  if (!ids) return [];
  return [...ids].map((id) => orderRegistry.get(id)!).filter(Boolean);
}

export function listAllOrders(): BuzzardOrder[] {
  return [...orderRegistry.values()];
}

export function getIdempotentOrder(idempotencyKey: string): BuzzardOrder | undefined {
  const entry = idempotencyRegistry.get(idempotencyKey);
  return entry ? orderRegistry.get(entry.orderId) : undefined;
}

export function savePriceSnapshot(snapshot: OrderItemPriceSnapshot): OrderItemPriceSnapshot {
  priceSnapshotRegistry.set(snapshot.snapshotId, snapshot);
  return snapshot;
}

export function getPriceSnapshot(snapshotId: string): OrderItemPriceSnapshot | undefined {
  return priceSnapshotRegistry.get(snapshotId);
}

export function clearOrderRegistry(): void {
  orderRegistry.clear();
  orderByNumber.clear();
  ordersByCustomer.clear();
  idempotencyRegistry.clear();
  priceSnapshotRegistry.clear();
  orderCounter = 0;
}

export function getDefaultPaymentProvider(): string {
  return config.defaultPaymentProvider;
}

export function getDefaultPaymentMethod(): string {
  return config.defaultPaymentMethod;
}
