import { recordFirstOrderAudit } from "./audit";
import { recordUnknownOutcome } from "./safety";
import { saveFirstProductionOrderRecord } from "./persistence";
import type { FirstProductionOrderRecord } from "./types";

export function markFirstOrderExecuted(record: FirstProductionOrderRecord, supplierOrderReference: string): FirstProductionOrderRecord {
  record.state = "EXECUTED";
  record.supplierOrderReference = supplierOrderReference;
  record.executedAt = new Date().toISOString();
  record.updatedAt = record.executedAt;
  saveFirstProductionOrderRecord(record);

  recordFirstOrderAudit({
    type: "FIRST_ORDER_EXECUTED",
    executionId: record.executionId,
    orderId: record.orderId,
    supplierId: record.supplier,
    correlationId: record.correlationId,
    detail: { supplierOrderReference, payloadHash: record.payload.payloadHash },
  });

  return record;
}

export function markFirstOrderFailed(record: FirstProductionOrderRecord, reason: string): FirstProductionOrderRecord {
  record.state = "EXECUTION_FAILED";
  record.blockerCodes = [...record.blockerCodes, reason];
  record.updatedAt = new Date().toISOString();
  saveFirstProductionOrderRecord(record);

  recordFirstOrderAudit({
    type: "FIRST_ORDER_FAILED",
    executionId: record.executionId,
    orderId: record.orderId,
    supplierId: record.supplier,
    correlationId: record.correlationId,
    detail: { reason },
  });

  return record;
}

export function markFirstOrderUnknownOutcome(record: FirstProductionOrderRecord, reason: string): FirstProductionOrderRecord {
  record.state = "UNKNOWN_OUTCOME";
  record.unknownOutcome = true;
  record.blockerCodes = [...record.blockerCodes, reason];
  record.updatedAt = new Date().toISOString();
  saveFirstProductionOrderRecord(record);
  recordUnknownOutcome();

  recordFirstOrderAudit({
    type: "FIRST_ORDER_UNKNOWN_OUTCOME",
    executionId: record.executionId,
    orderId: record.orderId,
    supplierId: record.supplier,
    correlationId: record.correlationId,
    detail: { reason, noAutoRetry: true },
  });

  return record;
}
