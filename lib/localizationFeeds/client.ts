import type {
  LocalizationCountryConfig,
  LocalizationFeedsStatus,
  LocalizationLocale,
  LocalizedCatalogProduct,
} from "./types";

function apiBase(): string {
  return (process.env.NEXT_PUBLIC_BUZZARD_API_URL || "").replace(/\/$/, "");
}

function authHeaders(): HeadersInit {
  const adminToken =
    typeof window !== "undefined" ? sessionStorage.getItem("buzzard_admin_token") : null;
  const accountToken =
    typeof window !== "undefined" ? sessionStorage.getItem("buzzard_account_token") : null;
  const token = adminToken || accountToken;
  return {
    "Content-Type": "application/json",
    Accept: "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const base = apiBase();
  if (!base) throw new Error("localizationFeeds.apiUnavailable");
  const res = await fetch(`${base}${path}`, {
    ...init,
    headers: { ...authHeaders(), ...init?.headers },
  });
  const data = (await res.json()) as T & { error?: string };
  if (!res.ok) throw new Error(data.error || "localizationFeeds.requestFailed");
  return data;
}

export function isLocalizationFeedsApiConfigured(): boolean {
  return Boolean(apiBase());
}

export async function fetchLocalizationFeedsStatus(): Promise<LocalizationFeedsStatus> {
  const base = apiBase();
  if (!base) throw new Error("localizationFeeds.apiUnavailable");
  const res = await fetch(`${base}/api/health`, { headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error("localizationFeeds.requestFailed");
  const data = (await res.json()) as { localizationFeeds?: LocalizationFeedsStatus };
  if (!data.localizationFeeds?.enabled) throw new Error("localizationFeeds.disabled");
  return data.localizationFeeds;
}

export async function fetchLocales(): Promise<LocalizationLocale[]> {
  return request<LocalizationLocale[]>("/api/localization/locales");
}

export async function fetchCountryConfig(countryCode: string): Promise<LocalizationCountryConfig> {
  return request<LocalizationCountryConfig>(`/api/localization/country/${encodeURIComponent(countryCode)}`);
}

export async function fetchLocalizedCatalog(filters?: {
  locale?: string;
  country?: string;
  currency?: string;
  q?: string;
  category?: string;
  vehicleId?: number;
}): Promise<LocalizedCatalogProduct[]> {
  const base = apiBase();
  if (!base) throw new Error("localizationFeeds.apiUnavailable");
  const url = new URL(`${base}/api/localization/catalog`);
  if (filters?.locale) url.searchParams.set("locale", filters.locale);
  if (filters?.country) url.searchParams.set("country", filters.country);
  if (filters?.currency) url.searchParams.set("currency", filters.currency);
  if (filters?.q) url.searchParams.set("q", filters.q);
  if (filters?.category) url.searchParams.set("category", filters.category);
  if (filters?.vehicleId) url.searchParams.set("vehicleId", String(filters.vehicleId));
  const res = await fetch(url.toString(), { headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error("localizationFeeds.requestFailed");
  return (await res.json()) as LocalizedCatalogProduct[];
}

export async function fetchLocalizedProductBySlug(
  slug: string,
  locale = "de-DE"
): Promise<LocalizedCatalogProduct> {
  const base = apiBase();
  if (!base) throw new Error("localizationFeeds.apiUnavailable");
  const url = new URL(`${base}/api/localization/products/slug/${encodeURIComponent(slug)}`);
  url.searchParams.set("locale", locale);
  const res = await fetch(url.toString(), { headers: { Accept: "application/json" } });
  const data = (await res.json()) as LocalizedCatalogProduct & { error?: string };
  if (!res.ok) throw new Error(data.error || "localizationFeeds.requestFailed");
  return data;
}

export async function fetchAdminLocalizationStatus(): Promise<LocalizationFeedsStatus> {
  return request<LocalizationFeedsStatus>("/api/admin/localization/status");
}

export async function saveProductTranslation(
  productId: number,
  body: {
    locale: string;
    name: string;
    description?: string;
    seoTitle?: string;
    seoDescription?: string;
    slug?: string;
  }
): Promise<{ ok: boolean }> {
  return request(`/api/admin/localization/products/${productId}/translation`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function savePriceOverride(
  productId: number,
  body: { locale: string; price: number; currency?: string }
): Promise<{ ok: boolean; currency: string; price: number }> {
  return request(`/api/admin/localization/products/${productId}/price`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function saveShippingRate(body: {
  countryCode: string;
  method?: string;
  price: number;
  freeFrom?: number;
}): Promise<{ ok: boolean }> {
  return request("/api/admin/localization/shipping-rate", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function googleMerchantFeedUrl(filters?: {
  locale?: string;
  country?: string;
  currency?: string;
}): string {
  const base = apiBase();
  if (!base) return "";
  const url = new URL(`${base}/api/localization/feed/google.xml`);
  if (filters?.locale) url.searchParams.set("locale", filters.locale);
  if (filters?.country) url.searchParams.set("country", filters.country);
  if (filters?.currency) url.searchParams.set("currency", filters.currency);
  return url.toString();
}
