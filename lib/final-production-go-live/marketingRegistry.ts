import { MARKETING_PROVIDERS, isMarketingSpendEnabled } from "./config";
import { assertFinalGoLiveSafety } from "./safety";
import type { MarketingProviderStatus } from "./types";

export function evaluateMarketingProviders(): MarketingProviderStatus[] {
  assertFinalGoLiveSafety();
  return MARKETING_PROVIDERS.map((providerId) => ({
    providerId,
    configured: Boolean(process.env[`MARKETING_${providerId.toUpperCase()}_SECRET_REF`]),
    spendEnabled: isMarketingSpendEnabled(),
    liveStatus: "NOT_CONFIGURED" as const,
  }));
}

export function authorizeMarketingSpend(_providerId: string, _approverId: string): { authorized: false } {
  assertFinalGoLiveSafety();
  return { authorized: false };
}
