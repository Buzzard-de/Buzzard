import type { AnalyticsAuditEntry } from "./types";
import { getAnalyticsStore } from "./store/configure";

export function recordAnalyticsAudit(entry: Omit<AnalyticsAuditEntry, "auditId" | "timestamp">): AnalyticsAuditEntry {
  return getAnalyticsStore().recordAudit(entry);
}

export function getAnalyticsAuditLog(filter?: { action?: string }): AnalyticsAuditEntry[] {
  return getAnalyticsStore().getAuditLog(filter);
}

export function clearAnalyticsAuditLog(): void {
  getAnalyticsStore().clearAudit();
}
