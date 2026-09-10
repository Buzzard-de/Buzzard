import type { ReturnAuditEntry, ReturnStatus } from "./types";

const auditLog: ReturnAuditEntry[] = [];
const MAX_AUDIT = 2000;

const SECRET_PATTERN = /password|token|credential|api[_-]?key|secret|bearer|authorization|cvv|card/i;

function generateAuditId(): string {
  return `rta_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export function recordReturnAudit(input: {
  returnId: string;
  actor: string;
  action: string;
  oldStatus?: ReturnStatus;
  newStatus?: ReturnStatus;
  amount?: number;
  currency?: string;
  supplierId?: string;
}): ReturnAuditEntry {
  if (SECRET_PATTERN.test(input.actor)) {
    input = { ...input, actor: "[REDACTED]" };
  }
  const entry: ReturnAuditEntry = {
    auditId: generateAuditId(),
    returnId: input.returnId,
    actor: input.actor,
    action: input.action,
    oldStatus: input.oldStatus,
    newStatus: input.newStatus,
    amount: input.amount,
    currency: input.currency,
    supplierId: input.supplierId,
    timestamp: new Date().toISOString(),
  };
  auditLog.push(entry);
  if (auditLog.length > MAX_AUDIT) auditLog.shift();
  return entry;
}

export function getReturnAuditLog(returnId?: string): ReturnAuditEntry[] {
  return returnId ? auditLog.filter((a) => a.returnId === returnId) : [...auditLog];
}

export function clearReturnAuditLog(): void {
  auditLog.length = 0;
}
