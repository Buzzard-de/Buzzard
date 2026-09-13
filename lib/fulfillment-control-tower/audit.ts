const auditLog: Array<Record<string, unknown>> = [];

export function recordControlTowerAudit(entry: {
  action: string;
  actor?: string;
  correlationId?: string;
  metadata?: Record<string, unknown>;
}): void {
  auditLog.unshift({
    action: entry.action,
    actor: entry.actor || "control-tower",
    correlationId: entry.correlationId,
    metadata: entry.metadata || {},
    timestamp: new Date().toISOString(),
  });
  if (auditLog.length > 500) auditLog.length = 500;
}

export function listControlTowerAudit(limit = 50): Array<Record<string, unknown>> {
  return auditLog.slice(0, limit);
}

export function clearControlTowerAuditForTests(): void {
  auditLog.length = 0;
}
