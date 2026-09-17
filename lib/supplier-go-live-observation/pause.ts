import { getBroaderRolloutRecord, saveBroaderRolloutRecord, getObservationRecord, saveObservationRecord } from "./persistence";
import { recordObservationAudit } from "./audit";

export function pauseBroaderRollout(input: {
  rolloutId: string;
  actorId: string;
}): { ok: boolean } {
  const rollout = getBroaderRolloutRecord(input.rolloutId);
  if (!rollout || rollout.state !== "BROADER_ROLLOUT_ACTIVE") return { ok: false };

  rollout.state = "PAUSED";
  rollout.pausedAt = new Date().toISOString();
  rollout.updatedAt = rollout.pausedAt;
  saveBroaderRolloutRecord(rollout);

  const observation = getObservationRecord(rollout.observationId);
  if (observation) {
    observation.state = "PAUSED";
    observation.updatedAt = rollout.updatedAt;
    saveObservationRecord(observation);
  }

  recordObservationAudit({
    type: "BROADER_ROLLOUT_PAUSED",
    observationId: rollout.observationId,
    rolloutId: rollout.rolloutId,
    supplierId: rollout.supplier,
    correlationId: rollout.correlationId,
    actor: input.actorId,
  });

  return { ok: true };
}
