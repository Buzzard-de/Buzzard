export function apiBaseUrl(): string {
  return (process.env.NEXT_PUBLIC_BUZZARD_API_URL || "").replace(/\/$/, "");
}

export function isApiConfigured(): boolean {
  return Boolean(apiBaseUrl());
}

export function isAiChatEnabled(): boolean {
  if (process.env.NEXT_PUBLIC_AI_CHAT_ENABLED === "0") return false;
  if (process.env.NEXT_PUBLIC_AI_CHAT_ENABLED === "1") return isApiConfigured();
  return isApiConfigured();
}

export function isSqliteStoreEnabled(): boolean {
  if (process.env.NEXT_PUBLIC_SQLITE_STORE === "0") return false;
  if (process.env.NEXT_PUBLIC_SQLITE_STORE === "1") return isApiConfigured();
  return false;
}

export function isCatalogSeoEnabled(): boolean {
  if (process.env.NEXT_PUBLIC_CATALOG_SEO === "0") return false;
  if (process.env.NEXT_PUBLIC_CATALOG_SEO === "1") return isApiConfigured();
  return isApiConfigured();
}

export function isVehicleApiEnabled(): boolean {
  if (process.env.NEXT_PUBLIC_VEHICLE_API === "0") return false;
  if (process.env.NEXT_PUBLIC_VEHICLE_API === "1") return isApiConfigured();
  return isApiConfigured();
}

export function isLocalizationFeedsEnabled(): boolean {
  if (process.env.NEXT_PUBLIC_LOCALIZATION_FEEDS === "0") return false;
  if (process.env.NEXT_PUBLIC_LOCALIZATION_FEEDS === "1") return isApiConfigured();
  return isApiConfigured();
}

export function isCustomerCheckoutEnabled(): boolean {
  if (process.env.NEXT_PUBLIC_CUSTOMER_CHECKOUT === "0") return false;
  if (process.env.NEXT_PUBLIC_CUSTOMER_CHECKOUT === "1") return isApiConfigured();
  return isApiConfigured();
}

export function isCustomerSupportEnabled(): boolean {
  if (process.env.NEXT_PUBLIC_CUSTOMER_SUPPORT === "0") return false;
  if (process.env.NEXT_PUBLIC_CUSTOMER_SUPPORT === "1") return isApiConfigured();
  return isApiConfigured();
}

export function isCrmLoyaltyEnabled(): boolean {
  if (process.env.NEXT_PUBLIC_CRM_LOYALTY === "0") return false;
  if (process.env.NEXT_PUBLIC_CRM_LOYALTY === "1") return isApiConfigured();
  return isApiConfigured();
}

export function isProductionBuild(): boolean {
  return process.env.NODE_ENV === "production";
}
