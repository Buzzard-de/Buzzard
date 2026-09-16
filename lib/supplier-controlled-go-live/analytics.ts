const events: Array<{ eventType: string; goLiveId?: string; supplierId?: string; correlationId?: string; at: string }> = [];

export function emitGoLiveAnalytics(event: {
  eventType: string;
  goLiveId?: string;
  supplierId?: string;
  correlationId?: string;
}): void {
  events.push({ ...event, at: new Date().toISOString() });
}

export function getGoLiveAnalyticsSummary() {
  const count = (type: string) => events.filter((e) => e.eventType === type).length;
  return {
    first_order_validated: count("first_order_validated"),
    first_order_validation_failed: count("first_order_validation_failed"),
    go_live_review_requests: count("go_live_review_requested") + count("go_live_review_ready"),
    go_live_blocks: count("go_live_blocked"),
    go_live_approvals: count("go_live_approved"),
    controlled_go_live_activations: count("controlled_go_live_activated"),
    go_live_rollbacks: count("go_live_rollback"),
    go_live_expirations: count("go_live_expired"),
  };
}

export function resetGoLiveAnalyticsForTests(): void {
  events.splice(0, events.length);
}
