import { roundMoney } from "@/lib/market-engine/money";
import { getMarginRule } from "./registry";
import type { MarginRule, PricingStatus } from "./types";

export interface MarginCalculation {
  totalVariableCost: number;
  targetMarginPercent: number;
  minimumMarginPercent: number;
  customerNetPrice: number;
  buzzardContributionMargin: number;
  marginValid: boolean;
  pricingStatus: PricingStatus;
}

/**
 * Contribution margin on revenue:
 * customerNetPrice = totalVariableCost / (1 - targetMarginPercent)
 * margin = (customerNetPrice - totalVariableCost) / customerNetPrice
 */
export function calculateContributionMargin(
  totalVariableCost: number,
  options?: {
    marketId?: string;
    categoryId?: string;
    channel?: string;
    marketplaceId?: string;
    supplierId?: string;
    targetMarginPercent?: number;
    minimumMarginPercent?: number;
    minimumPrice?: number;
    maximumPrice?: number;
  }
): MarginCalculation {
  const rule: MarginRule = getMarginRule({
    marketId: options?.marketId,
    categoryId: options?.categoryId,
    channel: options?.channel as import("./types").PricingChannel | undefined,
    marketplaceId: options?.marketplaceId as import("./types").PricingChannel | undefined,
    supplierId: options?.supplierId,
  });

  const targetMarginPercent = options?.targetMarginPercent ?? rule.targetMarginPercent;
  const minimumMarginPercent = options?.minimumMarginPercent ?? rule.minimumMarginPercent;

  if (totalVariableCost <= 0) {
    return {
      totalVariableCost,
      targetMarginPercent,
      minimumMarginPercent,
      customerNetPrice: 0,
      buzzardContributionMargin: 0,
      marginValid: false,
      pricingStatus: "MISSING_COST",
    };
  }

  if (targetMarginPercent >= 1 || targetMarginPercent < 0) {
    return {
      totalVariableCost,
      targetMarginPercent,
      minimumMarginPercent,
      customerNetPrice: 0,
      buzzardContributionMargin: 0,
      marginValid: false,
      pricingStatus: "INVALID_RULE",
    };
  }

  const customerNetPrice = roundMoney(totalVariableCost / (1 - targetMarginPercent));
  const buzzardContributionMargin =
    customerNetPrice > 0
      ? roundMoney((customerNetPrice - totalVariableCost) / customerNetPrice)
      : 0;

  let pricingStatus: PricingStatus = "VALID";
  let marginValid = true;

  if (buzzardContributionMargin < minimumMarginPercent) {
    pricingStatus = "BELOW_MINIMUM_MARGIN";
    marginValid = false;
  }

  if (options?.maximumPrice != null && customerNetPrice > options.maximumPrice) {
    pricingStatus = "PRICE_TOO_HIGH";
    marginValid = false;
  }

  if (options?.minimumPrice != null && customerNetPrice < options.minimumPrice) {
    pricingStatus = "REVIEW_REQUIRED";
    marginValid = false;
  }

  return {
    totalVariableCost,
    targetMarginPercent,
    minimumMarginPercent,
    customerNetPrice,
    buzzardContributionMargin,
    marginValid,
    pricingStatus,
  };
}

/** Recalculate actual margin after rounding gross price back to net. */
export function recalculateMarginAfterRounding(
  customerNetPrice: number,
  totalVariableCost: number
): number {
  if (customerNetPrice <= 0) return 0;
  return roundMoney((customerNetPrice - totalVariableCost) / customerNetPrice);
}
