import { assertProductionFlagDisabled, enforceCiProductionSafety } from "@/lib/production-defaults";

const counters = { realLabels: 0, realHttpCalls: 0 };

export function getCarrierProductionSafetyCounters() {
  return { ...counters };
}

export function resetCarrierProductionSafetyCountersForTests(): void {
  for (const k of Object.keys(counters) as Array<keyof typeof counters>) counters[k] = 0;
}

export function assertCarrierProductionSafety(): void {
  enforceCiProductionSafety("CARRIER_351");
  assertProductionFlagDisabled("CARRIER_PRODUCTION", "CARRIER_351");
}

export function assertCarrierProductionSafetyInvariants(): { ok: boolean; violations: string[] } {
  const violations: string[] = [];
  if (counters.realLabels !== 0) violations.push(`realLabels=${counters.realLabels}`);
  if (counters.realHttpCalls !== 0) violations.push(`realHttpCalls=${counters.realHttpCalls}`);
  return { ok: violations.length === 0, violations };
}
