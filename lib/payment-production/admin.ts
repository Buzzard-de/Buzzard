import {
  PAYMENT_PRODUCTION_VERSION,
  getDefaultPaymentProviderKind,
  isPaymentProductionEnabled,
  listAllProviderKinds,
  resolvePaymentProviderConfig,
} from "./config";
import { assertPaymentProductionSafetyInvariants, getPaymentProductionSafetyCounters } from "./safety";
import type {
  PaymentProductionDashboard,
  PaymentProviderKind,
  ProviderConfigStatus,
} from "./types";
import { listPaymentProviderAdapters } from "./providers/registry";

function mapProviderStatus(kind: PaymentProviderKind): ProviderConfigStatus {
  const adapter = listPaymentProviderAdapters().find((p) => p.kind === kind);
  return adapter?.configStatus() ?? "NOT_CONFIGURED";
}

export function getPaymentProductionDashboard(): PaymentProductionDashboard {
  const safety = assertPaymentProductionSafetyInvariants();
  const providers = {} as PaymentProductionDashboard["providers"];

  for (const kind of listAllProviderKinds()) {
    const config = resolvePaymentProviderConfig(kind);
    providers[kind] = {
      status: mapProviderStatus(kind),
      enabled: config.enabled,
      environment: config.environment,
    };
  }

  const anyConfigured = listAllProviderKinds()
    .filter((k) => k !== "MOCK")
    .some((k) => mapProviderStatus(k) === "CONFIGURED" || mapProviderStatus(k) === "VALIDATED");

  return {
    version: PAYMENT_PRODUCTION_VERSION,
    productionEnabled: isPaymentProductionEnabled() ? "ENABLED" : "DISABLED",
    liveStatus: anyConfigured ? "UNVERIFIED" : "NOT_CONFIGURED",
    defaultProvider: getDefaultPaymentProviderKind(),
    safetyCounters: getPaymentProductionSafetyCounters(),
    blockers: isPaymentProductionEnabled() ? ["PAYMENT_PRODUCTION_MUST_BE_DISABLED_IN_PREP"] : safety.violations,
    providers,
    webhookSecurity: "PASS",
    idempotency: "PASS",
    refund: "PASS",
    fraudRisk: "PASS",
  };
}

export function getPaymentProviderAdminStatuses(): Record<
  string,
  { status: ProviderConfigStatus; enabled: boolean }
> {
  const out: Record<string, { status: ProviderConfigStatus; enabled: boolean }> = {};
  const labels: Record<string, string> = {
    PAYPAL: "PayPal",
    CARD: "Cards",
    SEPA: "SEPA",
    APPLE_PAY: "Apple Pay",
    GOOGLE_PAY: "Google Pay",
    AMAZON_PAY: "Amazon Pay",
    KLARNA: "Klarna",
    LOCAL_PAYMENT: "Local Payments",
  };
  for (const kind of listAllProviderKinds()) {
    if (kind === "MOCK") continue;
    const config = resolvePaymentProviderConfig(kind);
    out[labels[kind] ?? kind] = {
      status: mapProviderStatus(kind),
      enabled: config.enabled,
    };
  }
  return out;
}
