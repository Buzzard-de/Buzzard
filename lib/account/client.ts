import type { AccountAddress, AccountPreferences, AccountUser, CustomerOrder } from "./types";
import {
  createCustomerAddress,
  deleteCustomerAddress,
  fetchCustomerProfile,
  updateCustomerAddress,
  addCustomerWishlistItem,
  removeCustomerWishlistItem,
} from "@/lib/customerCheckout/client";
import { isSqliteStoreEnabled } from "@/lib/store/config";
import {
  mapStoreAddress,
  mapStoreOrder,
  mapStoreUser,
  storeListOrders,
  storeLogin,
  storeLogout,
  storeMe,
  storeRegister,
  storeUpdateMe,
} from "@/lib/store";

const TOKEN_KEY = "buzzard_account_token";

function apiBase(): string {
  return (process.env.NEXT_PUBLIC_BUZZARD_API_URL || "").replace(/\/$/, "");
}

function authHeaders(): HeadersInit {
  const token = typeof window !== "undefined" ? sessionStorage.getItem(TOKEN_KEY) : null;
  return {
    "Content-Type": "application/json",
    Accept: "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const base = apiBase();
  if (!base) throw new Error("account.apiUnavailable");
  const res = await fetch(`${base}${path}`, { ...init, headers: { ...authHeaders(), ...init?.headers } });
  const data = (await res.json()) as T & { errorKey?: string };
  if (!res.ok) throw new Error(data.errorKey || "account.requestFailed");
  return data;
}

export function saveAccountToken(token: string): void {
  sessionStorage.setItem(TOKEN_KEY, token);
}

export function clearAccountToken(): void {
  sessionStorage.removeItem(TOKEN_KEY);
}

export function getAccountToken(): string | null {
  if (typeof window === "undefined") return null;
  return sessionStorage.getItem(TOKEN_KEY);
}

export async function accountRegister(body: Record<string, unknown>): Promise<{ token: string; user: AccountUser }> {
  if (isSqliteStoreEnabled()) {
    const name = [body.firstName, body.lastName].filter(Boolean).join(" ").trim();
    const data = await storeRegister({
      email: String(body.email || ""),
      password: String(body.password || ""),
      name: name || String(body.email || ""),
    });
    saveAccountToken(data.token);
    return { token: data.token, user: mapStoreUser(data.user, String(body.country || "DE")) };
  }
  const data = await request<{ success: boolean; token: string; user: AccountUser }>("/api/account/register", {
    method: "POST",
    body: JSON.stringify(body),
  });
  saveAccountToken(data.token);
  return { token: data.token, user: data.user };
}

export async function accountLogin(email: string, password: string): Promise<{ token: string; user: AccountUser }> {
  if (isSqliteStoreEnabled()) {
    const data = await storeLogin(email, password);
    saveAccountToken(data.token);
    return { token: data.token, user: mapStoreUser(data.user) };
  }
  const data = await request<{ success: boolean; token: string; user: AccountUser }>("/api/account/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
  saveAccountToken(data.token);
  return { token: data.token, user: data.user };
}

export async function accountLogout(): Promise<void> {
  if (isSqliteStoreEnabled()) {
    await storeLogout();
    return;
  }
  try {
    await request("/api/account/logout", { method: "POST", body: "{}" });
  } finally {
    clearAccountToken();
  }
}

async function fetchSqliteProfile() {
  try {
    return await fetchCustomerProfile();
  } catch {
    const user = await storeMe();
    return { user, addresses: [], wishlist: [] as Array<number | string> };
  }
}

function addressToStoreBody(address: Partial<AccountAddress>) {
  return {
    firstName: address.firstName,
    lastName: address.lastName,
    street: address.street,
    zip: address.zip,
    city: address.city,
    country: address.country,
  };
}

export async function fetchAccountMe(): Promise<{
  user: AccountUser;
  preferences: AccountPreferences;
  addressCount: number;
  wishlistCount: number;
}> {
  if (isSqliteStoreEnabled()) {
    const profile = await fetchSqliteProfile();
    return {
      user: mapStoreUser({
        id: profile.user.id,
        email: profile.user.email,
        name: profile.user.name,
        role: profile.user.role === "admin" ? "admin" : "customer",
      }),
      preferences: { language: "de", marketing: false, transactional: true },
      addressCount: profile.addresses.length,
      wishlistCount: profile.wishlist.length,
    };
  }
  return request("/api/account/me");
}

export async function updateAccountProfile(patch: Partial<AccountUser>): Promise<AccountUser> {
  if (isSqliteStoreEnabled()) {
    const name = [patch.firstName, patch.lastName].filter(Boolean).join(" ").trim();
    if (name) {
      const user = await storeUpdateMe({ name });
      return mapStoreUser(user, patch.country || "DE");
    }
    const me = await fetchAccountMe();
    return { ...me.user, ...patch };
  }
  const data = await request<{ success: boolean; user: AccountUser }>("/api/account/profile", {
    method: "PUT",
    body: JSON.stringify(patch),
  });
  return data.user;
}

export async function fetchAccountAddresses(): Promise<AccountAddress[]> {
  if (isSqliteStoreEnabled()) {
    const profile = await fetchSqliteProfile();
    return profile.addresses.map(mapStoreAddress);
  }
  const data = await request<{ success: boolean; addresses: AccountAddress[] }>("/api/account/addresses");
  return data.addresses;
}

export async function saveAccountAddress(address: Partial<AccountAddress> & { id?: string }): Promise<AccountAddress> {
  if (isSqliteStoreEnabled()) {
    const body = addressToStoreBody(address);
    const saved = address.id
      ? await updateCustomerAddress(address.id, body)
      : await createCustomerAddress(body);
    return mapStoreAddress(saved);
  }
  const path = address.id ? `/api/account/addresses/${encodeURIComponent(address.id)}` : "/api/account/addresses";
  const data = await request<{ success: boolean; address: AccountAddress }>(path, {
    method: address.id ? "PUT" : "POST",
    body: JSON.stringify(address),
  });
  return data.address;
}

export async function deleteAccountAddress(id: string): Promise<void> {
  if (isSqliteStoreEnabled()) {
    await deleteCustomerAddress(id);
    return;
  }
  await request(`/api/account/addresses/${encodeURIComponent(id)}`, { method: "DELETE" });
}

export async function fetchAccountOrders(): Promise<CustomerOrder[]> {
  if (isSqliteStoreEnabled()) {
    const orders = await storeListOrders();
    return orders.map(mapStoreOrder);
  }
  const data = await request<{ success: boolean; orders: CustomerOrder[] }>("/api/account/orders");
  return data.orders;
}

export async function fetchAccountOrder(orderNumber: string): Promise<CustomerOrder> {
  if (isSqliteStoreEnabled()) {
    const orders = await storeListOrders();
    const order = orders.find((o) => o.order_number === orderNumber);
    if (!order) throw new Error("account.order.notFound");
    return mapStoreOrder(order);
  }
  const data = await request<{ success: boolean; order: CustomerOrder }>(
    `/api/account/orders/${encodeURIComponent(orderNumber)}`
  );
  return data.order;
}

export async function fetchAccountWishlist(): Promise<string[]> {
  if (isSqliteStoreEnabled()) {
    const profile = await fetchSqliteProfile();
    return profile.wishlist.map(String);
  }
  const data = await request<{ success: boolean; productIds: string[] }>("/api/account/wishlist");
  return data.productIds;
}

export async function syncAccountWishlist(productIds: string[]): Promise<string[]> {
  if (isSqliteStoreEnabled()) {
    const profile = await fetchSqliteProfile();
    const current = new Set(profile.wishlist.map(String));
    const next = new Set(productIds.map(String));
    for (const id of next) {
      if (!current.has(id)) await addCustomerWishlistItem(id);
    }
    for (const id of current) {
      if (!next.has(id)) await removeCustomerWishlistItem(id);
    }
    return productIds;
  }
  const data = await request<{ success: boolean; productIds: string[] }>("/api/account/wishlist", {
    method: "PUT",
    body: JSON.stringify({ productIds }),
  });
  return data.productIds;
}

export async function updateAccountPreferences(preferences: AccountPreferences): Promise<AccountPreferences> {
  if (isSqliteStoreEnabled()) return preferences;
  const data = await request<{ success: boolean; preferences: AccountPreferences }>("/api/account/preferences", {
    method: "PUT",
    body: JSON.stringify(preferences),
  });
  return data.preferences;
}

export async function requestPasswordReset(email: string): Promise<{ resetToken?: string }> {
  if (isSqliteStoreEnabled()) throw new Error("account.featureUnavailable");
  return request("/api/account/password-reset/request", {
    method: "POST",
    body: JSON.stringify({ email }),
  });
}

export async function confirmPasswordReset(body: {
  token: string;
  password: string;
  passwordConfirm: string;
}): Promise<void> {
  if (isSqliteStoreEnabled()) throw new Error("account.featureUnavailable");
  await request("/api/account/password-reset/confirm", { method: "POST", body: JSON.stringify(body) });
}

export async function requestAccountDeletion(): Promise<string> {
  if (isSqliteStoreEnabled()) throw new Error("account.featureUnavailable");
  const data = await request<{ success: boolean; requestedAt: string }>("/api/account/deletion-request", {
    method: "POST",
    body: "{}",
  });
  return data.requestedAt;
}

export { TOKEN_KEY };
