import { getOrder } from "@/lib/order-engine";
import { getFinalOrderContribution } from "@/lib/returns-engine/financialImpact";
import { getReturnByOrder } from "@/lib/returns-engine/registry";
import type { AnalyticsEvent } from "../types";
import { toCents } from "../revenue";
import type { ProfitabilityKpis } from "./types";
import { isAuthoritativePurchase, isAuthoritativeRefund, uniqueOrderPurchases } from "./query";

export interface OrderFinancialBreakdown {
  grossRevenueCents: number;
  productCostCents: number;
  shippingCostCents: number;
  marketplaceFeesCents: number;
  paymentFeesCents: number;
  contributionCents: number;
  returnImpactCents: number;
}

export function computeOrderFinancialBreakdown(orderId: string): OrderFinancialBreakdown | undefined {
  const order = getOrder(orderId);
  if (!order) return undefined;

  let productCostCents = 0;
  let shippingCostCents = 0;
  let marketplaceFeesCents = 0;
  let paymentFeesCents = 0;
  let contributionCents = 0;

  for (const item of order.items) {
    const qty = item.quantity;
    productCostCents += toCents(item.supplierCostSnapshot * qty);
    shippingCostCents += toCents(item.shippingCostSnapshot * qty);
    marketplaceFeesCents += toCents(item.marketplaceFeeSnapshot * qty);
    paymentFeesCents += toCents(item.paymentFeeSnapshot * qty);
    contributionCents += toCents(item.lineNet * item.marginSnapshot);
  }

  let returnImpactCents =
    toCents(order.returnRefund.buzzardRefundLoss)
    + toCents(order.returnRefund.returnShippingCost);

  const linkedReturn = getReturnByOrder(order.orderId);
  if (linkedReturn) {
    const finalized = getFinalOrderContribution(linkedReturn.returnId);
    if (finalized) {
      returnImpactCents = toCents(finalized.returnImpact);
      contributionCents = toCents(finalized.finalOrderContribution);
    }
  }

  return {
    grossRevenueCents: toCents(order.totalGross),
    productCostCents,
    shippingCostCents,
    marketplaceFeesCents,
    paymentFeesCents,
    contributionCents,
    returnImpactCents,
  };
}

export function computeProfitabilityKpis(events: AnalyticsEvent[]): ProfitabilityKpis {
  const purchases = uniqueOrderPurchases(events);
  const refunds = events.filter(isAuthoritativeRefund);

  let grossRevenueCents = 0;
  let productCostCents = 0;
  let shippingCostCents = 0;
  let marketplaceFeesCents = 0;
  let paymentFeesCents = 0;
  let returnRefundImpactCents = 0;
  let contributionCents = 0;

  for (const purchase of purchases) {
    const orderId = purchase.orderIdReference;
    if (!orderId) {
      grossRevenueCents += toCents(purchase.value ?? 0);
      continue;
    }
    const breakdown = computeOrderFinancialBreakdown(orderId);
    if (breakdown) {
      grossRevenueCents += breakdown.grossRevenueCents;
      productCostCents += breakdown.productCostCents;
      shippingCostCents += breakdown.shippingCostCents;
      marketplaceFeesCents += breakdown.marketplaceFeesCents;
      paymentFeesCents += breakdown.paymentFeesCents;
      returnRefundImpactCents += breakdown.returnImpactCents;
      contributionCents += breakdown.contributionCents;
    } else {
      grossRevenueCents += toCents(purchase.value ?? 0);
    }
  }

  returnRefundImpactCents += refunds.reduce((sum, e) => sum + toCents(e.value ?? 0), 0);

  if (contributionCents === 0 && grossRevenueCents > 0) {
    contributionCents = grossRevenueCents - productCostCents - shippingCostCents
      - marketplaceFeesCents - paymentFeesCents - returnRefundImpactCents;
  }

  return {
    grossRevenueCents,
    productCostCents,
    shippingCostCents,
    marketplaceFeesCents,
    paymentFeesCents,
    returnRefundImpactCents,
    contributionCents,
    contributionMarginPercent: safeMarginPercent(contributionCents, grossRevenueCents),
    authoritativeOnly: true,
  };
}

function safeMarginPercent(contributionCents: number, revenueCents: number): number {
  if (revenueCents <= 0) return 0;
  return Number(((contributionCents / revenueCents) * 100).toFixed(2));
}

export function computeContributionForOrder(orderId: string): {
  contributionCents: number;
  contributionMarginPercent: number;
} {
  const breakdown = computeOrderFinancialBreakdown(orderId);
  if (!breakdown) return { contributionCents: 0, contributionMarginPercent: 0 };
  return {
    contributionCents: breakdown.contributionCents,
    contributionMarginPercent: safeMarginPercent(breakdown.contributionCents, breakdown.grossRevenueCents),
  };
}
