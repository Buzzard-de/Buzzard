import type {
  AnalyticsAuditEntry,
  AnalyticsEvent,
  AnalyticsSession,
  ConsentState,
  VisitorRecord,
} from "../types";
import type { AnalyticsStore } from "./types";

export function createMemoryAnalyticsStore(): AnalyticsStore {
  const events: AnalyticsEvent[] = [];
  const sessions = new Map<string, AnalyticsSession>();
  const visitors = new Map<string, VisitorRecord>();
  const consentByVisitor = new Map<string, ConsentState>();
  const idempotencyIndex = new Map<string, string>();
  const deletedVisitorIds = new Set<string>();
  const auditLog: AnalyticsAuditEntry[] = [];
  let eventCounter = 0;
  let auditCounter = 0;

  return {
    generateEventId() {
      eventCounter += 1;
      return `evt_${Date.now()}_${eventCounter}`;
    },

    storeEvent(event) {
      events.push(event);
    },

    listEvents() {
      return [...events];
    },

    listEventsInRange(fromIso, toIso) {
      return events.filter((event) => event.timestamp >= fromIso && event.timestamp <= toIso);
    },

    getEvent(eventId) {
      return events.find((e) => e.eventId === eventId);
    },

    getSession(sessionId) {
      return sessions.get(sessionId);
    },

    upsertSession(session) {
      sessions.set(session.sessionId, session);
    },

    listSessions() {
      return [...sessions.values()];
    },

    getVisitor(anonymousVisitorId) {
      return visitors.get(anonymousVisitorId);
    },

    upsertVisitor(visitor) {
      visitors.set(visitor.anonymousVisitorId, visitor);
    },

    listVisitors() {
      return [...visitors.values()];
    },

    getConsent(anonymousVisitorId) {
      return consentByVisitor.get(anonymousVisitorId);
    },

    setConsent(anonymousVisitorId, consent) {
      consentByVisitor.set(anonymousVisitorId, consent);
    },

    isIdempotencyKeyUsed(key) {
      return idempotencyIndex.has(key);
    },

    markIdempotencyKey(key, eventId) {
      idempotencyIndex.set(key, eventId);
    },

    getIdempotencyEventId(key) {
      return idempotencyIndex.get(key);
    },

    markVisitorDeleted(anonymousVisitorId) {
      deletedVisitorIds.add(anonymousVisitorId);
      visitors.delete(anonymousVisitorId);
      consentByVisitor.delete(anonymousVisitorId);
    },

    isVisitorDeleted(anonymousVisitorId) {
      return deletedVisitorIds.has(anonymousVisitorId);
    },

    clear() {
      events.length = 0;
      sessions.clear();
      visitors.clear();
      consentByVisitor.clear();
      idempotencyIndex.clear();
      deletedVisitorIds.clear();
      auditLog.length = 0;
      eventCounter = 0;
      auditCounter = 0;
    },

    removeEventsForVisitor(anonymousVisitorId) {
      let removed = 0;
      for (let i = events.length - 1; i >= 0; i--) {
        if (events[i].anonymousVisitorId === anonymousVisitorId) {
          events.splice(i, 1);
          removed += 1;
        }
      }
      for (const [id, session] of sessions) {
        if (session.anonymousVisitorId === anonymousVisitorId) sessions.delete(id);
      }
      return removed;
    },

    anonymizeEventsForVisitor(anonymousVisitorId) {
      let count = 0;
      for (const event of events) {
        if (event.anonymousVisitorId === anonymousVisitorId) {
          event.anonymousVisitorId = "anon_deleted";
          event.customerIdReference = undefined;
          event.metadata = {};
          count += 1;
        }
      }
      return count;
    },

    recordAudit(entry) {
      auditCounter += 1;
      const record: AnalyticsAuditEntry = {
        auditId: `aud_${Date.now()}_${auditCounter}`,
        timestamp: new Date().toISOString(),
        action: entry.action,
        actor: entry.actor,
        metadata: entry.metadata,
      };
      auditLog.push(record);
      return record;
    },

    getAuditLog(filter) {
      if (!filter?.action) return [...auditLog];
      return auditLog.filter((e) => e.action === filter.action);
    },

    clearAudit() {
      auditLog.length = 0;
      auditCounter = 0;
    },
  };
}
