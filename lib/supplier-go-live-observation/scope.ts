import { createHash } from "crypto";
import type { RolloutLimits, RolloutScope } from "./types";

export function buildScopeHash(scope: RolloutScope, limits: RolloutLimits): string {
  return createHash("sha256")
    .update(JSON.stringify({ scope, limits }))
    .digest("hex")
    .slice(0, 16);
}

export function scopeChanged(
  previous: { scope: RolloutScope; limits: RolloutLimits; scopeHash: string },
  current: { scope: RolloutScope; limits: RolloutLimits },
): boolean {
  return previous.scopeHash !== buildScopeHash(current.scope, current.limits);
}

export function formatRolloutScope(scope: RolloutScope): string {
  const markets = scope.markets?.join("+") || scope.market;
  const categories = scope.allowedCategories?.join(",") || "default";
  return `${scope.supplier}/${markets}/${scope.currency}/${categories}`;
}

export function formatRolloutLimits(limits: RolloutLimits): string {
  return `maxOrder=${limits.maximumOrderValue} maxDailyOrders=${limits.maximumDailyOrders} maxDailyValue=${limits.maximumDailyValue}`;
}
