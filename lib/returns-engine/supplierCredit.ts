import {
  getReturnRequest,
  saveSupplierRecovery,
  getRecoveriesForReturn,
  saveReturnRequest,
} from "./registry";
import { emitReturnEvent } from "./events";
import { recordReturnAudit } from "./audit";
import type { SupplierRecovery, SupplierRecoveryType } from "./types";

/**
 * Supplier reimbursement must never be assumed unless actually confirmed/received.
 * Approved ≠ Received.
 */

export function recordSupplierRecovery(input: {
  returnId: string;
  supplierId: string;
  type: SupplierRecoveryType;
  requestedAmount: number;
  approvedAmount?: number;
  receivedAmount?: number;
  currency: string;
  reference?: string;
}): SupplierRecovery {
  const now = new Date().toISOString();
  const approved = input.approvedAmount ?? 0;
  const received = input.receivedAmount ?? 0;

  let status: SupplierRecovery["status"] = "REQUESTED";
  if (approved > 0 && received === 0) status = "APPROVED";
  if (received > 0 && received < approved) status = "PARTIALLY_RECEIVED";
  if (received >= approved && approved > 0) status = "RECEIVED";
  if (input.type === "NO_RECOVERY") status = "REJECTED";

  const recovery: SupplierRecovery = {
    recoveryId: `rec_${input.returnId}_${Date.now()}`,
    returnId: input.returnId,
    supplierId: input.supplierId,
    type: input.type,
    requestedAmount: input.requestedAmount,
    approvedAmount: approved,
    receivedAmount: received,
    currency: input.currency,
    status,
    requestedAt: now,
    approvedAt: approved > 0 ? now : undefined,
    receivedAt: received > 0 ? now : undefined,
    reference: input.reference,
  };
  saveSupplierRecovery(recovery);

  const ret = getReturnRequest(input.returnId);
  if (ret) {
    const totalReceived = getRecoveriesForReturn(input.returnId).reduce(
      (s, r) => s + r.receivedAmount,
      0
    );
    saveReturnRequest({
      ...ret,
      supplierRefundAmount: getRecoveriesForReturn(input.returnId)
        .filter((r) => r.type === "SUPPLIER_REFUND")
        .reduce((s, r) => s + r.receivedAmount, 0),
      supplierCreditAmount: getRecoveriesForReturn(input.returnId)
        .filter((r) => r.type === "SUPPLIER_CREDIT" || r.type === "PARTIAL_CREDIT")
        .reduce((s, r) => s + r.receivedAmount, 0),
      buzzardRecovery: totalReceived,
      updatedAt: now,
    });
  }

  const eventType =
    received > 0
      ? input.type === "SUPPLIER_CREDIT" || input.type === "PARTIAL_CREDIT"
        ? "SUPPLIER_CREDIT_RECEIVED"
        : "SUPPLIER_REFUND_RECEIVED"
      : "SUPPLIER_REFUND_REQUESTED";

  emitReturnEvent({
    returnId: input.returnId,
    type: eventType,
    source: "returns-engine",
    metadata: { recoveryId: recovery.recoveryId, receivedAmount: received },
  });
  recordReturnAudit({
    returnId: input.returnId,
    actor: "returns-engine",
    action: "SUPPLIER_RECOVERY_RECORDED",
    amount: received,
    currency: input.currency,
    supplierId: input.supplierId,
  });

  return recovery;
}

export function calculatePartialRecoveryGap(
  customerRefund: number,
  supplierRecovery: number
): { unrecoveredAmount: number } {
  return { unrecoveredAmount: Math.max(0, customerRefund - supplierRecovery) };
}
