const events: Array<{ eventType: string; observationId?: string; rolloutId?: string; supplierId?: string; correlationId: string; at: string }> = [];

export function emitObservationAnalytics(input: {
  eventType: string;
  observationId?: string;
  rolloutId?: string;
  supplierId?: string;
  correlationId: string;
}): void {
  events.push({ ...input, at: new Date().toISOString() });
}

export function getObservationAnalyticsSummary() {
  const counts: Record<string, number> = {};
  for (const e of events) counts[e.eventType] = (counts[e.eventType] || 0) + 1;
  return counts;
}

export function resetObservationAnalyticsForTests(): void {
  events.splice(0, events.length);
}
