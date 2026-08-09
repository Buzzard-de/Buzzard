import type { MarketingEventName, MarketingEventPayload } from "@/lib/marketing/events";
import { trackAnalyticsEvent } from "./client";
import { shouldUseAnalyticsDashboardApi } from "./runtime";

const SESSION_KEY = "buzzard_analytics_session";

const EVENT_MAP: Partial<Record<MarketingEventName, string>> = {
  page_view: "page_view",
  view_item: "product_view",
  add_to_cart: "add_to_cart",
  begin_checkout: "checkout_start",
  purchase: "purchase",
};

function sessionId(): string {
  if (typeof window === "undefined") return "";
  let id = sessionStorage.getItem(SESSION_KEY);
  if (!id) {
    id = `s_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
    sessionStorage.setItem(SESSION_KEY, id);
  }
  return id;
}

function resolveSource(): string {
  if (typeof window === "undefined") return "direct";
  const params = new URLSearchParams(window.location.search);
  const utm = params.get("utm_source");
  if (utm) return utm;
  if (document.referrer.includes("google")) return "google";
  if (document.referrer.includes("instagram")) return "instagram";
  return "direct";
}

export function maybeTrackAnalyticsDashboard(
  name: MarketingEventName,
  payload: MarketingEventPayload = {}
): void {
  if (!shouldUseAnalyticsDashboardApi()) return;
  const eventType = EVENT_MAP[name];
  if (!eventType) return;

  trackAnalyticsEvent({
    eventType,
    sessionId: sessionId(),
    page: typeof window !== "undefined" ? window.location.pathname : "",
    productSku: typeof payload.product_id === "string" ? payload.product_id : "",
    source: resolveSource(),
    countryCode: typeof payload.country === "string" ? payload.country : "",
  });
}
