import { getObservationRecord, getBroaderRolloutRecord, saveObservationRecord, saveBroaderRolloutRecord } from "./persistence";
import { recordObservationAudit } from "./audit";

export function assertObservationNotExpired(observationId: string): {
  expired: boolean;
  record?: ReturnType<typeof getObservationRecord>;
} {
  const record = getObservationRecord(observationId);
  if (!record) return { expired: true };
  if (Date.parse(record.expiresAt) <= Date.now()) {
    record.state = "EXPIRED";
    record.updatedAt = new Date().toISOString();
    saveObservationRecord(record);
    recordObservationAudit({
      type: "BROADER_ROLLOUT_EXPIRED",
      observationId,
      supplierId: record.supplier,
      correlationId: record.correlationId,
      detail: { reason: "OBSERVATION_EXPIRED" },
    });
    return { expired: true, record };
  }
  return { expired: false, record };
}

export function assertRolloutNotExpired(rolloutId: string): {
  expired: boolean;
  record?: ReturnType<typeof getBroaderRolloutRecord>;
} {
  const record = getBroaderRolloutRecord(rolloutId);
  if (!record) return { expired: true };
  if (Date.parse(record.expiresAt) <= Date.now()) {
    record.state = "EXPIRED";
    record.updatedAt = new Date().toISOString();
    saveBroaderRolloutRecord(record);
    recordObservationAudit({
      type: "BROADER_ROLLOUT_EXPIRED",
      rolloutId,
      observationId: record.observationId,
      supplierId: record.supplier,
      correlationId: record.correlationId,
    });
    return { expired: true, record };
  }
  return { expired: false, record };
}
