import { netFromGross } from "@/lib/market-engine/money";
import { roundMoney, getCurrencyDecimalDigits } from "./currency";
import { getPriceBounds, getRoundingRule } from "./registry";
import type { PricingChannel, PricingStatus, RoundingMode } from "./types";
import { recalculateMarginAfterRounding } from "./margin";

export function applyRoundingRule(
  grossPrice: number,
  options: { marketId?: string; channel?: PricingChannel; currency: string }
): number {
  const rule = getRoundingRule(options.marketId, options.channel);
  const decimalDigits = getCurrencyDecimalDigits(options.currency);
  const mode = rule.mode ?? "none";

  if (mode === "none") return roundMoney(grossPrice, decimalDigits);

  const whole = Math.floor(grossPrice);
  const cents = grossPrice - whole;

  switch (mode as RoundingMode) {
    case "psychological_99": {
      if (cents <= 0.99) return roundMoney(whole + 0.99, decimalDigits);
      return roundMoney(whole + 1 + 0.99, decimalDigits);
    }
    case "nearest_49": {
      const base = cents <= 0.49 ? whole + 0.49 : whole + 0.99;
      return roundMoney(base, decimalDigits);
    }
    case "nearest_19": {
      const base = cents <= 0.19 ? whole + 0.19 : cents <= 0.49 ? whole + 0.49 : whole + 0.99;
      return roundMoney(base, decimalDigits);
    }
    case "nearest": {
      const step = rule.step ?? 0.01;
      return roundMoney(Math.round(grossPrice / step) * step, decimalDigits);
    }
    default:
      return roundMoney(grossPrice, decimalDigits);
  }
}

export function validatePriceBounds(customerNetPrice: number): PricingStatus | "VALID" {
  const bounds = getPriceBounds();
  if (customerNetPrice > bounds.maximumPrice) return "PRICE_TOO_HIGH";
  if (customerNetPrice < bounds.minimumPrice) return "REVIEW_REQUIRED";
  return "VALID";
}

export interface PostRoundingValidation {
  customerGrossPrice: number;
  customerNetPrice: number;
  customerVat: number;
  buzzardContributionMargin: number;
  pricingStatus: PricingStatus;
}

/** Apply rounding to gross, then recalculate net/VAT/margin. */
export function applyRoundingAndValidate(
  vatBreakdown: { customerNetPrice: number; customerVat: number; customerGrossPrice: number; taxContext: import("@/lib/market-engine/types").VatContext },
  totalVariableCost: number,
  minimumMarginPercent: number,
  options: { marketId: string; channel: PricingChannel; currency: string }
): PostRoundingValidation {
  const roundedGross = applyRoundingRule(vatBreakdown.customerGrossPrice, options);

  let customerNetPrice = vatBreakdown.customerNetPrice;
  let customerVat = vatBreakdown.customerVat;

  if (vatBreakdown.taxContext.rate > 0 && !vatBreakdown.taxContext.reverseCharge) {
    const { net, vat } = netFromGross(roundedGross, vatBreakdown.taxContext.rate);
    customerNetPrice = net;
    customerVat = vat;
  } else {
    customerNetPrice = roundedGross;
    customerVat = 0;
  }

  const buzzardContributionMargin = recalculateMarginAfterRounding(customerNetPrice, totalVariableCost);

  let pricingStatus: PricingStatus = "VALID";
  if (buzzardContributionMargin < minimumMarginPercent) {
    pricingStatus = "BELOW_MINIMUM_MARGIN";
  }
  const boundsStatus = validatePriceBounds(customerNetPrice);
  if (boundsStatus !== "VALID") pricingStatus = boundsStatus;

  return {
    customerGrossPrice: roundedGross,
    customerNetPrice,
    customerVat,
    buzzardContributionMargin,
    pricingStatus,
  };
}
