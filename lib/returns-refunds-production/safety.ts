import { assertProductionFlagDisabled, enforceCiProductionSafety } from "@/lib/production-defaults";

const counters = { realRefunds: 0, assumedRecoveries: 0 };

export function getReturnsRefundsSafetyCounters() {
  return { ...counters };
}

export function resetReturnsRefundsSafetyCountersForTests(): void {
  for (const k of Object.keys(counters) as Array<keyof typeof counters>) counters[k] = 0;
}

export function assertReturnsRefundsSafety(): void {
  enforceCiProductionSafety("RETURNS_353");
  assertProductionFlagDisabled("RETURNS_PRODUCTION", "RETURNS_353");
}

export function assertReturnsRefundsSafetyInvariants(): { ok: boolean; violations: string[] } {
  const violations: string[] = [];
  if (counters.realRefunds !== 0) violations.push(`realRefunds=${counters.realRefunds}`);
  if (counters.assumedRecoveries !== 0) violations.push(`assumedRecoveries=${counters.assumedRecoveries}`);
  return { ok: violations.length === 0, violations };
}
