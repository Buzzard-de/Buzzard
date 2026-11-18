export type PimProductStatus =
  | "DRAFT"
  | "IMPORTED"
  | "VALIDATING"
  | "READY"
  | "ACTIVE"
  | "HIDDEN"
  | "BLOCKED"
  | "ARCHIVED";

export type ValidationStatus = "PASS" | "WARNING" | "FAIL";

export interface PimBrand {
  id: number;
  name: string;
  slug: string;
  manufacturer?: string | null;
  country?: string | null;
  logoUrl?: string | null;
  website?: string | null;
  status: string;
}

export interface PimProduct {
  id: string;
  sku: string;
  supplierSku?: string | null;
  ean?: string | null;
  gtin?: string | null;
  mpn?: string | null;
  brandId?: number | null;
  brand?: { id: number; name: string; slug: string } | null;
  title: string;
  description?: string | null;
  shortDescription?: string | null;
  category?: string | null;
  subcategory?: string | null;
  attributes?: Record<string, unknown>;
  price: number;
  stock: number;
  supplier?: string | null;
  status: PimProductStatus;
  visibility: string;
  qualityScore?: number | null;
  seo?: Record<string, unknown>;
  createdAt?: string;
  updatedAt?: string;
}

export interface PimValidationResult {
  overall: ValidationStatus;
  results: Array<{ field: string; status: ValidationStatus; detail: unknown }>;
  failCount: number;
  warningCount: number;
}

export interface PimSupplierMapping {
  id: string;
  supplierId: string;
  supplierSku?: string | null;
  supplierProductId?: string | null;
  internalProductId?: string | null;
  internalSku?: string | null;
  ean?: string | null;
  confidence?: number | null;
}

export interface PimImportResult {
  importJobId: string;
  dryRun: boolean;
  stages: Array<{ stage: string; status: string; [key: string]: unknown }>;
  validation: PimValidationResult;
  product?: PimProduct | null;
}

/** HTTP 202 from the import route: the dry run is held for human approval and has not run. */
export interface PimImportPendingApproval {
  pendingApproval: true;
  executed: false;
  dryRun: boolean;
  approval?: { id?: string; status?: string; riskLevel?: string; [key: string]: unknown } | null;
  job: null;
}

export type PimImportResponse = PimImportResult | PimImportPendingApproval;

export function isPimImportPending(response: PimImportResponse): response is PimImportPendingApproval {
  return (response as PimImportPendingApproval).pendingApproval === true;
}

export interface PimAttributeSchema {
  categoryId: string;
  version?: number;
  attributes: Array<{ key: string; label: string; type: string }>;
}

export interface PimQualityScore {
  score: number;
  dimensions: Record<string, number>;
}

export interface PimAuditEntry {
  id: string;
  productId?: string | null;
  action: string;
  source: string;
  actorId?: string | null;
  beforeJson?: string | null;
  afterJson?: string | null;
  createdAt: string;
}
