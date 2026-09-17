import { assertProductionFlagDisabled, enforceCiProductionSafety } from "@/lib/production-defaults";

const counters = { realProviderCalls: 0, blockedExecutions: 0 };

export function getAiProductionSafetyCounters() {
  return { ...counters };
}

export function resetAiProductionSafetyCountersForTests(): void {
  for (const k of Object.keys(counters) as Array<keyof typeof counters>) counters[k] = 0;
}

export function assertAiProductionSafety(): void {
  enforceCiProductionSafety("AI_352");
  assertProductionFlagDisabled("AI_PRODUCTION", "AI_352");
}

export function assertAiProductionSafetyInvariants(): { ok: boolean; violations: string[] } {
  const violations: string[] = [];
  if (counters.realProviderCalls !== 0) violations.push(`realProviderCalls=${counters.realProviderCalls}`);
  return { ok: violations.length === 0, violations };
}

export function recordBlockedAiExecution(): void {
  counters.blockedExecutions++;
}
