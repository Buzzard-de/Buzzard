import { recordAnalyticsAudit } from "@/lib/analytics/audit";

const EVENTS = new Set([
  "validation_started",
  "validation_blocked",
  "validation_passed",
  "production_attempt_blocked",
  "unknown_outcome",
  "duplicate_prevented",
]);

export function emitCreateOrderValidationAnalytics(input: {
  eventType: string;
  validationId?: string;
  supplierId?: string;
  correlationId: string;
  detail?: Record<string, unknown>;
}): void {
  if (!EVENTS.has(input.eventType)) return;
  recordAnalyticsAudit({
    action: `create_order_${input.eventType}`,
    actor: "supplier-production-order-validation",
    metadata: {
      validationId: input.validationId,
      supplierId: input.supplierId,
      correlationId: input.correlationId,
      ...input.detail,
    },
  });
}
