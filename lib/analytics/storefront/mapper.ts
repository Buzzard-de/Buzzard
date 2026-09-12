import type { MarketingEventName } from "@/lib/marketing/events";
import type { AnalyticsEventType } from "../types";

const MARKETING_TO_ANALYTICS: Partial<Record<MarketingEventName, AnalyticsEventType>> = {
  page_view: "PAGE_VIEW",
  view_item: "PRODUCT_VIEW",
  search: "SEARCH",
  view_category: "CATEGORY_VIEW",
  add_to_cart: "ADD_TO_CART",
  remove_from_cart: "REMOVE_FROM_CART",
  view_cart: "VIEW_CART",
  begin_checkout: "CHECKOUT_START",
  add_payment_info: "CHECKOUT_STEP",
  purchase: "CHECKOUT_COMPLETED",
  language_change: "LANGUAGE_CHANGED",
};

export function mapMarketingEventToAnalyticsType(name: MarketingEventName): AnalyticsEventType | null {
  return MARKETING_TO_ANALYTICS[name] ?? null;
}

export function buildAnalyticsPayloadFromMarketing(
  name: MarketingEventName,
  payload: Record<string, unknown>
): {
  productId?: string;
  categoryId?: string;
  orderIdReference?: string;
  quantity?: number;
  pagePath?: string;
  metadata?: Record<string, unknown>;
} {
  const productId =
    (typeof payload.product_id === "string" ? payload.product_id : undefined)
    ?? (typeof payload.productId === "string" ? payload.productId : undefined);

  const categoryId =
    (typeof payload.category_slug === "string" ? payload.category_slug : undefined)
    ?? (typeof payload.categoryId === "string" ? payload.categoryId : undefined);

  const orderIdReference =
    typeof payload.transaction_id === "string" ? payload.transaction_id : undefined;

  const quantity =
    typeof payload.quantity === "number" ? payload.quantity
      : typeof payload.quantity === "string" ? Number(payload.quantity) : undefined;

  const pagePath =
    typeof payload.page_path === "string" ? payload.page_path
      : typeof payload.pagePath === "string" ? payload.pagePath : undefined;

  const metadata: Record<string, unknown> = {};
  if (typeof payload.search_term === "string") metadata.searchTerm = payload.search_term;
  if (typeof payload.payment_provider === "string") metadata.paymentProvider = payload.payment_provider;
  if (typeof payload.locale === "string") metadata.locale = payload.locale;
  if (name === "add_payment_info") metadata.checkoutStep = "payment";

  return {
    productId,
    categoryId,
    orderIdReference,
    quantity: Number.isFinite(quantity) ? quantity : undefined,
    pagePath,
    metadata: Object.keys(metadata).length ? metadata : undefined,
  };
}
