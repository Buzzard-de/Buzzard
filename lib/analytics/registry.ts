import type { AnalyticsEvent, AnalyticsSession, ConsentState, VisitorRecord } from "./types";
import { getAnalyticsStore } from "./store/configure";

export function generateEventId(): string {
  return getAnalyticsStore().generateEventId();
}

export function storeEvent(event: AnalyticsEvent): void {
  getAnalyticsStore().storeEvent(event);
}

export function listEvents(): AnalyticsEvent[] {
  return getAnalyticsStore().listEvents();
}

export function listEventsInRange(fromIso: string, toIso: string): AnalyticsEvent[] {
  const store = getAnalyticsStore();
  if (typeof store.listEventsInRange === "function") {
    return store.listEventsInRange(fromIso, toIso);
  }
  return listEvents().filter((event) => event.timestamp >= fromIso && event.timestamp <= toIso);
}

export function getEvent(eventId: string): AnalyticsEvent | undefined {
  return getAnalyticsStore().getEvent(eventId);
}

export function getSession(sessionId: string): AnalyticsSession | undefined {
  return getAnalyticsStore().getSession(sessionId);
}

export function upsertSession(session: AnalyticsSession): void {
  getAnalyticsStore().upsertSession(session);
}

export function listSessions(): AnalyticsSession[] {
  return getAnalyticsStore().listSessions();
}

export function getVisitor(anonymousVisitorId: string): VisitorRecord | undefined {
  return getAnalyticsStore().getVisitor(anonymousVisitorId);
}

export function upsertVisitor(visitor: VisitorRecord): void {
  getAnalyticsStore().upsertVisitor(visitor);
}

export function listVisitors(): VisitorRecord[] {
  return getAnalyticsStore().listVisitors();
}

export function getConsent(anonymousVisitorId: string): ConsentState | undefined {
  return getAnalyticsStore().getConsent(anonymousVisitorId);
}

export function setConsent(anonymousVisitorId: string, consent: ConsentState): void {
  getAnalyticsStore().setConsent(anonymousVisitorId, consent);
}

export function isIdempotencyKeyUsed(key: string): boolean {
  return getAnalyticsStore().isIdempotencyKeyUsed(key);
}

export function markIdempotencyKey(key: string, eventId: string): void {
  getAnalyticsStore().markIdempotencyKey(key, eventId);
}

export function getIdempotencyEventId(key: string): string | undefined {
  return getAnalyticsStore().getIdempotencyEventId(key);
}

export function markVisitorDeleted(anonymousVisitorId: string): void {
  getAnalyticsStore().markVisitorDeleted(anonymousVisitorId);
}

export function isVisitorDeleted(anonymousVisitorId: string): boolean {
  return getAnalyticsStore().isVisitorDeleted(anonymousVisitorId);
}

export function clearAnalyticsRegistry(): void {
  getAnalyticsStore().clear();
}

export function removeEventsForVisitor(anonymousVisitorId: string): number {
  return getAnalyticsStore().removeEventsForVisitor(anonymousVisitorId);
}

export function anonymizeEventsForVisitor(anonymousVisitorId: string): number {
  return getAnalyticsStore().anonymizeEventsForVisitor(anonymousVisitorId);
}
