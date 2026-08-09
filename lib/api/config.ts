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

export function isAnalyticsDashboardEnabled(): boolean {
  if (process.env.NEXT_PUBLIC_ANALYTICS_DASHBOARD === "0") return false;
  if (process.env.NEXT_PUBLIC_ANALYTICS_DASHBOARD === "1") return isApiConfigured();
  return isApiConfigured();
}

export function isMarketingCenterEnabled(): boolean {
  if (process.env.NEXT_PUBLIC_MARKETING_CENTER === "0") return false;
  if (process.env.NEXT_PUBLIC_MARKETING_CENTER === "1") return isApiConfigured();
  return isApiConfigured();
}

export function isMarketplaceHubEnabled(): boolean {
  if (process.env.NEXT_PUBLIC_MARKETPLACE_HUB === "0") return false;
  if (process.env.NEXT_PUBLIC_MARKETPLACE_HUB === "1") return isApiConfigured();
  return isApiConfigured();
}

export function isLogisticsFulfillmentEnabled(): boolean {
  if (process.env.NEXT_PUBLIC_LOGISTICS_FULFILLMENT === "0") return false;
  if (process.env.NEXT_PUBLIC_LOGISTICS_FULFILLMENT === "1") return isApiConfigured();
  return isApiConfigured();
}

export function isWmsInventoryEnabled(): boolean {
  if (process.env.NEXT_PUBLIC_WMS_INVENTORY === "0") return false;
  if (process.env.NEXT_PUBLIC_WMS_INVENTORY === "1") return isApiConfigured();
  return isApiConfigured();
}

export function isPimCatalogEnabled(): boolean {
  if (process.env.NEXT_PUBLIC_PIM_CATALOG === "0") return false;
  if (process.env.NEXT_PUBLIC_PIM_CATALOG === "1") return isApiConfigured();
  return isApiConfigured();
}

export function isIdentitySecurityEnabled(): boolean {
  if (process.env.NEXT_PUBLIC_IDENTITY_SECURITY === "0") return false;
  if (process.env.NEXT_PUBLIC_IDENTITY_SECURITY === "1") return isApiConfigured();
  return isApiConfigured();
}

export function isPaymentsFinanceEnabled(): boolean {
  if (process.env.NEXT_PUBLIC_PAYMENTS_FINANCE === "0") return false;
  if (process.env.NEXT_PUBLIC_PAYMENTS_FINANCE === "1") return isApiConfigured();
  return isApiConfigured();
}

export function isOrderManagementEnabled(): boolean {
  if (process.env.NEXT_PUBLIC_ORDER_MANAGEMENT === "0") return false;
  if (process.env.NEXT_PUBLIC_ORDER_MANAGEMENT === "1") return isApiConfigured();
  return isApiConfigured();
}

export function isCartCheckoutEnabled(): boolean {
  if (process.env.NEXT_PUBLIC_CART_CHECKOUT === "0") return false;
  if (process.env.NEXT_PUBLIC_CART_CHECKOUT === "1") return isApiConfigured();
  return isApiConfigured();
}

export function isCrmCustomerServiceEnabled(): boolean {
  if (process.env.NEXT_PUBLIC_CRM_CUSTOMER_SERVICE === "0") return false;
  if (process.env.NEXT_PUBLIC_CRM_CUSTOMER_SERVICE === "1") return isApiConfigured();
  return isApiConfigured();
}

export function isReturnsRmaEnabled(): boolean {
  if (process.env.NEXT_PUBLIC_RETURNS_RMA === "0") return false;
  if (process.env.NEXT_PUBLIC_RETURNS_RMA === "1") return isApiConfigured();
  return isApiConfigured();
}

export function isMarketingLoyaltyEnabled(): boolean {
  if (process.env.NEXT_PUBLIC_MARKETING_LOYALTY === "0") return false;
  if (process.env.NEXT_PUBLIC_MARKETING_LOYALTY === "1") return isApiConfigured();
  return isApiConfigured();
}

export function isReviewsRatingsEnabled(): boolean {
  if (process.env.NEXT_PUBLIC_REVIEWS_RATINGS === "0") return false;
  if (process.env.NEXT_PUBLIC_REVIEWS_RATINGS === "1") return isApiConfigured();
  return isApiConfigured();
}

export function isAiCenterEnabled(): boolean {
  if (process.env.NEXT_PUBLIC_AI_CENTER === "0") return false;
  if (process.env.NEXT_PUBLIC_AI_CENTER === "1") return isApiConfigured();
  return isApiConfigured();
}

export function isAdvancedSearchEnabled(): boolean {
  if (process.env.NEXT_PUBLIC_ADVANCED_SEARCH === "0") return false;
  if (process.env.NEXT_PUBLIC_ADVANCED_SEARCH === "1") return isApiConfigured();
  return isApiConfigured();
}

export function isProductCatalogPimEnabled(): boolean {
  if (process.env.NEXT_PUBLIC_PRODUCT_CATALOG_PIM === "0") return false;
  if (process.env.NEXT_PUBLIC_PRODUCT_CATALOG_PIM === "1") return isApiConfigured();
  return isApiConfigured();
}

export function isProductionBuild(): boolean {
  return process.env.NODE_ENV === "production";
}
