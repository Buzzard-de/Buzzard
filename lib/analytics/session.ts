import type { AnalyticsEvent, AnalyticsSession, DeviceType, TrafficSourceType } from "./types";
import { SESSION_TIMEOUT_MS } from "./constants";
import { generateEventId } from "./registry";
import { getSession, listSessions, upsertSession } from "./registry";
import { incrementVisitorSession } from "./visitor";

export function generateSessionId(): string {
  return `ses_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

export function isSessionExpired(session: AnalyticsSession, nowMs: number): boolean {
  const last = Date.parse(session.lastActivityAt);
  return nowMs - last > SESSION_TIMEOUT_MS;
}

export function getOrCreateSession(params: {
  sessionId?: string;
  anonymousVisitorId: string;
  timestamp: string;
  landingPage?: string;
  trafficSource: TrafficSourceType;
  market: string;
  language: string;
  deviceType: DeviceType;
}): AnalyticsSession {
  const nowMs = Date.parse(params.timestamp);
  if (params.sessionId) {
    const existing = getSession(params.sessionId);
    if (existing && !isSessionExpired(existing, nowMs)) {
      return existing;
    }
  }

  incrementVisitorSession(params.anonymousVisitorId);
  const session: AnalyticsSession = {
    sessionId: params.sessionId && getSession(params.sessionId) ? generateSessionId() : params.sessionId ?? generateSessionId(),
    anonymousVisitorId: params.anonymousVisitorId,
    startedAt: params.timestamp,
    lastActivityAt: params.timestamp,
    landingPage: params.landingPage,
    pageViews: 0,
    productViews: 0,
    cartEvents: 0,
    checkoutStarted: false,
    purchaseCompleted: false,
    trafficSource: params.trafficSource,
    market: params.market,
    language: params.language,
    deviceType: params.deviceType,
  };
  upsertSession(session);
  return session;
}

export function updateSessionFromEvent(session: AnalyticsSession, event: AnalyticsEvent): AnalyticsSession {
  const updated: AnalyticsSession = {
    ...session,
    lastActivityAt: event.timestamp,
    exitPage: event.pagePath ?? session.exitPage,
  };

  switch (event.eventType) {
    case "PAGE_VIEW":
      updated.pageViews += 1;
      break;
    case "PRODUCT_VIEW":
      updated.productViews += 1;
      break;
    case "ADD_TO_CART":
    case "REMOVE_FROM_CART":
      updated.cartEvents += 1;
      break;
    case "CHECKOUT_START":
      updated.checkoutStarted = true;
      break;
    case "PURCHASE":
    case "CHECKOUT_COMPLETED":
      if (event.revenueAuthority === "AUTHORITATIVE") {
        updated.purchaseCompleted = true;
      }
      break;
    case "SESSION_END":
      updated.endedAt = event.timestamp;
      break;
  }

  upsertSession(updated);
  return updated;
}

export function countActiveSessions(nowIso: string): number {
  const nowMs = Date.parse(nowIso);
  let count = 0;
  for (const session of listSessions()) {
    if (!session.endedAt && !isSessionExpired(session, nowMs)) count += 1;
  }
  return count;
}
