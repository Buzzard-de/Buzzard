import { getSupplierPersistence } from "./persistence";
import { redactSecrets } from "./security";

export type SupplierAuditAction =
  | "supplier.enabled"
  | "supplier.disabled"
  | "supplier.sync.started"
  | "supplier.sync.completed"
  | "supplier.sync.failed"
  | "supplier.cursor.reset"
  | "supplier.configuration.changed"
  | "supplier.order.dry_run";

export function recordSupplierEngineAudit(entry: {
  actor?: string;
  supplierId: string;
  action: SupplierAuditAction;
  correlationId?: string;
  metadata?: Record<string, unknown>;
}): void {
  getSupplierPersistence()?.recordAudit({
    actor: entry.actor || "system",
    supplierId: entry.supplierId,
    action: entry.action,
    correlationId: entry.correlationId,
    metadata: redactSecrets(entry.metadata || {}),
    timestamp: new Date().toISOString(),
  });
}

export function listSupplierEngineAudit(supplierId: string, limit = 50) {
  return getSupplierPersistence()?.listAudit(supplierId, limit) ?? [];
}
