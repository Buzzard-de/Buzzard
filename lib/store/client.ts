import { isSqliteStoreEnabled, storeApiBase } from "./config";
import type {
  StoreCart,
  StoreCategory,
  StoreOrder,
  StoreOrderResult,
  StoreProduct,
  StoreUser,
} from "./types";

const ACCOUNT_TOKEN_KEY = "buzzard_account_token";
const ADMIN_TOKEN_KEY = "buzzard_admin_token";

function readToken(key: string): string | null {
  if (typeof window === "undefined") return null;
  return sessionStorage.getItem(key);
}

function authHeaders(token?: string | null): HeadersInit {
  const resolved = token ?? readToken(ACCOUNT_TOKEN_KEY) ?? readToken(ADMIN_TOKEN_KEY);
  return {
    "Content-Type": "application/json",
    Accept: "application/json",
    ...(resolved ? { Authorization: `Bearer ${resolved}` } : {}),
  };
}

async function storeFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const base = storeApiBase();
  if (!base) throw new Error("store.apiUnavailable");
  const res = await fetch(`${base}${path}`, {
    ...init,
    headers: { ...authHeaders(), ...init?.headers },
  });
  const data = (await res.json()) as T & { error?: string };
  if (!res.ok) throw new Error(data.error || "store.requestFailed");
  return data;
}

export function isStoreApiActive(): boolean {
  return isSqliteStoreEnabled();
}

export async function storeRegister(body: {
  email: string;
  password: string;
  name: string;
}): Promise<{ token: string; user: StoreUser }> {
  const data = await storeFetch<{ token: string; user: StoreUser }>("/api/auth/register", {
    method: "POST",
    body: JSON.stringify(body),
  });
  saveAccountToken(data.token);
  return data;
}

function saveAccountToken(token: string): void {
  sessionStorage.setItem(ACCOUNT_TOKEN_KEY, token);
}

function saveAdminToken(token: string): void {
  sessionStorage.setItem(ADMIN_TOKEN_KEY, token);
}

function clearStoreTokens(): void {
  sessionStorage.removeItem(ACCOUNT_TOKEN_KEY);
  sessionStorage.removeItem(ADMIN_TOKEN_KEY);
}

export async function storeLogin(email: string, password: string): Promise<{ token: string; user: StoreUser }> {
  const data = await storeFetch<{ token: string; user: StoreUser }>("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
  saveAccountToken(data.token);
  if (data.user.role === "admin") {
    saveAdminToken(data.token);
  }
  return data;
}

export async function storeLogout(): Promise<void> {
  clearStoreTokens();
}

export async function storeMe(): Promise<StoreUser> {
  return storeFetch<StoreUser>("/api/me");
}

export async function storeUpdateMe(body: { name?: string }): Promise<StoreUser> {
  return storeFetch<StoreUser>("/api/me", {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

export async function storeCategories(): Promise<StoreCategory[]> {
  return storeFetch<StoreCategory[]>("/api/categories");
}

export async function storeProducts(params?: { q?: string; category?: string }): Promise<StoreProduct[]> {
  const url = new URL(`${storeApiBase()}/api/products`);
  if (params?.q) url.searchParams.set("q", params.q);
  if (params?.category) url.searchParams.set("category", params.category);
  const res = await fetch(url.toString(), { headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error("store.productsFailed");
  return (await res.json()) as StoreProduct[];
}

export async function storeFetchCart(): Promise<StoreCart> {
  return storeFetch<StoreCart>("/api/cart");
}

export async function storeAddToCart(productId: number, quantity = 1): Promise<void> {
  await storeFetch("/api/cart/items", {
    method: "POST",
    body: JSON.stringify({ productId, quantity }),
  });
}

export async function storeRemoveFromCart(productId: number): Promise<void> {
  await storeFetch(`/api/cart/items/${productId}`, { method: "DELETE" });
}

export async function storeCreateOrder(body: {
  countryCode: string;
  currency: string;
  shippingAddress?: Record<string, unknown>;
}): Promise<StoreOrderResult> {
  const data = await storeFetch<StoreOrderResult>("/api/db/orders", {
    method: "POST",
    body: JSON.stringify(body),
  });
  return data;
}

export async function storeListOrders(): Promise<StoreOrder[]> {
  return storeFetch<StoreOrder[]>("/api/db/orders");
}

export async function storeAdminOrders(): Promise<StoreOrder[]> {
  return storeFetch<StoreOrder[]>("/api/db/admin/orders", {
    headers: authHeaders(readToken(ADMIN_TOKEN_KEY)),
  });
}

export async function storeAdminProducts(): Promise<StoreProduct[]> {
  return storeFetch<StoreProduct[]>("/api/db/admin/products", {
    headers: authHeaders(readToken(ADMIN_TOKEN_KEY)),
  });
}

export async function storeAdminGetProduct(id: number): Promise<StoreProduct> {
  return storeFetch<StoreProduct>(`/api/db/admin/products/${id}`, {
    headers: authHeaders(readToken(ADMIN_TOKEN_KEY)),
  });
}

export async function storeAdminUpdateProduct(
  id: number,
  patch: Partial<Pick<StoreProduct, "price_eur" | "stock" | "active" | "name" | "description">>
): Promise<StoreProduct> {
  return storeFetch<StoreProduct>(`/api/db/admin/products/${id}`, {
    method: "PATCH",
    body: JSON.stringify(patch),
    headers: authHeaders(readToken(ADMIN_TOKEN_KEY)),
  });
}

export async function storeAdminUpdateOrderStatus(
  orderNumber: string,
  status: string
): Promise<StoreOrder> {
  return storeFetch<StoreOrder>(`/api/db/admin/orders/${encodeURIComponent(orderNumber)}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
    headers: authHeaders(readToken(ADMIN_TOKEN_KEY)),
  });
}

export async function storeGetOrderByNumber(orderNumber: string): Promise<StoreOrder> {
  return storeFetch<StoreOrder>(`/api/db/orders/${encodeURIComponent(orderNumber)}`);
}
