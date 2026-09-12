import type { AdminAnalyticsContext, AnalyticsEventInput } from "./types";
import { SENSITIVE_METADATA_KEYS } from "./constants";

export function validateAdminAccess(context: AdminAnalyticsContext): { ok: boolean; errorCode?: string } {
  if (!context.adminAuthorized) return { ok: false, errorCode: "ADMIN_UNAUTHORIZED" };
  return { ok: true };
}

export function validateCrossCustomerAccess(
  requestedCustomerId: string | undefined,
  contextCustomerId: string | undefined
): { ok: boolean; errorCode?: string } {
  if (!requestedCustomerId) return { ok: true };
  if (!contextCustomerId) return { ok: false, errorCode: "UNAUTHORIZED_CUSTOMER_ACCESS" };
  if (requestedCustomerId !== contextCustomerId) return { ok: false, errorCode: "CROSS_CUSTOMER_ACCESS" };
  return { ok: true };
}

export function detectSensitiveMetadata(metadata: Record<string, unknown> = {}): string[] {
  const hits: string[] = [];
  for (const key of Object.keys(metadata)) {
    if (SENSITIVE_METADATA_KEYS.some((s) => key.toLowerCase().includes(s.toLowerCase()))) {
      hits.push(key);
    }
  }
  return hits;
}

export function rejectEventInjection(input: AnalyticsEventInput): { ok: boolean; errors: string[] } {
  const errors: string[] = [];
  const sensitive = detectSensitiveMetadata(input.metadata);
  if (sensitive.length) errors.push(`SENSITIVE_METADATA:${sensitive.join(",")}`);

  if (input.metadata?.overwriteAuthoritativeRevenue === true) {
    errors.push("AUTHORITY_BYPASS");
  }

  return { ok: errors.length === 0, errors };
}
