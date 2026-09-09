import type { OrderEvent, OrderEventType } from "./types";

const eventLog: OrderEvent[] = [];
const MAX_EVENTS = 2000;

export function emitOrderEvent(event: Omit<OrderEvent, "eventId" | "timestamp">): OrderEvent {
  const full: OrderEvent = {
    ...event,
    eventId: `oevt_${event.orderId}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    timestamp: new Date().toISOString(),
  };
  eventLog.push(full);
  if (eventLog.length > MAX_EVENTS) eventLog.shift();
  return full;
}

export function getOrderEvents(orderId: string): OrderEvent[] {
  return eventLog.filter((e) => e.orderId === orderId);
}

export function clearOrderEvents(): void {
  eventLog.length = 0;
}

export function hasOrderEvent(orderId: string, type: OrderEventType): boolean {
  return eventLog.some((e) => e.orderId === orderId && e.type === type);
}
