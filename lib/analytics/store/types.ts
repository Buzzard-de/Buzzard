import type {
  AnalyticsAuditEntry,
  AnalyticsEvent,
  AnalyticsSession,
  ConsentState,
  VisitorRecord,
} from "../types";

export interface AnalyticsStore {
  generateEventId(): string;
  storeEvent(event: AnalyticsEvent): void;
  listEvents(): AnalyticsEvent[];
  listEventsInRange?(fromIso: string, toIso: string): AnalyticsEvent[];
  getEvent(eventId: string): AnalyticsEvent | undefined;
  getSession(sessionId: string): AnalyticsSession | undefined;
  upsertSession(session: AnalyticsSession): void;
  listSessions(): AnalyticsSession[];
  getVisitor(anonymousVisitorId: string): VisitorRecord | undefined;
  upsertVisitor(visitor: VisitorRecord): void;
  listVisitors(): VisitorRecord[];
  getConsent(anonymousVisitorId: string): ConsentState | undefined;
  setConsent(anonymousVisitorId: string, consent: ConsentState): void;
  isIdempotencyKeyUsed(key: string): boolean;
  markIdempotencyKey(key: string, eventId: string): void;
  getIdempotencyEventId(key: string): string | undefined;
  markVisitorDeleted(anonymousVisitorId: string): void;
  isVisitorDeleted(anonymousVisitorId: string): boolean;
  clear(): void;
  removeEventsForVisitor(anonymousVisitorId: string): number;
  anonymizeEventsForVisitor(anonymousVisitorId: string): number;
  recordAudit(entry: Omit<AnalyticsAuditEntry, "auditId" | "timestamp">): AnalyticsAuditEntry;
  getAuditLog(filter?: { action?: string }): AnalyticsAuditEntry[];
  clearAudit(): void;
}

export type AnalyticsPersistenceMode = "memory" | "sqlite";
