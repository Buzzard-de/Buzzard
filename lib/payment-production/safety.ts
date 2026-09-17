import { assertProductionFlagDisabled, enforceCiProductionSafety } from "@/lib/production-defaults";

const counters = { realCharges: 0, realRefunds: 0, webhookProcessed: 0 };

export function getPaymentProductionSafetyCounters() {
  return { ...counters };
}

export function resetPaymentProductionSafetyCountersForTests(): void {
  for (const k of Object.keys(counters) as Array<keyof typeof counters>) counters[k] = 0;
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
