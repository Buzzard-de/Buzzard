const events: Array<{ eventType: string; executionId?: string; supplierId?: string; correlationId?: string; at: string }> = [];

export function emitFirstOrderAnalytics(event: {
  eventType: string;
  executionId?: string;
  supplierId?: string;
  correlationId?: string;
  detail?: Record<string, unknown>;
}): void {
  void event.detail;
  events.push({
    eventType: event.eventType,
    executionId: event.executionId,
    supplierId: event.supplierId,
    correlationId: event.correlationId,
    at: new Date().toISOString(),
  });
}

export function getFirstOrderAnalyticsSummary() {
  const count = (type: string) => events.filter((e) => e.eventType === type).length;
  return {
    first_order_attempts: count("first_order_requested") + count("first_order_ready") + count("first_order_blocked"),
    first_order_blocked: count("first_order_blocked"),
    first_order_authorized: count("first_order_authorized"),
    first_order_executed: count("first_order_executed"),
    first_order_failed: count("first_order_failed"),
    first_order_unknown_outcome: count("first_order_unknown_outcome"),
  };
}

export function resetFirstOrderAnalyticsForTests(): void {
  events.splice(0, events.length);
}
