import { getAccountToken } from "@/lib/account/client";
import type {
  AbandonedCartRecord,
  CrmLoyaltyStatus,
  CrmProfile,
  CustomerOffer,
  CustomerSegment,
  LoyaltyAccount,
  LoyaltyLedgerEntry,
  LoyaltyReward,
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
  if (!base) throw new Error("crmLoyalty.apiUnavailable");
  const res = await fetch(`${base}${path}`, {
    ...init,
    headers: { ...authHeaders(), ...init?.headers },
  });
  const data = (await res.json()) as T & { error?: string };
  if (!res.ok) throw new Error(data.error || "crmLoyalty.requestFailed");
  return data;
}

export function isCrmLoyaltyApiConfigured(): boolean {
  return Boolean(apiBase());
}

export async function fetchCrmLoyaltyStatus(): Promise<CrmLoyaltyStatus> {
  const base = apiBase();
  if (!base) throw new Error("crmLoyalty.apiUnavailable");
  const res = await fetch(`${base}/api/health`, { headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error("crmLoyalty.requestFailed");
  const data = (await res.json()) as { crmLoyalty?: CrmLoyaltyStatus };
  if (!data.crmLoyalty?.enabled) throw new Error("crmLoyalty.disabled");
  return data.crmLoyalty;
}

export async function fetchCrmProfile(): Promise<{
  profile: CrmProfile | null;
  loyalty: LoyaltyAccount;
}> {
  return request("/api/customer/crm/profile");
}

export async function saveCrmProfile(body: {
  phone?: string;
  countryCode?: string;
  language?: string;
  marketingEmail?: boolean;
  marketingSms?: boolean;
  marketingWhatsapp?: boolean;
}): Promise<void> {
  await request("/api/customer/crm/profile", {
    method: "PUT",
    body: JSON.stringify(body),
  });
}

export async function fetchLoyaltyDashboard(): Promise<{
  account: LoyaltyAccount;
  ledger: LoyaltyLedgerEntry[];
  rewards: LoyaltyReward[];
}> {
  return request("/api/customer/loyalty");
}

export async function redeemLoyaltyReward(
  rewardId: number
): Promise<{ ok: boolean; code: string; reward: LoyaltyReward }> {
  return request("/api/customer/loyalty/redeem", {
    method: "POST",
    body: JSON.stringify({ rewardId }),
  });
}

export async function fetchCustomerOffers(): Promise<CustomerOffer[]> {
  return request<CustomerOffer[]>("/api/customer/offers");
}

export async function trackAbandonedCart(body: {
  subtotal: number;
  currency?: string;
  itemCount: number;
}): Promise<void> {
  if (!getAccountToken()) return;
  await request("/api/customer/cart/abandoned", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function markCartRecovered(): Promise<void> {
  if (!getAccountToken()) return;
  await request("/api/customer/cart/recovered", { method: "POST", body: "{}" });
}

export async function fetchAdminCrmLoyaltyStatus(): Promise<CrmLoyaltyStatus> {
  return request<CrmLoyaltyStatus>("/api/admin/crm-loyalty/status");
}

export async function fetchAdminSegments(): Promise<CustomerSegment[]> {
  return request<CustomerSegment[]>("/api/admin/crm-loyalty/segments");
}

export async function fetchAdminAbandonedCarts(): Promise<AbandonedCartRecord[]> {
  return request<AbandonedCartRecord[]>("/api/admin/crm-loyalty/abandoned-carts");
}

export async function fetchAdminOffers(): Promise<CustomerOffer[]> {
  return request<CustomerOffer[]>("/api/admin/crm-loyalty/offers");
}

export async function fetchAdminLoyaltyAccounts(): Promise<LoyaltyAccount[]> {
  return request<LoyaltyAccount[]>("/api/admin/crm-loyalty/loyalty");
}

export async function queueRecoveryCampaigns(
  channel = "email"
): Promise<{ queued: number }> {
  return request("/api/admin/crm-loyalty/recovery-campaigns/queue", {
    method: "POST",
    body: JSON.stringify({ channel }),
  });
}

export async function adminEarnPoints(body: {
  userId: number;
  points: number;
  reason?: string;
  reference?: string;
}): Promise<LoyaltyAccount> {
  return request("/api/admin/crm-loyalty/points/earn", {
    method: "POST",
    body: JSON.stringify(body),
  });
}
