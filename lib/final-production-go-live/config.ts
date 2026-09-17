import { isProductionFlagEnabled } from "@/lib/production-defaults";

export const FINAL_GO_LIVE_VERSION = "354.1.0";

export const MARKETING_PROVIDERS = ["google_ads", "meta", "tiktok", "youtube", "marketplace_feeds"] as const;

export function isSalesEnabled(): boolean {
  return isProductionFlagEnabled("SALES");
}

export function isMarketingSpendEnabled(): boolean {
  return isProductionFlagEnabled("MARKETING_SPEND");
}
