import { getCountryConfig, listCountryConfigs } from "./config";
import { readStoredCountryCode } from "@/lib/market/storage";

export type CountryDetectionSource =
  | "manual_override"
  | "saved_preference"
  | "request_header"
  | "geoip"
  | "browser_locale"
  | "default";

export interface DetectCountryOptions {
  /** Explicit user selection — highest priority when manual. */
  explicitCountryCode?: string;
  manualOverride?: boolean;
  savedCountryCode?: string | null;
  /** HTTP headers (x-buzzard-country, cf-ipcountry) — GeoIP-ready. */
  requestHeaders?: Record<string, string | string[] | undefined>;
  /** Future GeoIP provider result. */
  geoIpCountryCode?: string;
  browserLocale?: string;
}

export interface DetectCountryResult {
  countryCode: string;
  source: CountryDetectionSource;
}

function isSupported(code: string): boolean {
  return Boolean(getCountryConfig(code));
}

function headerValue(headers: Record<string, string | string[] | undefined>, key: string): string | null {
  const raw = headers[key] ?? headers[key.toLowerCase()];
  if (!raw) return null;
  return Array.isArray(raw) ? raw[0] : raw;
}

/**
 * Deterministic country detection — GeoIP can be plugged in via geoIpCountryCode or request headers.
 */
export function detectCountry(options: DetectCountryOptions = {}): DetectCountryResult {
  const {
    explicitCountryCode,
    manualOverride = false,
    savedCountryCode,
    requestHeaders,
    geoIpCountryCode,
    browserLocale,
  } = options;

  if (manualOverride && explicitCountryCode && isSupported(explicitCountryCode)) {
    return { countryCode: explicitCountryCode.toUpperCase(), source: "manual_override" };
  }

  if (savedCountryCode && isSupported(savedCountryCode)) {
    return { countryCode: savedCountryCode.toUpperCase(), source: "saved_preference" };
  }

  if (explicitCountryCode && isSupported(explicitCountryCode)) {
    return { countryCode: explicitCountryCode.toUpperCase(), source: "manual_override" };
  }

  if (geoIpCountryCode && isSupported(geoIpCountryCode)) {
    return { countryCode: geoIpCountryCode.toUpperCase(), source: "geoip" };
  }

  if (requestHeaders) {
    const headerCountry =
      headerValue(requestHeaders, "x-buzzard-country") ||
      headerValue(requestHeaders, "cf-ipcountry");
    if (headerCountry && isSupported(headerCountry)) {
      return { countryCode: headerCountry.toUpperCase(), source: "request_header" };
    }
  }

  if (browserLocale) {
    const region = browserLocale.split("-")[1]?.toUpperCase();
    if (region && isSupported(region)) {
      return { countryCode: region, source: "browser_locale" };
    }
  }

  return { countryCode: "DE", source: "default" };
}

/** Client-side detection using localStorage + browser locale. */
export function detectCountryClient(): DetectCountryResult {
  if (typeof window === "undefined") {
    return detectCountry();
  }

  let saved: string | null = null;
  try {
    saved = readStoredCountryCode();
  } catch {
    /* ignore */
  }

  return detectCountry({
    savedCountryCode: saved,
    browserLocale: navigator.language,
  });
}

export function listSupportedCountryCodes(): string[] {
  return listCountryConfigs().map((c) => c.countryCode);
}
