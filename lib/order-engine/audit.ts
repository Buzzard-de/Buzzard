import type { OrderAuditEntry, OrderStatus } from "./types";

const auditLog: OrderAuditEntry[] = [];
const MAX_AUDIT = 2000;

const SECRET_PATTERN = /api[_-]?key|secret|password|token|authorization|bearer|credential|card/i;

export function recordOrderAudit(entry: Omit<OrderAuditEntry, "auditId" | "timestamp">): OrderAuditEntry {
  const sanitized = sanitizeAuditMetadata(entry.metadata);
  const full: OrderAuditEntry = {
    ...entry,
    metadata: sanitized,
    auditId: `oaud_${entry.orderId}_${Date.now()}`,
    timestamp: new Date().toISOString(),
  };
  auditLog.push(full);
  if (auditLog.length > MAX_AUDIT) auditLog.shift();
  return full;
}

function sanitizeAuditMetadata(metadata?: Record<string, unknown>): Record<string, unknown> | undefined {
  if (!metadata) return metadata;
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(metadata)) {
    if (SECRET_PATTERN.test(key)) {
      result[key] = "[REDACTED]";
    } else {
      result[key] = value;
    }
  }
  return result;
}

export function getOrderAuditLog(orderId: string): OrderAuditEntry[] {
  return auditLog.filter((a) => a.orderId === orderId);
}

export function clearOrderAuditLog(): void {
  auditLog.length = 0;
}

export function recordStatusTransition(
  orderId: string,
  actor: string,
  fromStatus: OrderStatus,
  toStatus: OrderStatus,
  metadata?: Record<string, unknown>
): OrderAuditEntry {
  return recordOrderAudit({
    orderId,
    actor,
    action: "STATUS_TRANSITION",
    fromStatus,
    toStatus,
    metadata,
  });
}
