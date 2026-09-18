/** Production bypass env keys — must never be set in production deployments. */
const PRODUCTION_BYPASS_KEYS = [
  "BUZZARD_FORCE_GO_LIVE",
  "BUZZARD_SKIP_VALIDATION",
  "BUZZARD_SKIP_APPROVAL",
  "BUZZARD_CREATE_ORDER_VALIDATED",
  "BUZZARD_FIRST_ORDER_EXECUTED",
  "BUZZARD_OBSERVATION_COMPLETED",
  "BUZZARD_SALES_ENABLED_BYPASS",
  "BUZZARD_FORCE_SALES_ENABLED",
  "forceGoLive",
  "skipValidation",
  "skipApproval",
  "createOrderValidated",
  "firstOrderExecuted",
  "observationCompleted",
  "forceSalesEnabled",
  "salesEnabled",
] as const;

export function detectProductionBypasses(): string[] {
  const active: string[] = [];
  const isProd = process.env.NODE_ENV === "production" && process.env.CI !== "true";

  for (const key of PRODUCTION_BYPASS_KEYS) {
    const val = process.env[key];
    if (val === "1" || val === "true" || val === "yes") {
      if (isProd || process.env.BUZZARD_ENFORCE_BYPASS_GUARD === "1") {
        active.push(key);
      }
    }
  }

  return active;
}

export function assertNoProductionBypass(context: string): void {
  const bypasses = detectProductionBypasses();
  if (bypasses.length > 0) {
    throw new Error(`${context}:PRODUCTION_BYPASS_FORBIDDEN:${bypasses.join(",")}`);
  }
}
