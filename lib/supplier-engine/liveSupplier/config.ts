import template from "@/data/supplier-engine/live_supplier.config.template.json";
import interCarsTemplate from "@/data/supplier-engine/inter_cars.profile.template.json";
import interCarsCategoryMappings from "@/data/supplier-engine/inter_cars_category_mappings.json";
import { resolveCredentials } from "../credentials";
import type { LiveSupplierProfile } from "./types";

function envFlag(name: string): boolean {
  const raw = process.env[name];
  return raw === "1" || raw?.toLowerCase() === "true";
}

function parseJsonConfig(raw: string): LiveSupplierProfile | null {
  try {
    const parsed = JSON.parse(raw) as LiveSupplierProfile;
    if (!parsed.supplierId || !parsed.baseUrl) return null;
    return normalizeProfile(parsed);
  } catch {
    return null;
  }
}

function normalizeProfile(profile: LiveSupplierProfile): LiveSupplierProfile {
  const { $comment: _comment, ...templateBase } = template as LiveSupplierProfile & { $comment?: string };
  return {
    ...templateBase,
    ...profile,
    capabilities: {
      productFeed: true,
      stockFeed: true,
      priceFeed: true,
      orderAPI: false,
      createOrder: false,
      cancelOrder: false,
      orderStatus: false,
      trackingAPI: false,
      returnsAPI: false,
      refund: false,
      credit: false,
      replacement: false,
      ...profile.capabilities,
    },
    endpoints: { ...template.endpoints, ...profile.endpoints },
    fieldMapping: { ...template.fieldMapping, ...profile.fieldMapping },
  };
}

function loadCategoryMappings(profile: LiveSupplierProfile): LiveSupplierProfile {
  if (profile.categoryMapping && Object.keys(profile.categoryMapping).length > 0) {
    return profile;
  }
  if (profile.adapterProfile === "inter-cars") {
    const mappings = (interCarsCategoryMappings as { mappings?: Record<string, string> }).mappings || {};
    return { ...profile, categoryMapping: mappings };
  }
  return profile;
}

export function resolvePredefinedLiveProfile(): LiveSupplierProfile | null {
  const preset = process.env.SUPPLIER_LIVE_PROFILE?.trim().toLowerCase();
  if (preset === "inter-cars") {
    const { $comment: _c, $documentation: _d, ...base } = interCarsTemplate as LiveSupplierProfile & {
      $comment?: string;
      $documentation?: unknown;
    };
    return loadCategoryMappings(normalizeProfile(base as LiveSupplierProfile));
  }
  return null;
}

export function resolveLiveSupplierProfile(): LiveSupplierProfile | null {
  const jsonConfig = process.env.SUPPLIER_LIVE_CONFIG_JSON?.trim();
  if (jsonConfig) {
    const parsed = parseJsonConfig(jsonConfig);
    if (parsed) return loadCategoryMappings(parsed);
  }

  const predefined = resolvePredefinedLiveProfile();
  if (predefined) return predefined;

  const supplierId = process.env.SUPPLIER_LIVE_SUPPLIER_ID?.trim();
  const baseUrl = process.env.SUPPLIER_LIVE_BASE_URL?.trim();
  if (!supplierId || !baseUrl) return null;

  return loadCategoryMappings(normalizeProfile({
    supplierId,
    name: process.env.SUPPLIER_LIVE_NAME?.trim() || supplierId,
    displayName: process.env.SUPPLIER_LIVE_DISPLAY_NAME?.trim(),
    country: process.env.SUPPLIER_LIVE_COUNTRY?.trim() || "DE",
    region: process.env.SUPPLIER_LIVE_REGION?.trim() || "EU",
    currency: process.env.SUPPLIER_LIVE_CURRENCY?.trim() || "EUR",
    connectorType: "b2b-sandbox",
    environment: (process.env.SUPPLIER_LIVE_ENVIRONMENT?.trim() as LiveSupplierProfile["environment"]) || "SANDBOX",
    baseUrl,
    secretsRef: process.env.SUPPLIER_LIVE_SECRETS_REF?.trim() || "env:SUPPLIER_LIVE_CREDENTIALS",
    authentication: (process.env.SUPPLIER_LIVE_AUTH_TYPE?.trim() as LiveSupplierProfile["authentication"]) || "api_key",
    endpoints: {
      health: process.env.SUPPLIER_LIVE_HEALTH_PATH?.trim() || "/health",
      products: process.env.SUPPLIER_LIVE_PRODUCTS_PATH?.trim() || "/products",
      stock: process.env.SUPPLIER_LIVE_STOCK_PATH?.trim() || "/stock",
      prices: process.env.SUPPLIER_LIVE_PRICES_PATH?.trim() || "/prices",
    },
    fieldMapping: template.fieldMapping as LiveSupplierProfile["fieldMapping"],
    categoryMapping: {},
    supportedMarkets: (process.env.SUPPLIER_LIVE_MARKETS?.split(",") || ["DE"]).map((m) => m.trim()).filter(Boolean),
    feedFormat: (process.env.SUPPLIER_LIVE_FEED_FORMAT?.trim() as "json" | "xml") || "json",
    priceIncludesVat: process.env.SUPPLIER_LIVE_PRICE_INCLUDES_VAT === "1",
    capabilities: template.capabilities as LiveSupplierProfile["capabilities"],
    pagination: { mode: "cursor", pageSize: 100 },
    dropshipping: process.env.SUPPLIER_LIVE_DROPSHIPPING === "1",
    whiteLabel: process.env.SUPPLIER_LIVE_WHITE_LABEL === "1",
    blindShipping: process.env.SUPPLIER_LIVE_BLIND_SHIPPING === "1",
  }));
}

export function isLiveReadEnabled(): boolean {
  return envFlag("SUPPLIER_LIVE_READ_ENABLED");
}

export function hasLiveSupplierCredentials(profile: LiveSupplierProfile): boolean {
  return Boolean(resolveCredentials(profile.secretsRef));
}
