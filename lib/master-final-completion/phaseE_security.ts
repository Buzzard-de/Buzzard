import { evaluateFinalSecurityGate } from "@/lib/final-closure/securityGate";
import { detectProductionBypasses } from "@/lib/final-closure/bypassGuard";
import { getProductionFlagsSnapshot } from "@/lib/production-defaults";
import { runRepositorySecurityHardeningChecks } from "./securityHardeningChecks";
import type { PhaseReport } from "./types";

const FLAG_KEYS = [
  "SALES",
  "SUPPLIER_NETWORK",
  "SUPPLIER_LIVE_READ",
  "SUPPLIER_ORDER_NETWORK",
  "PAYMENT_PRODUCTION",
  "CARRIER_PRODUCTION",
  "RETURNS_PRODUCTION",
  "AI_PRODUCTION",
  "MARKETING_SPEND",
] as const;

export function evaluatePhaseE_security(): PhaseReport {
  const blockers: string[] = [];
  const flags = getProductionFlagsSnapshot();

  if (flags.SALES === "ON") blockers.push("SALES_ENABLED_ON");
  for (const key of FLAG_KEYS) {
    if (flags[key] === "ON") blockers.push(`PRODUCTION_FLAG_ON:${key}`);
  }

  const gate = evaluateFinalSecurityGate();
  if (gate.status === "BLOCKED") blockers.push(...gate.blockers.map((b) => `SECURITY:${b}`));

  const bypasses = detectProductionBypasses();
  if (bypasses.length > 0) blockers.push(...bypasses.map((b) => `BYPASS:${b}`));

  blockers.push(...runRepositorySecurityHardeningChecks().map((f) => `HARDENING:${f}`));

  const status =
    blockers.length === 0 ? (gate.status === "PASS" ? "COMPLETE" : "HUMAN_REQUIRED") : "BLOCKED";

  return {
    phase: "E",
    label: "Security + Failure + Recovery Hardening",
    status,
    tests: "test:final-closure,test:part21,test:production-safety,security:check",
    blockers,
  };
}
