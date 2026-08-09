import type {
  CartCheckoutCartRow,
  CartCheckoutCoupon,
  CartCheckoutOverview,
  CartCheckoutSessionRow,
  CartCheckoutShippingRate,
  CartCheckoutStatus,
} from "./types";

function apiBase(): string {
  return (process.env.NEXT_PUBLIC_BUZZARD_API_URL || "").replace(/\/$/, "");
}

function adminHeaders(): HeadersInit {
  const adminToken =
    typeof window !== "undefined" ? sessionStorage.getItem("buzzard_admin_token") : null;
  return {
    "Content-Type": "application/json",
    Accept: "application/json",
    ...(adminToken ? { Authorization: `Bearer ${adminToken}` } : {}),
  };
}

async function adminRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const base = apiBase();
  if (!base) throw new Error("cartCheckout.apiUnavailable");
  const res = await fetch(`${base}${path}`, {
    ...init,
    headers: { ...adminHeaders(), ...(init?.headers || {}) },
  });
  const data = (await res.json()) as T & { error?: string };
  if (!res.ok) throw new Error(data.error || "cartCheckout.requestFailed");
  return data;
}

export function isCartCheckoutApiConfigured(): boolean {
  return Boolean(apiBase());
}

export async function fetchCartCheckoutStatus(): Promise<CartCheckoutStatus> {
  const base = apiBase();
  if (!base) throw new Error("cartCheckout.apiUnavailable");
  const res = await fetch(`${base}/api/health`, { headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error("cartCheckout.requestFailed");
  const data = (await res.json()) as { cartCheckout?: CartCheckoutStatus };
  if (!data.cartCheckout?.enabled) throw new Error("cartCheckout.disabled");
  return data.cartCheckout;
}

export async function fetchCartCheckoutOverview(): Promise<CartCheckoutOverview> {
  return adminRequest<CartCheckoutOverview>("/api/admin/cart-checkout/overview");
}

export async function fetchCartCheckoutCarts(): Promise<CartCheckoutCartRow[]> {
  return adminRequest<CartCheckoutCartRow[]>("/api/admin/cart-checkout/carts");
}

export async function fetchCartCheckoutSessions(): Promise<CartCheckoutSessionRow[]> {
  return adminRequest<CartCheckoutSessionRow[]>("/api/admin/cart-checkout/sessions");
}

export async function fetchCartCheckoutCoupons(): Promise<CartCheckoutCoupon[]> {
  return adminRequest<CartCheckoutCoupon[]>("/api/admin/cart-checkout/coupons");
}

export async function fetchCartCheckoutShippingRates(): Promise<CartCheckoutShippingRate[]> {
  return adminRequest<CartCheckoutShippingRate[]>("/api/admin/cart-checkout/shipping-rates");
}
