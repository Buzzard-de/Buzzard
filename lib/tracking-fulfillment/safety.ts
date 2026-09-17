import { assertProductionFlagDisabled, enforceCiProductionSafety } from "@/lib/production-defaults";
import { isSupplierOrderNetworkEnabled } from "@/lib/supplier-engine/network";

const counters = { realHttpCalls: 0, fabricatedTrackingIds: 0, webhookProcessed: 0 };

export function getTrackingSafetyCounters() {
  return { ...counters };
}

export function resetTrackingSafetyCountersForTests(): void {
  for (const k of Object.keys(counters) as Array<keyof typeof counters>) counters[k] = 0;
}

export function assertTrackingNetworkSafety(): void {
  enforceCiProductionSafety("TRACKING_349");
  assertProductionFlagDisabled("SUPPLIER_ORDER_NETWORK", "TRACKING_349");
  if (isSupplierOrderNetworkEnabled()) throw new Error("TRACKING_349:NETWORK_MUST_BE_OFF");
}

export function assertTrackingSafetyInvariants(): { ok: boolean; violations: string[] } {
  const violations: string[] = [];
  if (counters.realHttpCalls !== 0) violations.push(`realHttpCalls=${counters.realHttpCalls}`);
  if (counters.fabricatedTrackingIds !== 0) violations.push(`fabricatedTrackingIds=${counters.fabricatedTrackingIds}`);
  return { ok: violations.length === 0, violations };
}
