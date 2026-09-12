import type { AnalyticsEventInput, RetentionPolicyConfig } from "./types";
import { DEFAULT_RETENTION_DAYS, SENSITIVE_METADATA_KEYS } from "./constants";
import {
  anonymizeEventsForVisitor,
  listEvents,
  markVisitorDeleted,
  removeEventsForVisitor,
} from "./registry";
import { recordAnalyticsAudit } from "./audit";

const PII_PATTERNS = [
  /\b[\w.+-]+@[\w-]+\.[\w.-]+\b/,
  /\b\+?\d{10,15}\b/,
  /\b\d{16}\b/,
];

export function sanitizeMetadata(metadata: Record<string, unknown> = {}): Record<string, unknown> {
  const clean: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(metadata)) {
    const lower = key.toLowerCase();
    if (SENSITIVE_METADATA_KEYS.some((s) => lower.includes(s.toLowerCase()))) continue;
    if (typeof value === "string" && PII_PATTERNS.some((p) => p.test(value))) continue;
    clean[key] = value;
  }
  return clean;
}

export function sanitizeSearchTerm(term: string): string | null {
  const trimmed = term.trim();
  if (!trimmed) return null;
  if (PII_PATTERNS.some((p) => p.test(trimmed))) return null;
  const lower = trimmed.toLowerCase();
  if (["password", "credit card", "ssn", "passport"].some((s) => lower.includes(s))) return null;
  return trimmed.slice(0, 200);
}

export function stripPiiFromEventInput(input: AnalyticsEventInput): AnalyticsEventInput {
  const { metadata, ...rest } = input;
  return {
    ...rest,
    customerIdReference: undefined,
    metadata: metadata ? sanitizeMetadata(metadata) : undefined,
  };
}

export function hashIpForStorage(_ip?: string): undefined {
  return undefined;
}

export function exportAnalyticsData(anonymousVisitorId: string): {
  events: ReturnType<typeof listEvents>;
  exportedAt: string;
} {
  recordAnalyticsAudit({
    action: "ANALYTICS_DATA_EXPORT",
    actor: "SYSTEM",
    metadata: { anonymousVisitorId },
  });
  return {
    events: listEvents().filter((e) => e.anonymousVisitorId === anonymousVisitorId),
    exportedAt: new Date().toISOString(),
  };
}

export function deleteAnalyticsData(anonymousVisitorId: string): { deletedEvents: number } {
  const deletedEvents = removeEventsForVisitor(anonymousVisitorId);
  markVisitorDeleted(anonymousVisitorId);
  recordAnalyticsAudit({
    action: "ANALYTICS_DATA_DELETE",
    actor: "SYSTEM",
    metadata: { anonymousVisitorId, deletedEvents },
  });
  return { deletedEvents };
}

export function anonymizeAnalyticsData(anonymousVisitorId: string): { anonymizedEvents: number } {
  const anonymizedEvents = anonymizeEventsForVisitor(anonymousVisitorId);
  markVisitorDeleted(anonymousVisitorId);
  recordAnalyticsAudit({
    action: "ANALYTICS_DATA_ANONYMIZE",
    actor: "SYSTEM",
    metadata: { anonymousVisitorId, anonymizedEvents },
  });
  return { anonymizedEvents };
}

export function resolveRetentionDays(config: RetentionPolicyConfig): number {
  if (config.retentionDays > 0) return config.retentionDays;
  if (config.consentCategory) return DEFAULT_RETENTION_DAYS[config.consentCategory];
  return DEFAULT_RETENTION_DAYS.ANALYTICS;
}
