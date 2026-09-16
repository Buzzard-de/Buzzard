import { recordArmingAudit } from "./audit";
import { emitArmingAnalytics } from "./analytics";
import { getArmingRecord, saveArmingRecord } from "./persistence";
import { isAiActor } from "@/lib/supplier-production-order-validation/eligibility";

export function disarmProductionOrder(input: {
  armingId: string;
  actorId: string;
  reason?: string;
}): { ok: boolean; record?: ReturnType<typeof getArmingRecord>; blockers?: string[] } {
  if (isAiActor(input.actorId)) {
    return { ok: false, blockers: ["AI_BOUNDARY:DISARM_FORBIDDEN"] };
  }

  const record = getArmingRecord(input.armingId);
  if (!record) return { ok: false, blockers: ["ARMING_NOT_FOUND"] };
  if (record.status !== "ARMED" && record.status !== "ARMING_READY") {
    return { ok: false, blockers: ["NOT_ARMED"] };
  }

  record.status = "DISARMED";
  record.disarmedBy = input.actorId;
  record.disarmedAt = new Date().toISOString();
  record.updatedAt = record.disarmedAt;
  saveArmingRecord(record);

  recordArmingAudit({
    type: "PRODUCTION_DISARMED",
    armingId: record.armingId,
    supplierId: record.supplier,
    correlationId: record.correlationId,
    actor: input.actorId,
    detail: { reason: input.reason || "manual_disarm" },
  });

  emitArmingAnalytics({
    eventType: "production_disarmed",
    armingId: record.armingId,
    supplierId: record.supplier,
    correlationId: record.correlationId,
  });

  return { ok: true, record };
}
