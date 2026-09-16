import { getArmingRecord } from "@/lib/supplier-production-order-arming/persistence";
import { loadOfficialValidationEvidence } from "./evidence";
import type { FirstProductionOrderPayload } from "./types";

/**
 * #344 first-order gate — uses #343 arming + #342 evidence, not #340 preview (which hardcodes UNVERIFIED).
 */
export function evaluateFirstProductionOrderGate(input: {
  payload: FirstProductionOrderPayload;
}): { allowed: boolean; blockers: string[]; armed: boolean } {
  const blockers: string[] = [];
  const arming = getArmingRecord(input.payload.armingId);
  const armed = arming?.status === "ARMED";
  if (!armed) blockers.push("PRODUCTION_NOT_ARMED");

  if (input.payload.purpose !== "FIRST_PRODUCTION_ORDER") blockers.push("NOT_FIRST_PRODUCTION_ORDER");

  const { evidence, blockers: evidenceBlockers } = loadOfficialValidationEvidence({
    supplierId: input.payload.supplierId,
    market: input.payload.market,
    channel: input.payload.channel,
    environment: "PRODUCTION",
  });
  blockers.push(...evidenceBlockers);
  if (!evidence || evidence.createOrderCapability !== "VALIDATED") {
    blockers.push("CREATE_ORDER_UNVERIFIED");
  }

  if (arming && Date.parse(arming.expiresAt) <= Date.now()) blockers.push("ARMING_EXPIRED");

  return { allowed: blockers.length === 0, blockers: [...new Set(blockers)], armed: Boolean(armed) };
}
