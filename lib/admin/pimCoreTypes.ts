export type PimProductStatus =
  | "DRAFT"
  | "IMPORTED"
  | "VALIDATING"
  | "READY"
  | "ACTIVE"
  | "HIDDEN"
  | "BLOCKED"
  | "ARCHIVED";

export type PimWorkflowStatus =
  | "DRAFT"
  | "IMPORTED"
  | "NORMALIZED"
  | "VALIDATED"
  | "REVIEW_REQUIRED"
  | "READY_FOR_REVIEW"
  | "APPROVED"
  | "PUBLISH_BLOCKED"
  | "PUBLISHED"
  | "INVALID";

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
  workflowStatus?: PimWorkflowStatus;
  validationOverall?: ValidationStatus;
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

export interface PimStructuredValidationReport {
  valid: boolean;
  status: string;
  overall?: ValidationStatus;
  errors: Array<{ field: string; detail?: unknown; code?: string }>;
  warnings: Array<{ field: string; detail?: unknown }>;
  missingFields: string[];
  failCount?: number;
  warningCount?: number;
  lifecycleStatus?: string;
  score?: number | null;
  ready?: boolean;
}

export interface PimHealthReport {
  timestamp: string;
  diagnosticOnly: boolean;
  autoActivate: boolean;
  activationAllowed: boolean;
  humanApprovalRequired: boolean;
  publishBlocked: boolean;
  liveSupplierContacted: boolean;
  salesEnabled: boolean;
  summary: {
    totalProducts: number;
    validProducts: number;
    invalidProducts: number;
    reviewRequired: number;
    missingImages: number;
    missingCategories: number;
    duplicateSkus: number;
    duplicateEans: number;
    publishBlocked: number;
    demoProducts: number;
    publicCatalogProducts: number;
    stagingRecords: number;
  };
  workflow: Record<string, number>;
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
