import { getReturnRequest, saveReturnReceipt, saveReturnRequest } from "./registry";
import { emitReturnEvent } from "./events";
import type { ProductCondition, ReturnReceipt } from "./types";

export function recordReturnReceipt(input: {
  returnId: string;
  receivedBy: string;
  packageCondition: ProductCondition;
  items: Array<{
    returnItemId: string;
    expectedQuantity: number;
    receivedQuantity: number;
    itemCondition: ProductCondition;
  }>;
}): ReturnReceipt | undefined {
  const ret = getReturnRequest(input.returnId);
  if (!ret) return undefined;

  const receipt: ReturnReceipt = {
    returnId: input.returnId,
    receivedAt: new Date().toISOString(),
    receivedBy: input.receivedBy,
    packageCondition: input.packageCondition,
    items: input.items,
  };
  saveReturnReceipt(receipt);

  const hasMissing = input.items.some((i) => i.receivedQuantity < i.expectedQuantity);
  const nextStatus = hasMissing ? "INSPECTION_PENDING" : "RECEIVED";

  saveReturnRequest({
    ...ret,
    status: nextStatus,
    receivedAt: receipt.receivedAt,
    updatedAt: receipt.receivedAt,
  });

  emitReturnEvent({
    returnId: input.returnId,
    type: "RETURN_RECEIVED",
    source: "returns-engine",
    metadata: { hasMissing, receivedBy: input.receivedBy },
  });

  return receipt;
}

export function completeReturnInspection(returnId: string): boolean {
  const ret = getReturnRequest(returnId);
  if (!ret) return false;

  saveReturnRequest({
    ...ret,
    status: "INSPECTED",
    updatedAt: new Date().toISOString(),
  });

  emitReturnEvent({
    returnId,
    type: "RETURN_INSPECTION_COMPLETED",
    source: "returns-engine",
  });

  return true;
}
