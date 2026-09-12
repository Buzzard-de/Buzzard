import type { AnalyticsEvent } from "./types";
import { listEvents } from "./registry";

export interface ProductAnalyticsRow {
  productId: string;
  views: number;
  uniqueViewers: number;
  addToCart: number;
  purchases: number;
  returns: number;
}

export function computeProductAnalytics(events: AnalyticsEvent[] = listEvents()): ProductAnalyticsRow[] {
  const byProduct = new Map<string, ProductAnalyticsRow & { viewers: Set<string> }>();

  for (const event of events) {
    if (!event.productId) continue;
    const row = byProduct.get(event.productId) ?? {
      productId: event.productId,
      views: 0,
      uniqueViewers: 0,
      addToCart: 0,
      purchases: 0,
      returns: 0,
      viewers: new Set<string>(),
    };

    if (event.eventType === "PRODUCT_VIEW") {
      row.views += 1;
      row.viewers.add(event.anonymousVisitorId);
    }
    if (event.eventType === "ADD_TO_CART") row.addToCart += 1;
    if (event.eventType === "PURCHASE" && event.revenueAuthority === "AUTHORITATIVE") row.purchases += 1;
    if (event.eventType === "RETURN") row.returns += 1;

    byProduct.set(event.productId, row);
  }

  return [...byProduct.values()]
    .map(({ viewers, ...row }) => ({ ...row, uniqueViewers: viewers.size }))
    .sort((a, b) => b.views - a.views);
}
