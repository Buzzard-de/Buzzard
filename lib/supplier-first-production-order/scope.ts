import { listMarkets } from "@/lib/market-engine/registry";
import { getInterCarsSupplierId } from "./config";
import type { FirstProductionOrderPayload, FirstProductionOrderScope } from "./types";

export function validateFirstOrderScope(
  scope: FirstProductionOrderScope,
  payload: Pick<FirstProductionOrderPayload, "supplierId" | "market" | "currency" | "items">,
): { valid: boolean; blockers: string[] } {
  const blockers: string[] = [];
  const interCarsId = getInterCarsSupplierId();

  if (scope.supplier !== interCarsId) blockers.push("SUPPLIER_SCOPE_MISMATCH");
  if (payload.supplierId !== scope.supplier) blockers.push("SUPPLIER_SUBSTITUTION");
  if (payload.market !== scope.market) blockers.push("MARKET_SCOPE_MISMATCH");
  if (payload.currency !== scope.currency) blockers.push("CURRENCY_SCOPE_MISMATCH");

  const markets = listMarkets();
  const marketKnown = markets.some((m) => m.countryCode === scope.market);
  if (!marketKnown && scope.market !== "DE") blockers.push("MARKET_INVALID");

  return { valid: blockers.length === 0, blockers };
}
