import type { StockEvent, StockEventType, StockStatus } from "./types";

const eventLog: StockEvent[] = [];
const MAX_EVENTS = 1000;

export function emitStockEvent(event: Omit<StockEvent, "eventId" | "timestamp">): StockEvent {
  const full: StockEvent = {
    ...event,
    eventId: `evt_${event.productId}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    timestamp: new Date().toISOString(),
  };
  eventLog.push(full);
  if (eventLog.length > MAX_EVENTS) eventLog.shift();
  return full;
}

export function inferStockEventType(
  previousQuantity: number,
  newQuantity: number,
  previousStatus: StockStatus,
  newStatus: StockStatus
): StockEventType {
  if (newStatus === "DISCONTINUED") return "DISCONTINUED";
  if (previousStatus === "DISCONTINUED") return "OFFER_REACTIVATED";
  if (newStatus === "STALE") return "STOCK_STALE";
  if (previousQuantity <= 0 && newQuantity > 0) return "BACK_IN_STOCK";
  if (previousQuantity > 0 && newQuantity <= 0) return "OUT_OF_STOCK";
  if (newQuantity > previousQuantity) return "STOCK_INCREASED";
  if (newQuantity < previousQuantity) return "STOCK_DECREASED";
  return "STOCK_CHANGED";
}

export function getStockEvents(filter?: {
  productId?: string;
  supplierId?: string;
  limit?: number;
}): StockEvent[] {
  let events = [...eventLog];
  if (filter?.productId) events = events.filter((e) => e.productId === filter.productId);
  if (filter?.supplierId) events = events.filter((e) => e.supplierId === filter.supplierId);
  events.reverse();
  return events.slice(0, filter?.limit ?? 50);
}

export function clearStockEvents(): void {
  eventLog.length = 0;
}

export function getLastStockEvent(
  productId: string,
  supplierId: string,
  supplierOfferId: string
): StockEvent | undefined {
  return getStockEvents({ productId, supplierId, limit: 100 }).find(
    (e) => e.supplierOfferId === supplierOfferId
  );
}
