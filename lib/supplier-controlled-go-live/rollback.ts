import { isAiActor } from "@/lib/supplier-production-order-validation/eligibility";
import { recordGoLiveAudit } from "./audit";
import { getControlledGoLiveRecord, saveControlledGoLiveRecord } from "./persistence";

export function rollbackControlledGoLive(input: {
  goLiveId: string;
  actorId: string;
  reason?: string;
}): { ok: boolean; record?: ReturnType<typeof getControlledGoLiveRecord>; blockers?: string[] } {
  if (isAiActor(input.actorId)) return { ok: false, blockers: ["AI_BOUNDARY:ROLLBACK_FORBIDDEN"] };

  const record = getControlledGoLiveRecord(input.goLiveId);
  if (!record) return { ok: false, blockers: ["GO_LIVE_NOT_FOUND"] };

  record.state = "ROLLED_BACK";
  record.rolledBackAt = new Date().toISOString();
  record.updatedAt = record.rolledBackAt;
  record.blockerCodes = [...record.blockerCodes, input.reason || "MANUAL_ROLLBACK"];
  saveControlledGoLiveRecord(record);

  recordGoLiveAudit({
    type: "GO_LIVE_ROLLBACK",
    goLiveId: record.goLiveId,
    supplierId: record.supplier,
    correlationId: record.correlationId,
    actor: input.actorId,
    detail: { reason: input.reason, note: "Existing orders preserved" },
  });

  return { ok: true, record };
}

export function pauseControlledGoLive(input: {
  goLiveId: string;
  actorId: string;
}): { ok: boolean; record?: ReturnType<typeof getControlledGoLiveRecord>; blockers?: string[] } {
  if (isAiActor(input.actorId)) return { ok: false, blockers: ["AI_BOUNDARY:PAUSE_FORBIDDEN"] };

  const record = getControlledGoLiveRecord(input.goLiveId);
  if (!record) return { ok: false, blockers: ["GO_LIVE_NOT_FOUND"] };
  if (record.state !== "CONTROLLED_GO_LIVE") return { ok: false, blockers: ["NOT_ACTIVE"] };

  record.state = "PAUSED";
  record.pausedAt = new Date().toISOString();
  record.updatedAt = record.pausedAt;
  saveControlledGoLiveRecord(record);

  recordGoLiveAudit({
    type: "CONTROLLED_GO_LIVE_PAUSED",
    goLiveId: record.goLiveId,
    supplierId: record.supplier,
    correlationId: record.correlationId,
    actor: input.actorId,
  });

  return { ok: true, record };
}
