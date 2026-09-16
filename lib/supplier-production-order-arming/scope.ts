import { listMarkets } from "@/lib/market-engine/registry";
import { getInterCarsSupplierId } from "./config";
import type { ProductionArmingScope } from "./types";

export function validateArmingScope(scope: ProductionArmingScope): { valid: boolean; blockers: string[] } {
  const blockers: string[] = [];
  const interCarsId = getInterCarsSupplierId();

  if (scope.supplier !== interCarsId) blockers.push("SUPPLIER_SCOPE_MISMATCH");
  if (!scope.market) blockers.push("MARKET_REQUIRED");
  if (!scope.currency) blockers.push("CURRENCY_REQUIRED");

  const markets = listMarkets();
  const marketKnown = markets.some((m) => m.countryCode === scope.market);
  if (!marketKnown && scope.market !== "DE") blockers.push("MARKET_INVALID");

  return { valid: blockers.length === 0, blockers };
}
