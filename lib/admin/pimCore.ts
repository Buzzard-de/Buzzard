import type {
  PimAttributeSchema,
  PimBrand,
  PimHealthReport,
  PimImportResult,
  PimProduct,
  PimQualityScore,
  PimStructuredValidationReport,
  PimSupplierMapping,
  PimValidationResult,
  PimAuditEntry,
  PimWorkflowStatus,
} from "./pimCoreTypes";

const TOKEN_KEY = "buzzard_admin_token";

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
  if (!base) throw new Error("admin.apiUnavailable");
  const res = await fetch(`${base}${path}`, { ...init, headers: { ...authHeaders(), ...init?.headers } });
  const data = (await res.json()) as T & { success?: boolean; errorKey?: string; message?: string };
  if (!res.ok) throw new Error(data.errorKey || data.message || "admin.requestFailed");
  return data;
}

export async function fetchPimProducts(params?: {
  status?: string;
  category?: string;
  q?: string;
  workflow?: PimWorkflowStatus | "ALL";
}): Promise<PimProduct[]> {
  const qs = new URLSearchParams();
  if (params?.status) qs.set("status", params.status);
  if (params?.category) qs.set("category", params.category);
  if (params?.q) qs.set("q", params.q);
  if (params?.workflow) qs.set("workflow", params.workflow);
  const suffix = qs.toString() ? `?${qs.toString()}` : "";
  const data = await request<{ success: boolean; products: PimProduct[] }>(`/api/admin/pim-core/products${suffix}`);
  return data.products;
}

export async function fetchPimProduct(id: string): Promise<{ product: PimProduct; audit: PimAuditEntry[] }> {
  const data = await request<{ success: boolean; product: PimProduct; audit: PimAuditEntry[] }>(
    `/api/admin/pim-core/products/${encodeURIComponent(id)}`
  );
  return { product: data.product, audit: data.audit || [] };
}

export async function validatePimProduct(id: string): Promise<{
  validation: PimValidationResult;
  report: PimStructuredValidationReport;
  workflowStatus: PimWorkflowStatus;
}> {
  const data = await request<{
    success: boolean;
    validation: PimValidationResult;
    report: PimStructuredValidationReport;
    workflowStatus: PimWorkflowStatus;
  }>(`/api/admin/pim-core/products/${encodeURIComponent(id)}/validate`, {
    method: "POST",
    body: "{}",
  });
  return {
    validation: data.validation,
    report: data.report,
    workflowStatus: data.workflowStatus,
  };
}

export async function fetchPimHealth(): Promise<PimHealthReport> {
  const data = await request<{ success: boolean; report: PimHealthReport }>("/api/admin/pim-core/health");
  return data.report;
}

export async function fetchPimBrands(): Promise<PimBrand[]> {
  const data = await request<{ success: boolean; brands: PimBrand[] }>("/api/admin/pim-core/brands");
  return data.brands;
}

export async function createPimBrand(body: Partial<PimBrand>): Promise<PimBrand> {
  const data = await request<{ success: boolean; brand: PimBrand }>("/api/admin/pim-core/brands", {
    method: "POST",
    body: JSON.stringify(body),
  });
  return data.brand;
}

export async function fetchSupplierMappings(params?: {
  supplierId?: string;
  unmapped?: boolean;
}): Promise<PimSupplierMapping[]> {
  const qs = new URLSearchParams();
  if (params?.supplierId) qs.set("supplierId", params.supplierId);
  if (params?.unmapped) qs.set("unmapped", "1");
  const suffix = qs.toString() ? `?${qs.toString()}` : "";
  const data = await request<{ success: boolean; mappings: PimSupplierMapping[] }>(
    `/api/admin/pim-core/supplier-mappings${suffix}`
  );
  return data.mappings;
}

export async function runPimImport(raw: Record<string, unknown>, dryRun = true): Promise<PimImportResult> {
  const data = await request<PimImportResult & { success: boolean }>("/api/admin/pim-core/import", {
    method: "POST",
    body: JSON.stringify({ raw, dryRun }),
  });
  return data;
}

export async function fetchCategoryAttributeSchema(categoryId: string): Promise<PimAttributeSchema | null> {
  const data = await request<{ success: boolean; schema: PimAttributeSchema | null }>(
    `/api/admin/pim-core/categories/${encodeURIComponent(categoryId)}/schema`
  );
  return data.schema;
}

export async function fetchPimQuality(productId: string): Promise<PimQualityScore> {
  const data = await request<{ success: boolean; quality: PimQualityScore }>(
    `/api/admin/pim-core/quality/${encodeURIComponent(productId)}`
  );
  return data.quality;
}

export async function searchPimProducts(q: string): Promise<PimProduct[]> {
  const data = await request<{ success: boolean; results: PimProduct[] }>(
    `/api/admin/pim-core/search?q=${encodeURIComponent(q)}`
  );
  return data.results;
}

export async function fetchPimAiCapabilities(): Promise<string[]> {
  const data = await request<{ success: boolean; capabilities: string[] }>("/api/admin/pim-core/ai/capabilities");
  return data.capabilities;
}
