import { recordArmingAudit } from "./audit";
import { getArmingRecord, listArmingRecords, saveArmingRecord } from "./persistence";

export function expireArmingRecords(): number {
  let expired = 0;
  const now = Date.now();
  for (const record of listArmingRecords()) {
    if (record.status !== "ARMED" && record.status !== "ARMING_READY") continue;
    if (Date.parse(record.expiresAt) > now) continue;

    const previous = record.status;
    record.status = "EXPIRED";
    record.updatedAt = new Date().toISOString();
    saveArmingRecord(record);
    expired++;

    recordArmingAudit({
      type: "PRODUCTION_ARMING_EXPIRED",
      armingId: record.armingId,
      supplierId: record.supplier,
      correlationId: record.correlationId,
      detail: { previousStatus: previous },
    });
  }
  return expired;
}

export function isArmingExpired(record: { expiresAt: string; status: string }): boolean {
  return record.status === "EXPIRED" || Date.parse(record.expiresAt) <= Date.now();
}

export function assertArmingNotExpired(armingId: string): { expired: boolean; record?: ReturnType<typeof getArmingRecord> } {
  const record = getArmingRecord(armingId);
  if (!record) return { expired: true };
  if (isArmingExpired(record)) {
    if (record.status === "ARMED") {
      record.status = "EXPIRED";
      record.updatedAt = new Date().toISOString();
      saveArmingRecord(record);
      recordArmingAudit({
        type: "PRODUCTION_ARMING_EXPIRED",
        armingId: record.armingId,
        supplierId: record.supplier,
        correlationId: record.correlationId,
      });
    }
    return { expired: true, record };
  }
  return { expired: false, record };
}
