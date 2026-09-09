import { roundMoney } from "@/lib/market-engine/money";
import { getMarketplaceFeeSchedule, getPaymentFeeSchedule } from "./registry";
import type { FeeSchedule, PaymentMethod, PricingChannel } from "./types";

export interface ResolvedFees {
  marketplaceFee: number;
  marketplaceFixedFee: number;
  paymentFee: number;
  totalFees: number;
}

function applyFeeSchedule(baseAmount: number, schedule: FeeSchedule, currency: string): number {
  if (schedule.status === "DISABLED") return 0;
  const percentFee = roundMoney(baseAmount * (schedule.feePercent ?? 0));
  let total = roundMoney(percentFee + (schedule.fixedFee ?? 0));
  if (schedule.minimumFee != null) total = Math.max(total, schedule.minimumFee);
  if (schedule.maximumFee != null) total = Math.min(total, schedule.maximumFee);
  void currency;
  return total;
}

/**
 * Resolve marketplace and payment fees from configurable schedules.
 * Foundation: fees computed on supplier cost + shipping base to avoid circular dependency.
 */
export function resolveFees(options: {
  channel: PricingChannel;
  marketId: string;
  categoryId?: string;
  paymentMethod?: PaymentMethod;
  feeBaseAmount: number;
  currency: string;
}): ResolvedFees {
  const marketplaceSchedule = getMarketplaceFeeSchedule(options.channel);
  const paymentSchedule = getPaymentFeeSchedule(options.paymentMethod ?? "default");

  const marketplaceFixedFee = marketplaceSchedule.fixedFee ?? 0;
  const marketplaceFee = applyFeeSchedule(options.feeBaseAmount, marketplaceSchedule, options.currency);
  const paymentFee = applyFeeSchedule(options.feeBaseAmount, paymentSchedule, options.currency);

  return {
    marketplaceFee,
    marketplaceFixedFee,
    paymentFee,
    totalFees: roundMoney(marketplaceFee + paymentFee),
  };
}
