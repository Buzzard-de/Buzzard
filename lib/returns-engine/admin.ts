import {
  getReturnRequest,
  listAllReturns,
  getRecoveriesForReturn,
  getDisputesForReturn,
  saveDispute,
  saveReturnRequest,
  getShipmentsForReturn,
} from "./registry";
import { getReconciliation, reconcileReturnFinancials } from "./reconciliation";
import { getReturnEvents, emitReturnEvent } from "./events";
import type { ReturnDispute, ReturnsEngineAdminRow } from "./types";

export function buildReturnAdminRow(returnId: string): ReturnsEngineAdminRow | undefined {
  const ret = getReturnRequest(returnId);
  if (!ret) return undefined;

  const recoveries = getRecoveriesForReturn(returnId);
  const supplierRecovery = recoveries.reduce((s, r) => s + r.receivedAmount, 0);
  const rec = getReconciliation(returnId);

  return {
    returnId: ret.returnId,
    returnNumber: ret.returnNumber,
    orderId: ret.orderId,
    customerId: ret.customerId,
    marketId: ret.marketId,
    channel: ret.channel,
    reason: ret.reason,
    status: ret.status,
    customerRefund: ret.customerRefundAmount,
    supplierRecovery,
    returnShipping: ret.returnShippingCost,
    marketplaceRefund: ret.marketplaceRefundAmount,
    buzzardImpact: rec?.buzzardFinalReturnImpact ?? ret.buzzardLoss,
    supplierId: ret.items[0]?.supplierId ?? "",
    hasDispute: getDisputesForReturn(returnId).length > 0,
    createdAt: ret.createdAt,
  };
}

export function getReturnsAdminOverview(): ReturnsEngineAdminRow[] {
  return listAllReturns()
    .map((r) => buildReturnAdminRow(r.returnId))
    .filter((r): r is ReturnsEngineAdminRow => r != null);
}

export function getReturnAdminDetail(returnId: string) {
  const ret = getReturnRequest(returnId);
  if (!ret) return null;
  return {
    ...ret,
    recoveries: getRecoveriesForReturn(returnId),
    disputes: getDisputesForReturn(returnId),
    shipments: getShipmentsForReturn(returnId),
    reconciliation: getReconciliation(returnId),
    events: getReturnEvents(returnId),
  };
}

export function openReturnDispute(input: {
  returnId: string;
  supplierId: string;
  reason: string;
  requestedAmount: number;
  evidence?: string[];
}): ReturnDispute {
  const now = new Date().toISOString();
  const dispute: ReturnDispute = {
    disputeId: `dsp_${input.returnId}_${Date.now()}`,
    returnId: input.returnId,
    supplierId: input.supplierId,
    reason: input.reason,
    requestedAmount: input.requestedAmount,
    evidence: input.evidence ?? [],
    status: "OPEN",
    createdAt: now,
    updatedAt: now,
  };
  saveDispute(dispute);

  emitReturnEvent({
    returnId: input.returnId,
    type: "RETURN_DISPUTED",
    source: "admin",
    metadata: { disputeId: dispute.disputeId },
  });

  return dispute;
}

export function closeReturn(returnId: string): boolean {
  const ret = getReturnRequest(returnId);
  if (!ret) return false;

  reconcileReturnFinancials(returnId, { finalize: true });
  saveReturnRequest({
    ...ret,
    status: "CLOSED",
    closedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
  emitReturnEvent({ returnId, type: "RETURN_CLOSED", source: "admin" });
  return true;
}
