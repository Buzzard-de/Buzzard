import {
  hasProviderSecretRef,
  isProviderFlagEnabled,
  isPayPalEnabled,
  resolvePaymentEnvironment,
} from "../config";
import type {
  PaymentCreateInput,
  PaymentCaptureInput,
  PaymentProductionRecord,
  PaymentProviderAdapter,
  PaymentProviderKind,
  PaymentRefundInput,
  PaymentWebhookPayload,
  ProviderAvailabilityContext,
  ProviderConfigStatus,
  ProviderOperationResult,
  PaymentMethodCategory,
} from "../types";

export function resolveProviderConfigStatus(kind: PaymentProviderKind): ProviderConfigStatus {
  if (kind === "MOCK") return "VALIDATED";
  const enabled = kind === "PAYPAL" ? isPayPalEnabled() : isProviderFlagEnabled(kind);
  if (!enabled) return "DISABLED";
  if (!hasProviderSecretRef(kind)) return "NOT_CONFIGURED";
  return "CONFIGURED";
}

export function capabilityNotSupported(): ProviderOperationResult {
  return { ok: false, error: "CAPABILITY_NOT_SUPPORTED", capabilityNotSupported: true };
}

export function createMockProviderResult(
  state: PaymentProductionRecord["state"] = "CREATED",
  extra: Partial<ProviderOperationResult> = {},
): ProviderOperationResult {
  return { ok: true, state, ...extra };
}

export abstract class BasePaymentProvider implements PaymentProviderAdapter {
  abstract kind: PaymentProviderKind;
  abstract category: PaymentMethodCategory;

  configStatus(): ProviderConfigStatus {
    return resolveProviderConfigStatus(this.kind);
  }

  protected isAvailableInContext(ctx: ProviderAvailabilityContext): boolean {
    if (this.configStatus() === "DISABLED") return false;
    if (ctx.amount <= 0) return false;
    return true;
  }

  abstract availability(ctx: ProviderAvailabilityContext): ProviderOperationResult<{ available: boolean }>;
  abstract createPayment(input: PaymentCreateInput): ProviderOperationResult;
  abstract authorizePayment(paymentId: string, record: PaymentProductionRecord): ProviderOperationResult;
  abstract capturePayment(input: PaymentCaptureInput, record: PaymentProductionRecord): ProviderOperationResult;
  abstract cancelPayment(paymentId: string, record: PaymentProductionRecord): ProviderOperationResult;
  abstract refundPayment(input: PaymentRefundInput, record: PaymentProductionRecord): ProviderOperationResult;
  abstract getPaymentStatus(paymentId: string, record: PaymentProductionRecord): ProviderOperationResult;
  abstract handleWebhook(payload: PaymentWebhookPayload): ProviderOperationResult;

  protected dryRun(): boolean {
    return resolvePaymentEnvironment() !== "PRODUCTION";
  }
}
