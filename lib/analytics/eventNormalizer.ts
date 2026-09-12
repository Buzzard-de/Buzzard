import type { AnalyticsEvent, AnalyticsEventInput, RevenueAuthority } from "./types";
import { generateEventId } from "./registry";
import { resolveMarketContext } from "./geo";
import { resolveTrafficSource } from "./trafficSource";
import { classifyDevice } from "./device";
import { sanitizeMetadata, sanitizeSearchTerm } from "./privacy";

export function normalizeEvent(
  input: AnalyticsEventInput,
  revenueAuthority: RevenueAuthority
): AnalyticsEvent {
  const timestamp = input.timestamp ?? new Date().toISOString();
  const geo = resolveMarketContext(input);
  const traffic = resolveTrafficSource({
    trafficSource: input.trafficSource,
    trafficMedium: input.trafficMedium,
    trafficCampaign: input.trafficCampaign,
    referrerHost: input.metadata?.referrerHost as string | undefined,
    utmSource: input.metadata?.utm_source as string | undefined,
  });

  let metadata = sanitizeMetadata(input.metadata ?? {});
  if (input.eventType === "SEARCH" || input.eventType === "PRODUCT_SEARCH") {
    const term = sanitizeSearchTerm(String(metadata.searchTerm ?? metadata.query ?? ""));
    if (term) metadata = { ...metadata, searchTerm: term };
    else metadata = { ...metadata, searchTerm: "[redacted]" };
  }

  return {
    ...input,
    eventId: input.eventId ?? generateEventId(),
    timestamp,
    sessionId: input.sessionId ?? "",
    anonymousVisitorId: input.anonymousVisitorId ?? "",
    market: geo.market,
    country: geo.country,
    language: geo.language,
    currency: input.currency ?? geo.currency,
    deviceType: input.deviceType ?? classifyDevice(metadata.userAgent as string | undefined),
    trafficSource: traffic.source,
    trafficMedium: traffic.medium,
    trafficCampaign: traffic.campaign,
    landingPage: input.landingPage,
    pagePath: input.pagePath,
    value: revenueAuthority === "REJECTED" ? undefined : input.value,
    metadata,
    revenueAuthority,
    sanitized: true,
  };
}
