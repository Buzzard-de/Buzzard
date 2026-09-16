import { getControlledGoLiveRecord, saveControlledGoLiveRecord } from "./persistence";
import { recordGoLiveAudit } from "./audit";

export function assertGoLiveNotExpired(goLiveId: string): {
  expired: boolean;
  record?: ReturnType<typeof getControlledGoLiveRecord>;
} {
  const record = getControlledGoLiveRecord(goLiveId);
  if (!record) return { expired: true };
  if (Date.parse(record.expiresAt) <= Date.now()) {
    record.state = record.state === "CONTROLLED_GO_LIVE" ? "EXPIRED" : record.state;
    record.updatedAt = new Date().toISOString();
    saveControlledGoLiveRecord(record);
    recordGoLiveAudit({
      type: "CONTROLLED_GO_LIVE_EXPIRED",
      goLiveId: record.goLiveId,
      supplierId: record.supplier,
      correlationId: record.correlationId,
    });
    return { expired: true, record };
  }
  return { expired: false, record };
}
