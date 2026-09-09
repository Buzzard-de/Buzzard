import { getMarket } from "@/lib/market-engine/registry";
import { roundMoney } from "@/lib/market-engine/money";
import { resolveSupplierCost } from "./cost";
import { resolveShippingCost } from "./shipping";
import { resolveFees } from "./fees";
import { calculateReturnReserves } from "./returns";
import { calculateContributionMargin } from "./margin";
import { applyVatToNetPrice } from "./vat";
import { applyRoundingAndValidate } from "./rules";
import { getPriceBounds } from "./registry";
import { recordPricingAudit } from "./observability";
import type { PricingInput, PricingResult } from "./types";

/**
 * Central deterministic price calculation.
 *
 * Formula:
 * totalVariableCost = supplierCost + shipping + marketplaceFee + paymentFee + returnReserve + refundReserve
 * customerNetPrice = totalVariableCost / (1 - targetMargin)
 * VAT applied separately via Market Engine
 * Rounding applied to gross, margin recalculated
 */
export function calculatePrice(input: PricingInput): PricingResult {
  const started = Date.now();
  const calculatedAt = new Date().toISOString();

  const market = getMarket(input.marketId);
  if (!market) {
    const result = buildFailedResult(input, "MISSING_MARKET", calculatedAt);
    recordPricingAudit(input, result, Date.now() - started);
    return result;
  }

  const marketCurrency = input.currency ?? market.currency;
  const bounds = getPriceBounds();

  if (!input.supplierOffer) {
    const result = buildFailedResult(input, "NO_SUPPLIER_OFFER", calculatedAt, marketCurrency);
    recordPricingAudit(input, result, Date.now() - started);
    return result;
  }

  if (input.supplierOffer.stock <= 0) {
    const result = buildFailedResult(input, "OUT_OF_STOCK", calculatedAt, marketCurrency);
    recordPricingAudit(input, result, Date.now() - started);
    return result;
  }

  const supplierCost = resolveSupplierCost(input, marketCurrency);
  if (!supplierCost.valid) {
    const status = supplierCost.reason === "MISSING_CURRENCY" ? "MISSING_CURRENCY" : "MISSING_COST";
    const result = buildFailedResult(input, status, calculatedAt, marketCurrency);
    recordPricingAudit(input, result, Date.now() - started);
    return result;
  }

  const shipping = resolveShippingCost({
    productId: input.productId,
    marketId: input.marketId,
    supplierId: input.supplierId,
    targetCurrency: marketCurrency,
    override: input._testOverrides?.shippingCost,
  });

  const feeBase = roundMoney(supplierCost.convertedNetPrice + shipping.shippingCost);
  const fees = resolveFees({
    channel: input.channel,
    marketId: input.marketId,
    categoryId: input.categoryId,
    paymentMethod: input.paymentMethod,
    feeBaseAmount: feeBase,
    currency: marketCurrency,
  });

  const reserves = calculateReturnReserves(supplierCost.convertedNetPrice, input.categoryId);

  const totalVariableCost = roundMoney(
    feeBase + fees.totalFees + reserves.returnCostReserve + reserves.refundCostReserve
  );

  const marginCalc = calculateContributionMargin(totalVariableCost, {
    marketId: input.marketId,
    categoryId: input.categoryId,
    channel: input.channel,
    marketplaceId: input.channel,
    supplierId: input.supplierId,
    targetMarginPercent: input._testOverrides?.targetMarginPercent,
    minimumMarginPercent: input._testOverrides?.minimumMarginPercent,
    minimumPrice: bounds.minimumPrice,
    maximumPrice: bounds.maximumPrice,
  });

  const vatBreakdown = applyVatToNetPrice(marginCalc.customerNetPrice, {
    marketId: input.marketId,
    sellerCountry: input.sellerCountry,
    customerType: input.customerType,
  });

  const postRound = applyRoundingAndValidate(
    vatBreakdown,
    totalVariableCost,
    marginCalc.minimumMarginPercent,
    { marketId: input.marketId, channel: input.channel, currency: marketCurrency }
  );

  let pricingStatus = marginCalc.pricingStatus;
  if (pricingStatus === "VALID" && postRound.pricingStatus !== "VALID") {
    pricingStatus = postRound.pricingStatus;
  } else if (postRound.pricingStatus !== "VALID") {
    pricingStatus = postRound.pricingStatus;
  }

  const result: PricingResult = {
    productId: input.productId,
    supplierId: input.supplierId,
    supplierOfferId: input.supplierOfferId ?? input.supplierOffer.supplierSku,
    marketId: input.marketId,
    channel: input.channel,
    currency: marketCurrency,

    supplierNetPrice: supplierCost.supplierNetPrice,
    supplierGrossPrice: supplierCost.supplierGrossPrice,
    supplierCurrency: supplierCost.supplierCurrency,

    shippingCost: shipping.shippingCost,
    shippingCurrency: shipping.shippingCurrency,

    paymentFee: fees.paymentFee,
    marketplaceFee: fees.marketplaceFee,
    marketplaceFixedFee: fees.marketplaceFixedFee,

    returnCostReserve: reserves.returnCostReserve,
    refundCostReserve: reserves.refundCostReserve,
    otherVariableCosts: 0,

    taxContext: vatBreakdown.taxContext,
    targetMarginPercent: marginCalc.targetMarginPercent,
    minimumMarginPercent: marginCalc.minimumMarginPercent,
    maximumPrice: bounds.maximumPrice,
    minimumPrice: bounds.minimumPrice,

    customerNetPrice: postRound.customerNetPrice,
    customerVat: postRound.customerVat,
    customerGrossPrice: postRound.customerGrossPrice,

    buzzardContributionMargin: postRound.buzzardContributionMargin,
    pricingStatus,
    calculatedAt,
    totalVariableCost,
  };

  recordPricingAudit(input, result, Date.now() - started);
  return result;
}

function buildFailedResult(
  input: PricingInput,
  status: PricingResult["pricingStatus"],
  calculatedAt: string,
  currency = "EUR"
): PricingResult {
  return {
    productId: input.productId,
    supplierId: input.supplierId,
    supplierOfferId: input.supplierOfferId,
    marketId: input.marketId,
    channel: input.channel,
    currency,
    supplierNetPrice: 0,
    supplierGrossPrice: 0,
    supplierCurrency: input.supplierOffer?.currency ?? "",
    shippingCost: 0,
    shippingCurrency: currency,
    paymentFee: 0,
    marketplaceFee: 0,
    marketplaceFixedFee: 0,
    returnCostReserve: 0,
    refundCostReserve: 0,
    otherVariableCosts: 0,
    taxContext: { rate: 0, included: false, reverseCharge: false, reason: "FAILED" },
    targetMarginPercent: 0,
    minimumMarginPercent: 0,
    maximumPrice: 0,
    minimumPrice: 0,
    customerNetPrice: 0,
    customerVat: 0,
    customerGrossPrice: 0,
    buzzardContributionMargin: 0,
    pricingStatus: status,
    calculatedAt,
    totalVariableCost: 0,
  };
}

/** Recalculate price after supplier price update — does not affect existing order snapshots. */
export function recalculatePriceAfterSupplierUpdate(input: PricingInput): PricingResult {
  return calculatePrice(input);
}
