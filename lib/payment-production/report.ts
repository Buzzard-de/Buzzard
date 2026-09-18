import { isProductionFlagEnabled } from "@/lib/production-defaults";
import { getPaymentProductionDashboard, getPaymentProviderAdminStatuses } from "./admin";
import { getPaymentProductionSafetyCounters } from "./safety";
import type { PaymentProductionStatusReport } from "./types";

export function buildPaymentProductionStatusReport(): PaymentProductionStatusReport {
  const dash = getPaymentProductionDashboard();
  const providers = getPaymentProviderAdminStatuses();
  const counters = getPaymentProductionSafetyCounters();
  const anyValidated = Object.values(providers).some((p) => p.status === "VALIDATED");

  const paymentStatus: PaymentProductionStatusReport["payment"] =
    anyValidated ? "PASS" : "NOT_CONFIGURED";

  return {
    generatedAt: new Date().toISOString(),
    software: "COMPLETE",
    payment: paymentStatus,
    sales: isProductionFlagEnabled("SALES") ? "OPEN" : "CLOSED",
    realPaymentSideEffects: counters.realCharges + counters.realRefunds,
    sections: {
      PayPal: providers["PayPal"]?.status ?? "NOT_CONFIGURED",
      Cards: providers["Cards"]?.status ?? "NOT_CONFIGURED",
      SEPA: providers["SEPA"]?.status ?? "NOT_CONFIGURED",
      "Apple Pay": providers["Apple Pay"]?.status ?? "NOT_CONFIGURED",
      "Google Pay": providers["Google Pay"]?.status ?? "NOT_CONFIGURED",
      "Amazon Pay": providers["Amazon Pay"]?.status ?? "NOT_CONFIGURED",
      Klarna: providers["Klarna"]?.status ?? "NOT_CONFIGURED",
      "Local Payments": providers["Local Payments"]?.status ?? "NOT_CONFIGURED",
      "Webhook Security": dash.webhookSecurity,
      Idempotency: dash.idempotency,
      Refund: dash.refund,
      "Fraud/Risk": dash.fraudRisk,
      Production: dash.productionEnabled === "ENABLED" ? "VALIDATED" : "DISABLED",
    },
  };
}

export function formatPaymentProductionReportText(): string {
  const report = buildPaymentProductionStatusReport();
  const dash = getPaymentProductionDashboard();
  const productionOnOff = dash.productionEnabled === "ENABLED" ? "ON" : "OFF";
  const { Production: _prod, ...providerSections } = report.sections;
  const lines = [
    "PAYMENT SYSTEM",
    ...Object.entries(providerSections).map(([k, v]) => `${k}: ${v}`),
    "",
    `Production: ${productionOnOff}`,
    `REAL PAYMENT SIDE EFFECTS: ${report.realPaymentSideEffects}`,
    "",
    `SOFTWARE = ${report.software}`,
    `PAYMENT = ${report.payment}`,
    `SALES = ${report.sales === "OPEN" ? "OPEN" : "CLOSED"}`,
  ];
  return lines.join("\n");
}
