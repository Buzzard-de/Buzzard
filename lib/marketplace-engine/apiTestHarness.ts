/**
 * Marketplace production API test levels — Level 2 never runs automatically in CI.
 */
export type MarketplaceTestLevel = "LEVEL_1_READ_ONLY" | "LEVEL_2_CONTROLLED_WRITE";

export const MARKETPLACE_LEVEL_1_OPERATIONS = [
  "health",
  "auth_validation",
  "product_read",
  "stock_read",
  "order_read_safe",
] as const;

export const MARKETPLACE_LEVEL_2_OPERATIONS = [
  "listing_create",
  "listing_update",
  "order_actions",
  "shipment",
  "returns",
  "refunds",
] as const;

export function canRunMarketplaceTestLevel(level: MarketplaceTestLevel): {
  allowed: boolean;
  reason: string;
} {
  if (level === "LEVEL_1_READ_ONLY") {
    return { allowed: true, reason: "Read-only safe checks permitted in repository" };
  }
  if (process.env.MARKETPLACE_PRODUCTION_ENABLED === "1") {
    return { allowed: false, reason: "LEVEL_2 requires explicit production approval gates — blocked in CI" };
  }
  return { allowed: false, reason: "LEVEL_2_CONTROLLED_WRITE blocked — HUMAN_REQUIRED" };
}
