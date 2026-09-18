import { MARKETING_PROVIDERS, isMarketingSpendEnabled } from "./config";
import { assertFinalGoLiveSafety } from "./safety";
import type { MarketingProviderStatus } from "./types";

const MARKETING_SECRET_REF_KEYS: Record<(typeof MARKETING_PROVIDERS)[number], string | null> = {
  google_ads: "GOOGLE_ADS_SECRET_REF",
  meta: "META_SECRET_REF",
  tiktok: "TIKTOK_SECRET_REF",
  youtube: "YOUTUBE_SECRET_REF",
  marketplace_feeds: null,
};

export function evaluateMarketingProviders(): MarketingProviderStatus[] {
  assertFinalGoLiveSafety();
  return MARKETING_PROVIDERS.map((providerId) => {
    const envKey = MARKETING_SECRET_REF_KEYS[providerId];
    const configured = envKey ? Boolean(process.env[envKey]?.trim()) : false;
    return {
      providerId,
      configured,
      spendEnabled: isMarketingSpendEnabled(),
      liveStatus: configured ? ("UNVERIFIED" as const) : ("NOT_CONFIGURED" as const),
    };
  });
}

export function authorizeMarketingSpend(_providerId: string, _approverId: string): { authorized: false } {
  assertFinalGoLiveSafety();
  return { authorized: false };
}
