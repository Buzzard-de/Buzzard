import type { AnalyticsEvent } from "../types";
import type { FunnelKpis, FunnelStepKpi } from "./types";
import { isAuthoritativePurchase, safeRate } from "./query";

export function computeFunnelKpis(events: AnalyticsEvent[]): FunnelKpis {
  const visitors = new Set(events.map((e) => e.anonymousVisitorId)).size;
  const sessions = new Set(events.map((e) => e.sessionId)).size;
  const productViews = events.filter((e) => e.eventType === "PRODUCT_VIEW").length;
  const addToCart = events.filter((e) => e.eventType === "ADD_TO_CART").length;
  const checkoutStarts = events.filter((e) => e.eventType === "CHECKOUT_START").length;
  const checkoutCompletions = events.filter((e) => e.eventType === "CHECKOUT_COMPLETED").length;
  const purchases = events.filter(isAuthoritativePurchase).length;

  const stages = [
    { stage: "Visitor", count: visitors },
    { stage: "Session", count: sessions },
    { stage: "Product View", count: productViews },
    { stage: "Add To Cart", count: addToCart },
    { stage: "Checkout Start", count: checkoutStarts },
    { stage: "Checkout Completed", count: checkoutCompletions },
    { stage: "Purchase", count: purchases },
  ];

  const steps: FunnelStepKpi[] = stages.map((current, index) => {
    const previous = index > 0 ? stages[index - 1].count : current.count;
    const conversionFromPrevious = index === 0 ? 100 : safeRate(current.count, previous);
    const dropOffFromPrevious = index === 0 ? 0 : safeRate(previous - current.count, previous);
    return {
      stage: current.stage,
      count: current.count,
      conversionFromPrevious,
      dropOffFromPrevious,
    };
  });

  return {
    steps,
    visitorToPurchase: safeRate(purchases, visitors),
    sessionToPurchase: safeRate(purchases, sessions),
  };
}
