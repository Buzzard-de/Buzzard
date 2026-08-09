import type { MarketingEventName, MarketingEventPayload } from "@/lib/marketing/events";
import { trackMarketingCenterEvent } from "./client";
import { shouldUseMarketingCenterApi } from "./runtime";

const SESSION_KEY = "buzzard_marketing_session";

const EVENT_MAP: Partial<Record<MarketingEventName, string>> = {
  page_view: "page_view",
  view_item: "view_item",
  add_to_cart: "add_to_cart",
  begin_checkout: "begin_checkout",
  purchase: "purchase",
};

function sessionId(): string {
  if (typeof window === "undefined") return "";
  let id = sessionStorage.getItem(SESSION_KEY);
  if (!id) {
    id = `mc_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
    sessionStorage.setItem(SESSION_KEY, id);
  }
  return id;
}

function utmParams(): { source: string; medium: string; campaign: string } {
  if (typeof window === "undefined") return { source: "", medium: "", campaign: "" };
  const params = new URLSearchParams(window.location.search);
  return {
    source: params.get("utm_source") || "",
    medium: params.get("utm_medium") || "",
    campaign: params.get("utm_campaign") || "",
  };
}

export function maybeTrackMarketingCenter(
  name: MarketingEventName,
  payload: MarketingEventPayload = {}
): void {
  if (!shouldUseMarketingCenterApi()) return;
  const eventType = EVENT_MAP[name];
  if (!eventType) return;

  const utm = utmParams();
  trackMarketingCenterEvent({
    eventType,
    sessionId: sessionId(),
    campaign: utm.campaign,
    source: utm.source || (typeof payload.source === "string" ? payload.source : ""),
    medium: utm.medium,
    countryCode: typeof payload.country === "string" ? payload.country : "",
    productSku: typeof payload.product_id === "string" ? payload.product_id : "",
  });
}

export function getStoredUtmCampaign(): string {
  return utmParams().campaign;
}
