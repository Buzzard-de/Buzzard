import type { AnalyticsEvent, AnalyticsSession, ConsentState, VisitorRecord } from "./types";

const events: AnalyticsEvent[] = [];
const sessions = new Map<string, AnalyticsSession>();
const visitors = new Map<string, VisitorRecord>();
const consentByVisitor = new Map<string, ConsentState>();
const idempotencyIndex = new Map<string, string>();
const deletedVisitorIds = new Set<string>();

let eventCounter = 0;

export function generateEventId(): string {
  eventCounter += 1;
  return `evt_${Date.now()}_${eventCounter}`;
}

export function storeEvent(event: AnalyticsEvent): void {
  events.push(event);
}

export function listEvents(): AnalyticsEvent[] {
  return [...events];
}

export function getEvent(eventId: string): AnalyticsEvent | undefined {
  return events.find((e) => e.eventId === eventId);
}

export function getSession(sessionId: string): AnalyticsSession | undefined {
  return sessions.get(sessionId);
}

export function upsertSession(session: AnalyticsSession): void {
  sessions.set(session.sessionId, session);
}

export function listSessions(): AnalyticsSession[] {
  return [...sessions.values()];
}

export function getVisitor(anonymousVisitorId: string): VisitorRecord | undefined {
  return visitors.get(anonymousVisitorId);
}

export function upsertVisitor(visitor: VisitorRecord): void {
  visitors.set(visitor.anonymousVisitorId, visitor);
}

export function listVisitors(): VisitorRecord[] {
  return [...visitors.values()];
}

export function getConsent(anonymousVisitorId: string): ConsentState | undefined {
  return consentByVisitor.get(anonymousVisitorId);
}

export function setConsent(anonymousVisitorId: string, consent: ConsentState): void {
  consentByVisitor.set(anonymousVisitorId, consent);
}

export function isIdempotencyKeyUsed(key: string): boolean {
  return idempotencyIndex.has(key);
}

export function markIdempotencyKey(key: string, eventId: string): void {
  idempotencyIndex.set(key, eventId);
}

export function getIdempotencyEventId(key: string): string | undefined {
  return idempotencyIndex.get(key);
}

export function markVisitorDeleted(anonymousVisitorId: string): void {
  deletedVisitorIds.add(anonymousVisitorId);
  visitors.delete(anonymousVisitorId);
  consentByVisitor.delete(anonymousVisitorId);
}

export function isVisitorDeleted(anonymousVisitorId: string): boolean {
  return deletedVisitorIds.has(anonymousVisitorId);
}

export function clearAnalyticsRegistry(): void {
  events.length = 0;
  sessions.clear();
  visitors.clear();
  consentByVisitor.clear();
  idempotencyIndex.clear();
  deletedVisitorIds.clear();
  eventCounter = 0;
}

export function removeEventsForVisitor(anonymousVisitorId: string): number {
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
}

export function anonymizeEventsForVisitor(anonymousVisitorId: string): number {
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
}
