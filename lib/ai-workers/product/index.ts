export type {
  AnomalySignal,
  AttributeRecommendation,
  AttributeSourceClassification,
  CategoryRecommendation,
  ComplianceDataStatus,
  ContentRecommendation,
  DuplicateSignal,
  HumanReviewRequest,
  MarketReadinessResult,
  MarketReadinessStatus,
  MarketplaceReadinessEntry,
  ProductAiAnalysisType,
  ProductAiFixtureExpectation,
  ProductAiFixtureScenario,
  ProductAiInput,
  ProductAiProposedAction,
  ProductAiProvenance,
  ProductAiResult,
  ProductAiValidationResult,
  ProductQualityScores,
  ProvenanceSourceType,
  QualityIssue,
  TranslationRecommendation,
  ValueClassification,
} from "./types";

export {
  CATEGORY_CONFIDENCE_THRESHOLD,
  CATEGORY_CRITICAL_ATTRIBUTES,
  KNOWN_CATEGORY_IDS,
  MARKETPLACE_CHANNELS,
  MARKETPLACE_ID_MAP,
} from "./constants";

export {
  buildProductAiInput,
  buildProductAiInputFromEngine,
  resolveProductForAnalysis,
} from "./productInput";

export {
  validateProductAiContext,
  stripFinancialFromInput,
  toCustomerSafeProductAiResult,
  containsInternalFields,
  assertNoUnauthorizedProductAccess,
} from "./productContext";

export {
  analyzeQualityIssues,
  computeQualityScores,
  analyzeTitleContent,
  analyzeDescriptionContent,
} from "./productQuality";

export { recommendCategory, validateCategoryId } from "./productCategory";
export { recommendAttributes, detectFabricatedAttributes } from "./productAttributes";
export {
  recommendTranslations,
  validateIdentifierPreservation,
  validateTranslationLanguage,
  detectPlaceholderCorruption,
} from "./productTranslation";
export { detectDuplicateSignals, titleSimilarity } from "./productDuplicate";
export { detectAnomalies } from "./productAnomaly";
export { analyzeComplianceData } from "./productCompliance";
export { analyzeMarketReadiness, analyzeMarketplaceReadiness } from "./productMarket";
export { buildProposedActions, qualityIssuesNeedReview } from "./productActions";
export { validateProductAiResultSchema, summarizeResult } from "./productOutput";
export {
  validateProductAiPolicy,
  validateProductExists,
  validateNoCanonicalMutation,
  validateIdentifierIntegrity,
} from "./productValidation";
export { runProductAiAnalysis, executeProductAiWorker } from "./productAiWorker";
export {
  PRODUCT_AI_FIXTURE_SCENARIOS,
  getFixtureScenario,
  buildFixtureInput,
} from "./fixtures";
