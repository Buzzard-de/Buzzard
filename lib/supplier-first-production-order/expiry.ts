import { getFirstProductionOrderRecord, saveFirstProductionOrderRecord } from "./persistence";
import { recordFirstOrderAudit } from "./audit";

export function assertFirstProductionOrderNotExpired(executionId: string): {
  expired: boolean;
  record?: ReturnType<typeof getFirstProductionOrderRecord>;
} {
  const record = getFirstProductionOrderRecord(executionId);
  if (!record) return { expired: true };
  if (Date.parse(record.expiresAt) <= Date.now()) {
    record.state = "EXPIRED";
    record.updatedAt = new Date().toISOString();
    saveFirstProductionOrderRecord(record);
    recordFirstOrderAudit({
      type: "FIRST_ORDER_EXPIRED",
      executionId: record.executionId,
      supplierId: record.supplier,
      correlationId: record.correlationId,
    });
    return { expired: true, record };
  }
  return { expired: false, record };
}
