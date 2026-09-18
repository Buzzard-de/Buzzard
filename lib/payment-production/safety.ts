import { assertProductionFlagDisabled, enforceCiProductionSafety } from "@/lib/production-defaults";

const counters = {
  realCharges: 0,
  realRefunds: 0,
  webhookProcessed: 0,
  blockedCaptures: 0,
};

export function getPaymentProductionSafetyCounters() {
  return { ...counters };
}

export function resetPaymentProductionSafetyCountersForTests(): void {
  for (const k of Object.keys(counters) as Array<keyof typeof counters>) counters[k] = 0;
}

export function incrementWebhookProcessed(): void {
  counters.webhookProcessed += 1;
}

export function incrementBlockedCapture(): void {
  counters.blockedCaptures += 1;
}

export function assertPaymentProductionSafety(): void {
  enforceCiProductionSafety("PAYMENT_350");
  assertProductionFlagDisabled("PAYMENT_PRODUCTION", "PAYMENT_350");
}

export function assertPaymentProductionSafetyInvariants(): { ok: boolean; violations: string[] } {
  const violations: string[] = [];
  if (counters.realCharges !== 0) violations.push(`realCharges=${counters.realCharges}`);
  if (counters.realRefunds !== 0) violations.push(`realRefunds=${counters.realRefunds}`);
  return { ok: violations.length === 0, violations };
}

export function assertPaymentCaptureSafety(input: {
  orderId: string;
  paymentId: string;
  amount: number;
  currency: string;
  recordAmount: number;
  recordCurrency: string;
  recordOrderId: string;
}): { ok: boolean; error?: string } {
  if (input.orderId !== input.recordOrderId) {
    incrementBlockedCapture();
    return { ok: false, error: "PAYMENT_BLOCKED:ORDER_MISMATCH" };
  }
  if (input.amount !== input.recordAmount) {
    incrementBlockedCapture();
    return { ok: false, error: "PAYMENT_BLOCKED:AMOUNT_MISMATCH" };
  }
  if (input.currency !== input.recordCurrency) {
    incrementBlockedCapture();
    return { ok: false, error: "PAYMENT_BLOCKED:CURRENCY_MISMATCH" };
  }
  return { ok: true };
}
