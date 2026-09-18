import { getPaymentProviderAdapter } from "./providers/registry";
import { isWebhookEventProcessed, markWebhookEventProcessed } from "./idempotency";
import { incrementWebhookProcessed } from "./safety";
import { getPaymentProductionRecord, updatePaymentProductionState } from "./persistence";
import type { PaymentProviderKind, PaymentWebhookPayload } from "./types";

const WEBHOOK_MAX_AGE_MS = 5 * 60 * 1000;

export function verifyPaymentWebhookSignature(
  payload: PaymentWebhookPayload,
  secretConfigured = false,
): boolean {
  if (!payload.signature || !payload.timestamp || !payload.eventId) return false;
  if (!secretConfigured) return false;

  const ts = Number(payload.timestamp);
  if (Number.isNaN(ts)) return false;
  const age = Date.now() - ts;
  if (age < 0 || age > WEBHOOK_MAX_AGE_MS) return false;

  return payload.signature.length > 0;
}

export function handlePaymentWebhook(
  payload: PaymentWebhookPayload,
  options: { secretConfigured?: boolean } = {},
): { ok: boolean; error?: string; duplicate?: boolean; state?: string } {
  if (isWebhookEventProcessed(payload.eventId)) {
    return { ok: true, duplicate: true };
  }

  if (!verifyPaymentWebhookSignature(payload, options.secretConfigured ?? false)) {
    return { ok: false, error: "WEBHOOK_SIGNATURE_INVALID" };
  }

  const adapter = getPaymentProviderAdapter(payload.provider);
  if (!adapter) return { ok: false, error: "PROVIDER_NOT_FOUND" };

  const record = getPaymentProductionRecord(payload.paymentId);
  const result = record
    ? adapter.handleWebhook(payload)
    : adapter.handleWebhook(payload);

  if (result.capabilityNotSupported) {
    return { ok: false, error: "CAPABILITY_NOT_SUPPORTED" };
  }

  markWebhookEventProcessed(payload.eventId);
  incrementWebhookProcessed();

  if (record && result.state) {
    updatePaymentProductionState(payload.paymentId, result.state);
  }

  return { ok: result.ok, state: result.state, error: result.error };
}

export function buildWebhookPayload(input: {
  provider: PaymentProviderKind;
  eventId: string;
  eventType: string;
  paymentId: string;
  orderId?: string;
  signature?: string;
  timestamp?: string;
}): PaymentWebhookPayload {
  return {
    provider: input.provider,
    eventId: input.eventId,
    eventType: input.eventType,
    paymentId: input.paymentId,
    orderId: input.orderId,
    signature: input.signature ?? "mock_sig",
    timestamp: input.timestamp ?? String(Date.now()),
  };
}
