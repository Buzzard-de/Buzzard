import { maybeTrackAnalyticsDashboard } from "@/lib/analyticsDashboard/tracker";

export type MarketingEventName =
  | "page_view"
  | "view_item"
  | "search"
  | "view_category"
  | "add_to_cart"
  | "remove_from_cart"
  | "view_cart"
  | "begin_checkout"
  | "add_payment_info"
  | "purchase"
  | "refund"
  | "sign_up"
  | "login"
  | "add_to_wishlist"
  | "select_shipping"
  | "language_change"
  | "ai_chat_open"
  | "ai_chat_message"
  | "ai_recommendation_click";

export interface MarketingEventPayload {
  [key: string]: string | number | boolean | null | undefined | Record<string, unknown>;
}

declare global {
  interface Window {
    dataLayer?: Array<Record<string, unknown>>;
    buzzardTrack?: typeof trackMarketingEvent;
  }
}

export function trackMarketingEvent(name: MarketingEventName, payload: MarketingEventPayload = {}): void {
  if (typeof window === "undefined") return;
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({
    event: name,
    event_name: name,
    ...payload,
  });
  window.dispatchEvent(new CustomEvent("buzzard:analytics", { detail: { name, payload } }));
  maybeTrackAnalyticsDashboard(name, payload);
}

if (typeof window !== "undefined") {
  window.buzzardTrack = trackMarketingEvent;
}
