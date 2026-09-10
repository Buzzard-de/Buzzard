import {
  getReturnRequest,
  getSupplierReturn,
  saveSupplierReturn,
  saveReturnRequest,
} from "./registry";
import { emitReturnEvent } from "./events";
import type { SupplierReturnRecord } from "./types";

export function prepareSupplierReturn(returnId: string): SupplierReturnRecord | undefined {
  const ret = getReturnRequest(returnId);
  if (!ret) return undefined;

  const now = new Date().toISOString();
  const supplierId = ret.items[0]?.supplierId ?? "UNKNOWN";
  const supplierOfferId = ret.items[0]?.supplierOfferId ?? "UNKNOWN";

  const record: SupplierReturnRecord = {
    supplierReturnId: `sr_${returnId}_${Date.now()}`,
    returnId,
    supplierId,
    supplierOfferId,
    items: ret.items.map((i) => ({ returnItemId: i.returnItemId, quantity: i.quantity })),
    quantity: ret.items.reduce((s, i) => s + i.quantity, 0),
    status: "PREPARED",
    dryRun: true,
    createdAt: now,
    updatedAt: now,
  };
  saveSupplierReturn(record);

  saveReturnRequest({
    ...ret,
    status: "SUPPLIER_PENDING",
    updatedAt: now,
  });

  emitReturnEvent({
    returnId,
    type: "SUPPLIER_RETURN_PREPARED",
    source: "returns-engine",
    metadata: { supplierReturnId: record.supplierReturnId },
  });

  return record;
}

export function acceptSupplierReturn(supplierReturnId: string): SupplierReturnRecord | undefined {
  const record = getSupplierReturn(supplierReturnId);
  if (!record) return undefined;

  const updated: SupplierReturnRecord = {
    ...record,
    status: "ACCEPTED",
    confirmedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  saveSupplierReturn(updated);

  emitReturnEvent({
    returnId: record.returnId,
    type: "SUPPLIER_RETURN_ACCEPTED",
    source: "returns-engine",
  });

  const ret = getReturnRequest(record.returnId);
  if (ret) {
    saveReturnRequest({ ...ret, status: "SUPPLIER_ACCEPTED", updatedAt: updated.updatedAt });
  }

  return updated;
}

export function rejectSupplierReturn(supplierReturnId: string): SupplierReturnRecord | undefined {
  const record = getSupplierReturn(supplierReturnId);
  if (!record) return undefined;

  const updated: SupplierReturnRecord = {
    ...record,
    status: "REJECTED",
    updatedAt: new Date().toISOString(),
  };
  saveSupplierReturn(updated);

  emitReturnEvent({
    returnId: record.returnId,
    type: "SUPPLIER_RETURN_REJECTED",
    source: "returns-engine",
  });

  const ret = getReturnRequest(record.returnId);
  if (ret) {
    saveReturnRequest({ ...ret, status: "SUPPLIER_REJECTED", updatedAt: updated.updatedAt });
  }

  return updated;
}
