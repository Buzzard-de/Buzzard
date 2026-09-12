import { getOrder } from "@/lib/order-engine";
import type { AnalyticsEventInput, CollectEventResult, ConsentState } from "./types";
import { IDEMPOTENT_EVENT_TYPES } from "./constants";
import {
  generateEventId,
  getConsent,
  getIdempotencyEventId,
  isIdempotencyKeyUsed,
  isVisitorDeleted,
  markIdempotencyKey,
  storeEvent,
} from "./registry";
import { validateEventSchema } from "./eventSchema";
import { buildDefaultConsentState, isTrackingAllowed, updateConsent } from "./consent";
import { stripPiiFromEventInput } from "./privacy";
import { rejectEventInjection, validateCrossCustomerAccess } from "./security";
import { normalizeEvent } from "./eventNormalizer";
import { generateAnonymousVisitorId, touchVisitor } from "./visitor";
import { getOrCreateSession, updateSessionFromEvent } from "./session";
import {
  validateClientRevenueClaim,
  resolveAuthoritativeOrderRevenue,
  resolveAuthoritativeRefundAmount,
} from "./revenue";
import { recordAnalyticsAudit } from "./audit";

const AUTHORITATIVE_EVENT_SOURCES = new Set([
  "ORDER_ENGINE",
  "RETURNS_ENGINE",
  "MARKETPLACE_ENGINE",
  "STOREFRONT_CHECKOUT",
]);

function isAuthoritativeBusinessEvent(input: AnalyticsEventInput): boolean {
  const source = input.metadata?.source;
  return typeof source === "string" && AUTHORITATIVE_EVENT_SOURCES.has(source);
}

function buildIdempotencyKey(input: AnalyticsEventInput): string | undefined {
  if (input.eventId) return input.eventId;
  if (input.orderIdReference && IDEMPOTENT_EVENT_TYPES.has(input.eventType)) {
    return `${input.eventType}:${input.orderIdReference}`;
  }
  if (input.correlationId && IDEMPOTENT_EVENT_TYPES.has(input.eventType)) {
    return `${input.eventType}:${input.correlationId}`;
  }
  return undefined;
}

export function collectAnalyticsEvent(
  input: AnalyticsEventInput,
  options?: { customerIdContext?: string }
): CollectEventResult {
  const injection = rejectEventInjection(input);
  if (!injection.ok) {
    return { ok: false, errorCode: "EVENT_INJECTION", errorMessage: injection.errors.join(",") };
  }

  const schema = validateEventSchema(input);
  if (!schema.ok) {
    return { ok: false, errorCode: "SCHEMA_VALIDATION", errorMessage: schema.errors.join(",") };
  }

  if (input.customerIdReference) {
    const access = validateCrossCustomerAccess(input.customerIdReference, options?.customerIdContext);
    if (!access.ok) return { ok: false, errorCode: access.errorCode };
  }

  const safeInput = stripPiiFromEventInput(input);
  const anonymousVisitorId = safeInput.anonymousVisitorId ?? generateAnonymousVisitorId();
  if (isVisitorDeleted(anonymousVisitorId)) {
    return { ok: false, errorCode: "VISITOR_DELETED", blockedByConsent: true };
  }

  const consent: ConsentState =
    getConsent(anonymousVisitorId)
    ?? safeInput.consentState as ConsentState
    ?? buildDefaultConsentState(safeInput.market ?? "DE");

  if (!isTrackingAllowed(safeInput.eventType, consent) && !isAuthoritativeBusinessEvent(safeInput)) {
    return { ok: false, errorCode: "CONSENT_DENIED", blockedByConsent: true };
  }

  const idempotencyKey = buildIdempotencyKey(safeInput);
  if (idempotencyKey && isIdempotencyKeyUsed(idempotencyKey)) {
    const existingId = getIdempotencyEventId(idempotencyKey)!;
    return { ok: true, event: { ...normalizeEvent(safeInput, "PROVISIONAL"), eventId: existingId } };
  }

  let revenueAuthority = validateClientRevenueClaim({
    eventType: safeInput.eventType,
    value: safeInput.value,
    authoritative: safeInput.authoritative,
    orderIdReference: safeInput.orderIdReference,
    returnId: safeInput.metadata?.returnId ? String(safeInput.metadata.returnId) : undefined,
  });

  if (safeInput.orderIdReference && safeInput.eventType === "PURCHASE") {
    const resolved = resolveAuthoritativeOrderRevenue(safeInput.orderIdReference);
    if (resolved.ok) {
      revenueAuthority = "AUTHORITATIVE";
      safeInput.value = (resolved.grossCents ?? 0) / 100;
      safeInput.currency = resolved.currency;
    }
  }

  if (safeInput.eventType === "REFUND" && safeInput.metadata?.returnId) {
    const resolved = resolveAuthoritativeRefundAmount(String(safeInput.metadata.returnId));
    if (resolved.ok) {
      revenueAuthority = "AUTHORITATIVE";
      safeInput.value = (resolved.refundCents ?? 0) / 100;
    }
  }

  if (safeInput.authoritative === true && revenueAuthority === "REJECTED") {
    return { ok: false, errorCode: "FAKE_REVENUE_REJECTED", errorMessage: "Client revenue claim rejected" };
  }

  const timestamp = safeInput.timestamp ?? new Date().toISOString();
  touchVisitor(anonymousVisitorId, timestamp);

  const session = getOrCreateSession({
    sessionId: safeInput.sessionId,
    anonymousVisitorId,
    timestamp,
    landingPage: safeInput.landingPage ?? safeInput.pagePath,
    trafficSource: safeInput.trafficSource ?? "DIRECT",
    market: safeInput.market ?? "DE",
    language: safeInput.language ?? "de",
    deviceType: safeInput.deviceType ?? "OTHER",
  });

  const event = normalizeEvent(
    {
      ...safeInput,
      sessionId: session.sessionId,
      anonymousVisitorId,
      eventId: safeInput.eventId ?? generateEventId(),
    },
    revenueAuthority
  );

  storeEvent(event);
  updateSessionFromEvent(session, event);

  if (idempotencyKey) markIdempotencyKey(idempotencyKey, event.eventId);

  if (["CONSENT_GRANTED", "CONSENT_DENIED", "CONSENT_WITHDRAWN"].includes(event.eventType)) {
    const status = event.eventType === "CONSENT_GRANTED" ? "GRANTED" : event.eventType === "CONSENT_DENIED" ? "DENIED" : "WITHDRAWN";
    updateConsent(anonymousVisitorId, event.market, { ANALYTICS: status });
  }

  return { ok: true, event };
}

export function ingestAuthoritativeOrderPurchase(orderId: string, correlationId?: string): CollectEventResult {
  const order = getOrder(orderId);
  if (!order) return { ok: false, errorCode: "ORDER_NOT_FOUND" };

  return collectAnalyticsEvent({
    eventType: "PURCHASE",
    orderIdReference: orderId,
    productId: order.items[0]?.productId,
    market: order.marketId,
    country: order.marketId,
    language: "de",
    currency: order.currency,
    value: order.totalGross,
    quantity: order.items.reduce((sum, i) => sum + i.quantity, 0),
    authoritative: true,
    correlationId: correlationId ?? orderId,
    metadata: { source: "ORDER_ENGINE" },
  });
}

export function ingestAuthoritativeRefund(returnId: string, orderId: string, amount: number): CollectEventResult {
  return collectAnalyticsEvent({
    eventType: "REFUND",
    orderIdReference: orderId,
    value: amount,
    authoritative: true,
    correlationId: `refund_${returnId}`,
    metadata: { returnId, source: "RETURNS_ENGINE" },
  });
}
