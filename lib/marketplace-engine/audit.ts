import type { MarketplaceAuditEntry } from "./types";

const auditLog: MarketplaceAuditEntry[] = [];
const MAX_AUDIT = 2000;

const SECRET_PATTERN = /password|token|credential|api[_-]?key|secret|bearer|authorization/i;

function generateAuditId(): string {
  return `mpa_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function redactMetadata(metadata?: Record<string, unknown>): Record<string, unknown> | undefined {
  if (!metadata) return undefined;
  const redacted: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(metadata)) {
    if (SECRET_PATTERN.test(key)) {
      redacted[key] = "[REDACTED]";
    } else {
      redacted[key] = value;
    }
  }
  return redacted;
}

export function recordMarketplaceAudit(input: {
  marketplaceId: string;
  actor: string;
  action: string;
  relatedListingId?: string;
  relatedOrderId?: string;
  statusTransition?: string;
  metadata?: Record<string, unknown>;
}): MarketplaceAuditEntry {
  const entry: MarketplaceAuditEntry = {
    auditId: generateAuditId(),
    marketplaceId: input.marketplaceId,
    actor: input.actor,
    action: input.action,
    timestamp: new Date().toISOString(),
    relatedListingId: input.relatedListingId,
    relatedOrderId: input.relatedOrderId,
    statusTransition: input.statusTransition,
  };
  auditLog.push(entry);
  if (auditLog.length > MAX_AUDIT) auditLog.shift();
  void redactMetadata(input.metadata);
  return entry;
}

export function getMarketplaceAuditLog(marketplaceId?: string): MarketplaceAuditEntry[] {
  return marketplaceId ? auditLog.filter((a) => a.marketplaceId === marketplaceId) : [...auditLog];
}

export function clearMarketplaceAuditLog(): void {
  auditLog.length = 0;
}
