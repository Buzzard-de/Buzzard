import type { AnalyticsAuditEntry } from "./types";

const auditLog: AnalyticsAuditEntry[] = [];
let auditCounter = 0;

export function recordAnalyticsAudit(entry: Omit<AnalyticsAuditEntry, "auditId" | "timestamp">): AnalyticsAuditEntry {
  auditCounter += 1;
  const record: AnalyticsAuditEntry = {
    auditId: `aud_${Date.now()}_${auditCounter}`,
    timestamp: new Date().toISOString(),
    ...entry,
  };
  auditLog.push(record);
  return record;
}

export function getAnalyticsAuditLog(filter?: { action?: string }): AnalyticsAuditEntry[] {
  if (!filter?.action) return [...auditLog];
  return auditLog.filter((e) => e.action === filter.action);
}

export function clearAnalyticsAuditLog(): void {
  auditLog.length = 0;
  auditCounter = 0;
}
