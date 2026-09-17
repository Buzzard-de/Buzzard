import { getBroaderRolloutRecord, saveBroaderRolloutRecord, getObservationRecord, saveObservationRecord } from "./persistence";
import { recordObservationAudit } from "./audit";

export function rollbackBroaderRollout(input: {
  rolloutId: string;
  actorId: string;
  reason?: string;
}): { ok: boolean } {
  const rollout = getBroaderRolloutRecord(input.rolloutId);
  if (!rollout) return { ok: false };

  rollout.state = "ROLLED_BACK";
  rollout.rolledBackAt = new Date().toISOString();
  rollout.updatedAt = rollout.rolledBackAt;
  saveBroaderRolloutRecord(rollout);

  const observation = getObservationRecord(rollout.observationId);
  if (observation) {
    observation.state = "ROLLED_BACK";
    observation.updatedAt = rollout.updatedAt;
    saveObservationRecord(observation);
  }

  recordObservationAudit({
    type: "BROADER_ROLLOUT_ROLLED_BACK",
    observationId: rollout.observationId,
    rolloutId: rollout.rolloutId,
    supplierId: rollout.supplier,
    correlationId: rollout.correlationId,
    actor: input.actorId,
    detail: { reason: input.reason },
  });

  return { ok: true };
}
