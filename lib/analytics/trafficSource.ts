import type { TrafficSource, TrafficSourceType } from "./types";
import { SEARCH_ENGINE_HOSTS, SOCIAL_HOSTS } from "./constants";

const ALLOWED_UTM_KEYS = new Set(["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"]);

export function parseCampaignParams(query: Record<string, string | undefined>): Partial<TrafficSource> {
  const clean: Record<string, string> = {};
  for (const [key, value] of Object.entries(query)) {
    if (!ALLOWED_UTM_KEYS.has(key) || !value) continue;
    if (/[@+]/.test(value) || value.length > 120) continue;
    clean[key] = value.slice(0, 120);
  }

  return {
    medium: clean.utm_medium,
    campaign: clean.utm_campaign,
    content: clean.utm_content,
    term: clean.utm_term,
    source: classifyTrafficSource(clean.utm_source, clean.utm_medium, undefined),
  };
}

export function classifyTrafficSource(
  source?: string,
  medium?: string,
  referrerHost?: string
): TrafficSourceType {
  const src = (source ?? "").toLowerCase();
  const med = (medium ?? "").toLowerCase();
  const host = (referrerHost ?? "").toLowerCase();

  if (med.includes("cpc") || med.includes("ppc") || src.includes("ads")) return "PAID_SEARCH";
  if (med.includes("email") || src.includes("email")) return "EMAIL";
  if (med.includes("social") || Object.keys(SOCIAL_HOSTS).some((h) => host.includes(h))) return "SOCIAL";
  if (med.includes("marketplace") || src.includes("amazon") || src.includes("ebay")) return "MARKETPLACE";
  if (Object.keys(SEARCH_ENGINE_HOSTS).some((h) => host.includes(h))) return "ORGANIC_SEARCH";
  if (host && !host.includes("buzzard")) return "REFERRAL";
  if (src === "direct" || !src) return "DIRECT";
  return "OTHER";
}

export function resolveTrafficSource(input: {
  trafficSource?: TrafficSourceType;
  trafficMedium?: string;
  trafficCampaign?: string;
  referrerHost?: string;
  utmSource?: string;
}): TrafficSource {
  const source = input.trafficSource
    ?? classifyTrafficSource(input.utmSource, input.trafficMedium, input.referrerHost);

  return {
    source,
    medium: input.trafficMedium,
    campaign: input.trafficCampaign,
    referrerHost: input.referrerHost,
  };
}
