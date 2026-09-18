import { randomUUID } from "crypto";
import { assertReturnsRefundsSafety } from "./safety";
import { saveRecoveryRecord, getRecoveryRecord } from "./persistence";
import type { RecoveryStage, SupplierRecoveryRecord } from "./types";

export function initiateSupplierRecovery(input: {
  returnId: string;
  orderId: string;
  supplierId: string;
  estimatedAmount: number;
}): SupplierRecoveryRecord {
  assertReturnsRefundsSafety();
  const record: SupplierRecoveryRecord = {
    recoveryId: randomUUID(),
    returnId: input.returnId,
    orderId: input.orderId,
    supplierId: input.supplierId,
    stage: "ESTIMATED",
    estimatedAmount: input.estimatedAmount,
    assumed: false,
    dryRun: true,
    updatedAt: new Date().toISOString(),
  };
  saveRecoveryRecord(record);
  return record;
}

export function advanceRecoveryStage(recoveryId: string, stage: RecoveryStage, amount?: number): SupplierRecoveryRecord {
  assertReturnsRefundsSafety();
  const record = getRecoveryRecord(recoveryId);
  if (!record) throw new Error("RECOVERY_NOT_FOUND");
  const updated: SupplierRecoveryRecord = {
    ...record,
    stage,
    updatedAt: new Date().toISOString(),
  };
  if (stage === "REQUESTED" && amount !== undefined) updated.requestedAmount = amount;
  if (stage === "APPROVED" && amount !== undefined) updated.approvedAmount = amount;
  if (stage === "RECEIVED" && amount !== undefined) updated.receivedAmount = amount;
  if (stage === "FINAL" && amount !== undefined) updated.finalAmount = amount;
  saveRecoveryRecord(updated);
  return updated;
}

export function assertSupplierRecoveryNeverAssumed(record: SupplierRecoveryRecord): void {
  if (record.assumed) throw new Error("SUPPLIER_RECOVERY_ASSUMED_FORBIDDEN");
}
