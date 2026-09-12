import { classifyDevice } from "../device";
import { parseCampaignParams, classifyTrafficSource } from "../trafficSource";
import type { DeviceType, TrafficSourceType } from "../types";

export interface StorefrontBrowserContext {
  pagePath: string;
  landingPage?: string;
  referrerHost?: string;
  deviceType: DeviceType;
  trafficSource: TrafficSourceType;
  trafficMedium?: string;
  trafficCampaign?: string;
  utmSource?: string;
  screenClass?: string;
}

function screenClassFromViewport(): string | undefined {
  if (typeof window === "undefined") return undefined;
  const w = window.innerWidth;
  if (w < 768) return "mobile";
  if (w < 1024) return "tablet";
  return "desktop";
}

export function buildStorefrontBrowserContext(pagePath?: string): StorefrontBrowserContext {
  if (typeof window === "undefined") {
    return {
      pagePath: pagePath ?? "/",
      deviceType: "OTHER",
      trafficSource: "DIRECT",
    };
  }

  const params = Object.fromEntries(new URLSearchParams(window.location.search).entries());
  const campaign = parseCampaignParams(params);
  let referrerHost: string | undefined;
  try {
    if (document.referrer) referrerHost = new URL(document.referrer).hostname;
  } catch {
    referrerHost = undefined;
  }

  const screenClass = screenClassFromViewport();
  const utmSource = params.utm_source;

  return {
    pagePath: pagePath ?? window.location.pathname,
    referrerHost,
    deviceType: classifyDevice(navigator.userAgent, screenClass),
    trafficSource: campaign.source
      ?? classifyTrafficSource(utmSource, campaign.medium, referrerHost),
    trafficMedium: campaign.medium,
    trafficCampaign: campaign.campaign,
    utmSource,
    screenClass,
  };
}
