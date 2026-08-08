import type {
  AnalyticsOverview,
  AnalyticsRangePreset,
  CategoryAnalytics,
  CustomerAnalytics,
  FinanceAnalytics,
  InventoryAnalytics,
  ProductAnalytics,
  SalesAnalytics,
  SupplierAnalyticsRow,
} from "./types";

function apiBase(): string {
  return (process.env.NEXT_PUBLIC_BUZZARD_API_URL || "").replace(/\/$/, "");
}

function authHeaders(): HeadersInit {
  const token = typeof window !== "undefined" ? sessionStorage.getItem("buzzard_admin_token") : null;
  return {
    Accept: "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

function rangeQuery(range: AnalyticsRangePreset, from?: string, to?: string): string {
  const params = new URLSearchParams({ range });
  if (range === "custom" && from) params.set("from", from);
  if (range === "custom" && to) params.set("to", to);
  return params.toString();
}

async function request<T>(path: string): Promise<T> {
  const base = apiBase();
  if (!base) throw new Error("admin.apiUnavailable");
  const res = await fetch(`${base}${path}`, { headers: authHeaders() });
  const data = (await res.json()) as T & { success?: boolean; errorKey?: string };
  if (!res.ok) throw new Error(data.errorKey || "admin.requestFailed");
  return data;
}

export async function fetchAnalyticsOverview(range: AnalyticsRangePreset, from?: string, to?: string): Promise<AnalyticsOverview> {
  const data = await request<{ success: boolean; data: AnalyticsOverview }>(`/api/admin/analytics/overview?${rangeQuery(range, from, to)}`);
  return data.data;
}

export async function fetchSalesAnalytics(range: AnalyticsRangePreset, from?: string, to?: string): Promise<SalesAnalytics> {
  const data = await request<{ success: boolean; data: SalesAnalytics }>(`/api/admin/analytics/sales?${rangeQuery(range, from, to)}`);
  return data.data;
}

export async function fetchProductAnalytics(range: AnalyticsRangePreset, from?: string, to?: string): Promise<ProductAnalytics> {
  const data = await request<{ success: boolean; data: ProductAnalytics }>(`/api/admin/analytics/products?${rangeQuery(range, from, to)}`);
  return data.data;
}

export async function fetchCategoryAnalytics(
  range: AnalyticsRangePreset,
  categoryId?: string,
  from?: string,
  to?: string
): Promise<CategoryAnalytics> {
  const qs = rangeQuery(range, from, to);
  const extra = categoryId ? `&categoryId=${encodeURIComponent(categoryId)}` : "";
  const data = await request<{ success: boolean; data: CategoryAnalytics }>(`/api/admin/analytics/categories?${qs}${extra}`);
  return data.data;
}

export async function fetchCustomerAnalytics(range: AnalyticsRangePreset, from?: string, to?: string): Promise<CustomerAnalytics> {
  const data = await request<{ success: boolean; data: CustomerAnalytics }>(`/api/admin/analytics/customers?${rangeQuery(range, from, to)}`);
  return data.data;
}

export async function fetchInventoryAnalytics(): Promise<InventoryAnalytics> {
  const data = await request<{ success: boolean; data: InventoryAnalytics }>("/api/admin/analytics/inventory");
  return data.data;
}

export async function fetchSupplierAnalytics(range: AnalyticsRangePreset, from?: string, to?: string): Promise<{ range: AnalyticsOverview["range"]; suppliers: SupplierAnalyticsRow[] }> {
  const data = await request<{ success: boolean; data: { range: AnalyticsOverview["range"]; suppliers: SupplierAnalyticsRow[] } }>(
    `/api/admin/analytics/suppliers?${rangeQuery(range, from, to)}`
  );
  return data.data;
}

export async function fetchFinanceAnalytics(range: AnalyticsRangePreset, from?: string, to?: string): Promise<FinanceAnalytics> {
  const data = await request<{ success: boolean; data: FinanceAnalytics }>(`/api/admin/analytics/finance?${rangeQuery(range, from, to)}`);
  return data.data;
}

export async function downloadAnalyticsExport(section: string, range: AnalyticsRangePreset, format: "csv" | "json" = "csv"): Promise<void> {
  const base = apiBase();
  if (!base) throw new Error("admin.apiUnavailable");
  const res = await fetch(`${base}/api/admin/analytics/export?section=${encodeURIComponent(section)}&format=${format}&${rangeQuery(range)}`, {
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error("admin.requestFailed");
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `buzzard-${section}.${format === "json" ? "json" : "csv"}`;
  a.click();
  URL.revokeObjectURL(url);
}

export const ANALYTICS_RANGE_OPTIONS: AnalyticsRangePreset[] = [
  "today",
  "yesterday",
  "last_7_days",
  "last_30_days",
  "month_to_date",
  "previous_month",
  "year_to_date",
  "custom",
];
