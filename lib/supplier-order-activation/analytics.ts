import { recordAnalyticsAudit } from "@/lib/analytics/audit";

const ACTIVATION_EVENTS = new Set([
  "activation_requested",
  "activation_preflight",
  "activation_approved",
  "activation_armed",
  "activation_blocked",
  "activation_revoked",
  "first_order_prepared",
  "first_order_blocked",
  "first_order_sent",
  "first_order_failed",
  "first_order_confirmed",
]);

export function emitActivationAnalytics(input: {
  eventType: string;
  activationId?: string;
  supplierId?: string;
  correlationId: string;
  detail?: Record<string, unknown>;
}): void {
  if (!ACTIVATION_EVENTS.has(input.eventType)) return;
  recordAnalyticsAudit({
    action: `supplier_order_${input.eventType}`,
    actor: "supplier-order-activation",
    metadata: {
      activationId: input.activationId,
      supplierId: input.supplierId,
      correlationId: input.correlationId,
      ...input.detail,
    },
  });
}
