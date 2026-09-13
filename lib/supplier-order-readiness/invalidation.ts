import { invalidateReadiness } from "./evaluator";
import type { ReadinessScope } from "./types";

export type InvalidationReason =
  | "SUPPLIER_DISABLED"
  | "STOCK_STALE"
  | "CRITICAL_INCIDENT"
  | "PRICE_POLICY_CHANGED"
  | "CREDENTIAL_REVOKED";

export function invalidateReadinessForEvent(
  scope: ReadinessScope,
  reason: InvalidationReason,
  correlationId: string
) {
  return invalidateReadiness(scope, reason, correlationId);
}
