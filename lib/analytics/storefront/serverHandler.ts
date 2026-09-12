import { collectAnalyticsEvent } from "../eventCollector";
import { resolveMarketContext } from "../geo";
import { rejectEventInjection } from "../security";
import { validateEventSchema } from "../eventSchema";
import { updateConsent } from "../consent";
import type { AnalyticsEventInput, ConsentState } from "../types";
import { MAX_METADATA_KEYS, MAX_PAYLOAD_BYTES } from "./constants";
import { ingestStorefrontPurchaseSignal } from "./purchaseIngest";

export interface StorefrontEventRequestBody extends AnalyticsEventInput {
  signalPurchase?: boolean;
}

function stripClientFinancialAuthority(input: StorefrontEventRequestBody): AnalyticsEventInput {
  const {
    authoritative: _authoritative,
    value: _value,
    signalPurchase: _signalPurchase,
    ...rest
  } = input;

  return {
    ...rest,
    authoritative: false,
    value: undefined,
  };
}

function validatePayloadSize(raw: string): boolean {
  return raw.length <= MAX_PAYLOAD_BYTES;
}

function validateMetadataSize(metadata?: Record<string, unknown>): boolean {
  if (!metadata) return true;
  return Object.keys(metadata).length <= MAX_METADATA_KEYS;
}

export function handleStorefrontAnalyticsEvent(body: StorefrontEventRequestBody): {
  ok: boolean;
  errorCode?: string;
  blockedByConsent?: boolean;
} {
  if (!body?.eventType) return { ok: false, errorCode: "MISSING_EVENT_TYPE" };
  if (!validateMetadataSize(body.metadata)) return { ok: false, errorCode: "PAYLOAD_TOO_LARGE" };

  const safe = stripClientFinancialAuthority(body);

  if (safe.eventType === "PURCHASE" || safe.eventType === "REFUND") {
    return { ok: false, errorCode: "CLIENT_FINANCIAL_EVENT_REJECTED" };
  }

  const injection = rejectEventInjection(safe);
  if (!injection.ok) return { ok: false, errorCode: "EVENT_INJECTION" };

  const schema = validateEventSchema(safe);
  if (!schema.ok) return { ok: false, errorCode: "SCHEMA_VALIDATION" };

  const marketCtx = resolveMarketContext({
    market: safe.market,
    country: safe.country,
    language: safe.language,
  });

  const result = collectAnalyticsEvent({
    ...safe,
    market: marketCtx.market,
    country: marketCtx.country,
    language: marketCtx.language,
    currency: safe.currency ?? marketCtx.currency,
  });

  if (result.ok && safe.eventType.startsWith("CONSENT_") && safe.anonymousVisitorId) {
    syncConsentFromEvent(safe.anonymousVisitorId, marketCtx.market, safe.eventType);
  }

  return result;
}

function syncConsentFromEvent(visitorId: string, market: string, eventType: string): void {
  const status =
    eventType === "CONSENT_GRANTED" ? "GRANTED"
      : eventType === "CONSENT_DENIED" ? "DENIED"
        : "WITHDRAWN";
  updateConsent(visitorId, market, { ANALYTICS: status });
}

export interface StorefrontPurchaseSignalBody {
  orderId?: string;
  correlationId?: string;
  customerId?: string;
  revenue?: number;
  total?: number;
  subtotal?: number;
  tax?: number;
  discount?: number;
  shipping?: number;
  currency?: string;
}

export function handleStorefrontPurchaseSignal(body: StorefrontPurchaseSignalBody | string, correlationId?: string) {
  const payload: StorefrontPurchaseSignalBody =
    typeof body === "string" ? { orderId: body, correlationId } : body;

  if (!payload.orderId?.trim()) return { ok: false, errorCode: "MISSING_ORDER_ID" };

  if (
    payload.revenue !== undefined
    || payload.total !== undefined
    || payload.subtotal !== undefined
    || payload.tax !== undefined
    || payload.discount !== undefined
    || payload.shipping !== undefined
    || payload.currency !== undefined
  ) {
    /* client financial fields are ignored — never authoritative */
  }

  return ingestStorefrontPurchaseSignal(payload.orderId.trim(), payload.correlationId, {
    customerIdContext: payload.customerId,
  });
}

export function parseStorefrontEventBody(raw: string): StorefrontEventRequestBody | null {
  if (!validatePayloadSize(raw)) return null;
  try {
    return JSON.parse(raw) as StorefrontEventRequestBody;
  } catch {
    return null;
  }
}

export function mergeConsentState(
  body: StorefrontEventRequestBody,
  consentRequired: boolean
): ConsentState | undefined {
  if (!body.consentState) return undefined;
  return {
    consentRequired,
    consentStatus: body.consentState.consentStatus ?? "UNKNOWN",
    analytics: body.consentState.analytics,
    marketing: body.consentState.marketing,
    personalization: body.consentState.personalization,
    consentTimestamp: body.consentState.consentTimestamp,
    consentVersion: body.consentState.consentVersion,
  };
}
