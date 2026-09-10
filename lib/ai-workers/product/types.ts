import type { TaskType } from "@/lib/ai-orchestrator/types";

export type ValueClassification = "FACT" | "AI_RECOMMENDATION" | "DERIVED_VALUE" | "UNKNOWN";

export type AttributeSourceClassification = "OBSERVED" | "DERIVED" | "RECOMMENDED" | "UNKNOWN";

export type ProductAiAnalysisType = "PRODUCT_ANALYSIS" | "PRODUCT_TRANSLATION";

export type MarketReadinessStatus = "READY" | "NEEDS_REVIEW" | "NOT_READY";

export type ComplianceDataStatus = "DATA_COMPLETE" | "DATA_INCOMPLETE" | "REVIEW_REQUIRED";

export type ProductAiActionType =
  | "RECOMMEND_CATEGORY"
  | "RECOMMEND_ATTRIBUTE"
  | "RECOMMEND_TITLE"
  | "RECOMMEND_DESCRIPTION"
  | "RECOMMEND_TRANSLATION"
  | "FLAG_DUPLICATE"
  | "FLAG_DATA_QUALITY"
  | "FLAG_COMPLIANCE_REVIEW"
  | "REQUEST_HUMAN_REVIEW";

export type ProvenanceSourceType =
  | "SUPPLIER_OFFER"
  | "PIM_FIELD"
  | "PRODUCT_ENGINE"
  | "MARKET_ENGINE"
  | "MARKETPLACE_MAPPING"
  | "AI_ANALYSIS";

export interface ProductAiProvenance {
  sourceType: ProvenanceSourceType;
  sourceId: string;
  sourceTimestamp: string;
  sourceField?: string;
}

export interface ProductAiInput {
  productId: string;
  supplierId?: string;
  sourceOfferId?: string;
  market?: string;
  channel?: string;
  language?: string;
  title?: string;
  description?: string;
  brand?: string;
  manufacturer?: string;
  mpn?: string;
  ean?: string;
  gtin?: string;
  category?: string;
  subcategory?: string;
  attributes: Record<string, string | number | boolean | null>;
  imagesMetadata: Array<{ url: string; type?: string; alt?: string }>;
  dimensions?: { length?: number; width?: number; height?: number; unit?: string };
  weight?: number;
  weightUnit?: string;
  compatibility: Array<Record<string, unknown>>;
  hazmatIndicators?: string[];
  countryOfOrigin?: string;
  existingTranslations: Array<{ locale: string; title?: string; description?: string }>;
  marketAvailability?: string[];
  stockStatus?: string;
  productType?: string;
  /** Internal-only fields — never exposed to customer-safe views. */
  _internal?: Record<string, unknown>;
}

export interface QualityIssue {
  code: string;
  field: string;
  severity: "CRITICAL" | "WARNING" | "INFO";
  message: string;
  classification: ValueClassification;
}

export interface ProductQualityScores {
  qualityScore: number;
  completenessScore: number;
  contentScore: number;
  attributeScore: number;
  translationScore: number;
  marketReadinessScore: number;
  complianceDataScore: number;
}

export interface CategoryRecommendation {
  primaryCategory?: string;
  secondaryCategory?: string;
  categoryConfidence: number;
  categoryReasons: string[];
  reviewRequired: boolean;
  classification: ValueClassification;
}

export interface AttributeRecommendation {
  attribute: string;
  value: string | number | boolean | null;
  unit?: string;
  confidence: number;
  source: AttributeSourceClassification;
  classification: ValueClassification;
  provenance: ProductAiProvenance;
}

export interface ContentRecommendation {
  field: "title" | "description" | "seo";
  issue: string;
  recommendation: string;
  classification: ValueClassification;
}

export interface TranslationRecommendation {
  sourceLanguage: string;
  targetLanguage: string;
  field: "title" | "description" | "attributes" | "categoryFacing" | "marketplaceFacing";
  suggestedText?: string;
  issues: string[];
  valid: boolean;
  classification: ValueClassification;
}

export interface DuplicateSignal {
  duplicateCandidate: boolean;
  matchType: string | null;
  confidence: number;
  matchedProductId?: string;
  reasons: string[];
  classification: ValueClassification;
}

export interface AnomalySignal {
  code: string;
  field?: string;
  message: string;
  severity: "LOW" | "MEDIUM" | "HIGH";
  classification: ValueClassification;
}

export interface MarketReadinessResult {
  status: MarketReadinessStatus;
  market: string;
  missingFields: string[];
  reasons: string[];
}

export interface MarketplaceReadinessEntry {
  channel: string;
  marketplaceId: string;
  status: MarketReadinessStatus;
  missingDataSignals: string[];
  recommendations: string[];
}

export interface HumanReviewRequest {
  required: boolean;
  reasons: string[];
  priority: "LOW" | "MEDIUM" | "HIGH";
}

export interface ProductAiProposedAction {
  actionType: ProductAiActionType;
  entityType: "PRODUCT";
  entityId: string;
  parameters?: Record<string, unknown>;
  classification: ValueClassification;
  provenance: ProductAiProvenance;
}

export interface ProductAiResult {
  productId: string;
  taskId: string;
  analysisType: ProductAiAnalysisType;
  quality: {
    issues: QualityIssue[];
    scores: ProductQualityScores;
  };
  categoryRecommendation?: CategoryRecommendation;
  attributeRecommendations: AttributeRecommendation[];
  contentRecommendations: ContentRecommendation[];
  translationRecommendations: TranslationRecommendation[];
  duplicateSignals: DuplicateSignal[];
  anomalies: AnomalySignal[];
  marketReadiness: MarketReadinessResult;
  marketplaceReadiness: MarketplaceReadinessEntry[];
  complianceDataStatus: ComplianceDataStatus;
  proposedActions: ProductAiProposedAction[];
  humanReviewRequired: HumanReviewRequest;
  confidence: number;
  reasoningSummary: string;
  provenance: ProductAiProvenance[];
  overwriteCanonicalProduct: false;
  /** Policy flags checked by deterministic validation. */
  inventCompatibility?: boolean;
  modifyIdentifiers?: boolean;
  fabricateComplianceClaim?: boolean;
}

export interface ProductAiValidationResult {
  ok: boolean;
  decision: "ALLOW" | "REJECT" | "REVIEW";
  errors: string[];
}

export interface ProductAiFixtureExpectation {
  minQualityScore?: number;
  maxQualityScore?: number;
  marketReadiness?: MarketReadinessStatus;
  complianceDataStatus?: ComplianceDataStatus;
  duplicateCandidate?: boolean;
  humanReviewRequired?: boolean;
  hasDataQualityFlag?: boolean;
  hasAnomaly?: boolean;
  translationValid?: boolean;
  identifiersPreserved?: boolean;
  rejected?: boolean;
}

export interface ProductAiFixtureScenario {
  id: string;
  description: string;
  input: ProductAiInput;
  taskType: TaskType;
  expectation: ProductAiFixtureExpectation;
}
