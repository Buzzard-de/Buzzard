import type { ProductEvent, ProductEventType } from "./types";

const eventLog: ProductEvent[] = [];
const MAX_EVENTS = 5000;

export function emitProductEvent(
  type: ProductEventType,
  productId: string,
  payload?: Record<string, unknown>
): ProductEvent {
  const event: ProductEvent = {
    type,
    productId,
    timestamp: new Date().toISOString(),
    payload,
  };
  eventLog.push(event);
  if (eventLog.length > MAX_EVENTS) eventLog.shift();
  return event;
}

export function getProductEvents(productId?: string): ProductEvent[] {
  if (!productId) return [...eventLog];
  return eventLog.filter((e) => e.productId === productId);
}

export function clearProductEvents(): void {
  eventLog.length = 0;
}
