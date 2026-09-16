const events: Array<{ eventType: string; armingId?: string; supplierId?: string; correlationId: string; detail?: Record<string, unknown>; timestamp: string }> = [];

export function emitArmingAnalytics(input: {
  eventType: string;
  armingId?: string;
  supplierId?: string;
  correlationId: string;
  detail?: Record<string, unknown>;
}): void {
  events.push({ ...input, timestamp: new Date().toISOString() });
}

export function listArmingAnalytics(limit = 100) {
  return events.slice(-limit);
}

export function resetArmingAnalyticsForTests(): void {
  events.splice(0, events.length);
}
