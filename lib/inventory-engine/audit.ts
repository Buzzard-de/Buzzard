import type { StockAuditEntry, StockStatus } from "./types";

const auditLog: StockAuditEntry[] = [];
const MAX_AUDIT = 1000;

const SECRET_PATTERN = /api[_-]?key|secret|password|token|authorization|bearer|credential/i;

export function recordStockAudit(entry: Omit<StockAuditEntry, "auditId" | "timestamp">): StockAuditEntry {
  const full: StockAuditEntry = {
    ...entry,
    auditId: `aud_${entry.productId}_${Date.now()}`,
    timestamp: new Date().toISOString(),
    reason: redactAuditReason(entry.reason),
  };
  auditLog.push(full);
  if (auditLog.length > MAX_AUDIT) auditLog.shift();
  return full;
}

function redactAuditReason(reason: string): string {
  if (SECRET_PATTERN.test(reason)) return "[REDACTED]";
  return reason;
}

export function getStockAuditLog(filter?: {
  productId?: string;
  supplierId?: string;
  limit?: number;
}): StockAuditEntry[] {
  let entries = [...auditLog];
  if (filter?.productId) entries = entries.filter((e) => e.productId === filter.productId);
  if (filter?.supplierId) entries = entries.filter((e) => e.supplierId === filter.supplierId);
  entries.reverse();
  return entries.slice(0, filter?.limit ?? 50);
}

export function clearStockAuditLog(): void {
  auditLog.length = 0;
}

export function createAuditFromUpdate(
  productId: string,
  supplierId: string,
  supplierOfferId: string,
  oldQuantity: number,
  newQuantity: number,
  oldStatus: StockStatus,
  newStatus: StockStatus,
  source: string,
  reason: string,
  syncJob?: string
): StockAuditEntry {
  return recordStockAudit({
    productId,
    supplierId,
    supplierOfferId,
    oldQuantity,
    newQuantity,
    oldStatus,
    newStatus,
    source,
    syncJob,
    reason,
  });
}
