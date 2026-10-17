import { isSqliteStoreEnabled, storeApiBase } from "./config";
import {
  clearAccountSessionFlag,
  clearAdminSessionFlag,
  markAccountSession,
  markAdminSession,
  withAdminOrAccountCredentials,
} from "@/lib/admin/authTransport";
import type {
  StoreCart,
  StoreCategory,
  StoreOrder,
  StoreOrderResult,
  StoreProduct,
  StoreUser,
} from "./types";

async function storeFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const base = storeApiBase();
  if (!base) throw new Error("store.apiUnavailable");
  const res = await fetch(`${base}${path}`, withAdminOrAccountCredentials(init));
  const data = (await res.json()) as T & { errorKey?: string };
  if (!res.ok) throw new Error(data.errorKey || "store.requestFailed");
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
  const data = await storeFetch<{ token: string; csrfToken?: string; user: StoreUser }>("/api/auth/register", {
    method: "POST",
    body: JSON.stringify(body),
  });
  markAccountSession(data.csrfToken);
  return data;
}

export async function storeLogin(email: string, password: string): Promise<{ token: string; user: StoreUser }> {
  const data = await storeFetch<{ token: string; csrfToken?: string; user: StoreUser }>("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
  markAccountSession(data.csrfToken);
  if (data.user.role === "admin") {
    markAdminSession(data.csrfToken);
  }
  return data;
}

export async function storeLogout(): Promise<void> {
  clearAccountSessionFlag();
  clearAdminSessionFlag();
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

export async function storeAddToCart(body: {
  productId?: number;
  sku?: string;
  quantity?: number;
}): Promise<void> {
  await storeFetch("/api/cart/items", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function storeUpdateCartItem(productId: number, quantity: number): Promise<void> {
  await storeFetch(`/api/cart/items/${productId}`, {
    method: "PATCH",
    body: JSON.stringify({ quantity }),
  });
}

export async function storeSyncCart(items: Array<{ sku: string; quantity: number }>): Promise<StoreCart> {
  return storeFetch<StoreCart>("/api/cart/sync", {
    method: "PUT",
    body: JSON.stringify({ items }),
  });
}

export async function storeProductBySku(sku: string): Promise<StoreProduct> {
  return storeFetch<StoreProduct>(`/api/products/by-sku/${encodeURIComponent(sku)}`);
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
  return storeFetch<StoreOrder[]>("/api/db/admin/orders");
}

export async function storeAdminProducts(): Promise<StoreProduct[]> {
  return storeFetch<StoreProduct[]>("/api/db/admin/products");
}

export async function storeAdminGetProduct(id: number): Promise<StoreProduct> {
  return storeFetch<StoreProduct>(`/api/db/admin/products/${id}`);
}

export async function storeAdminUpdateProduct(
  id: number,
  patch: Partial<Pick<StoreProduct, "price_eur" | "stock" | "active" | "name" | "description">>
): Promise<StoreProduct> {
  return storeFetch<StoreProduct>(`/api/db/admin/products/${id}`, {
    method: "PATCH",
    body: JSON.stringify(patch),
  });
}

export async function storeAdminUpdateOrderStatus(
  orderNumber: string,
  status: string
): Promise<StoreOrder> {
  return storeFetch<StoreOrder>(`/api/db/admin/orders/${encodeURIComponent(orderNumber)}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
}

export async function storeGetOrderByNumber(orderNumber: string): Promise<StoreOrder> {
  return storeFetch<StoreOrder>(`/api/db/orders/${encodeURIComponent(orderNumber)}`);
}
