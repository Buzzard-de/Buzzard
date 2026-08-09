import { getAccountToken } from "@/lib/account/client";
import type {
  CustomerCheckoutDraft,
  CustomerCheckoutQuote,
  CustomerCheckoutStatus,
  CustomerCoupon,
  CustomerCouponValidation,
  CustomerReview,
  CustomerShippingMethod,
} from "./types";

function apiBase(): string {
  return (process.env.NEXT_PUBLIC_BUZZARD_API_URL || "").replace(/\/$/, "");
}

function authHeaders(): HeadersInit {
  const adminToken =
    typeof window !== "undefined" ? sessionStorage.getItem("buzzard_admin_token") : null;
  const accountToken = getAccountToken();
  const token = adminToken || accountToken;
  return {
    "Content-Type": "application/json",
    Accept: "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const base = apiBase();
  if (!base) throw new Error("customerCheckout.apiUnavailable");
  const res = await fetch(`${base}${path}`, {
    ...init,
    headers: { ...authHeaders(), ...init?.headers },
  });
  const data = (await res.json()) as T & { error?: string };
  if (!res.ok) throw new Error(data.error || "customerCheckout.requestFailed");
  return data;
}

export function isCustomerCheckoutApiConfigured(): boolean {
  return Boolean(apiBase());
}

export async function fetchCustomerCheckoutStatus(): Promise<CustomerCheckoutStatus> {
  const base = apiBase();
  if (!base) throw new Error("customerCheckout.apiUnavailable");
  const res = await fetch(`${base}/api/health`, { headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error("customerCheckout.requestFailed");
  const data = (await res.json()) as { customerCheckout?: CustomerCheckoutStatus };
  if (!data.customerCheckout?.enabled) throw new Error("customerCheckout.disabled");
  return data.customerCheckout;
}

export async function fetchShippingMethods(countryCode: string): Promise<CustomerShippingMethod[]> {
  return request<CustomerShippingMethod[]>(
    `/api/customer/shipping-methods/${encodeURIComponent(countryCode)}`
  );
}

export async function validateCustomerCoupon(
  code: string,
  subtotal: number
): Promise<CustomerCouponValidation> {
  return request<CustomerCouponValidation>("/api/customer/coupons/validate", {
    method: "POST",
    body: JSON.stringify({ code, subtotal }),
  });
}

export async function fetchCustomerCheckoutQuote(body: {
  subtotal: number;
  countryCode: string;
  currency?: string;
  shippingMethod?: string;
  couponCode?: string;
}): Promise<CustomerCheckoutQuote> {
  return request<CustomerCheckoutQuote>("/api/customer/checkout/quote", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function saveCustomerCheckoutDraft(draft: CustomerCheckoutDraft): Promise<void> {
  await request("/api/customer/checkout/draft", {
    method: "PUT",
    body: JSON.stringify({
      addressId: draft.address_id,
      countryCode: draft.country_code,
      currency: draft.currency,
      shippingMethod: draft.shipping_method,
      couponCode: draft.coupon_code,
      notes: draft.notes,
    }),
  });
}

export async function fetchCustomerCheckoutDraft(): Promise<CustomerCheckoutDraft> {
  return request<CustomerCheckoutDraft>("/api/customer/checkout/draft");
}

export async function fetchAdminCustomerCheckoutStatus(): Promise<CustomerCheckoutStatus> {
  return request<CustomerCheckoutStatus>("/api/admin/customer-checkout/status");
}

export async function fetchAdminReviews(): Promise<CustomerReview[]> {
  return request<CustomerReview[]>("/api/admin/customer-checkout/reviews");
}

export async function updateReviewStatus(reviewId: number, status: "approved" | "rejected"): Promise<void> {
  await request(`/api/admin/customer-checkout/reviews/${reviewId}`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
}

export async function fetchAdminCoupons(): Promise<CustomerCoupon[]> {
  return request<CustomerCoupon[]>("/api/admin/customer-checkout/coupons");
}

export async function createAdminCoupon(body: {
  code: string;
  type?: string;
  value: number;
  minOrder?: number;
  expiresAt?: string | null;
}): Promise<void> {
  await request("/api/admin/customer-checkout/coupons", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function fetchProductReviews(productId: string): Promise<
  Array<{ rating: number; title: string; body: string; created_at: string }>
> {
  return request(`/api/customer/products/${encodeURIComponent(productId)}/reviews`);
}

export interface CustomerProfileResponse {
  user: { id: number; email: string; name: string; role: string };
  addresses: Array<{
    id: number;
    name: string;
    line1: string;
    city: string;
    postal_code: string;
    country_code: string;
    phone?: string | null;
  }>;
  wishlist: Array<number | string>;
}

export async function fetchCustomerProfile(): Promise<CustomerProfileResponse> {
  return request<CustomerProfileResponse>("/api/customer/profile");
}

export async function createCustomerAddress(body: Record<string, unknown>): Promise<CustomerProfileResponse["addresses"][0]> {
  return request("/api/customer/addresses", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function updateCustomerAddress(
  id: string,
  body: Record<string, unknown>
): Promise<CustomerProfileResponse["addresses"][0]> {
  return request(`/api/customer/addresses/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

export async function deleteCustomerAddress(id: string): Promise<void> {
  await request(`/api/customer/addresses/${encodeURIComponent(id)}`, { method: "DELETE" });
}

export async function addCustomerWishlistItem(productId: string): Promise<void> {
  await request(`/api/customer/wishlist/${encodeURIComponent(productId)}`, { method: "POST", body: "{}" });
}

export async function removeCustomerWishlistItem(productId: string): Promise<void> {
  await request(`/api/customer/wishlist/${encodeURIComponent(productId)}`, { method: "DELETE" });
}
