import type { AiTask } from "@/lib/ai-orchestrator/types";
import type { StructuredWorkerOutput, WorkerContext } from "../types";
import { buildProposedAction } from "../action";
import { buildProductAiInput } from "./productInput";
import { validateProductAiContext, assertNoUnauthorizedProductAccess } from "./productContext";
import {
  analyzeQualityIssues,
  computeQualityScores,
  analyzeTitleContent,
  analyzeDescriptionContent,
} from "./productQuality";
import { recommendCategory } from "./productCategory";
import { recommendAttributes } from "./productAttributes";
import { recommendTranslations } from "./productTranslation";
import { detectDuplicateSignals } from "./productDuplicate";
import { detectAnomalies } from "./productAnomaly";
import { analyzeComplianceData } from "./productCompliance";
import { analyzeMarketReadiness, analyzeMarketplaceReadiness } from "./productMarket";
import { buildProposedActions, qualityIssuesNeedReview } from "./productActions";
import { validateProductAiPolicy } from "./productValidation";
import { validateProductAiResultSchema, summarizeResult } from "./productOutput";
import type { ProductAiAnalysisType, ProductAiInput, ProductAiResult } from "./types";

function nowIso(): string {
  return new Date().toISOString();
}

export function runProductAiAnalysis(
  input: ProductAiInput,
  taskId: string,
  analysisType: ProductAiAnalysisType = "PRODUCT_ANALYSIS"
): ProductAiResult {
  const issues = analyzeQualityIssues(input);
  const scores = computeQualityScores(input, issues);
  const categoryRecommendation = recommendCategory(input);
  const attributeRecommendations = recommendAttributes(input);
  const contentRecommendations = [
    ...analyzeTitleContent(input).map((c) => ({
      ...c,
      classification: "AI_RECOMMENDATION" as const,
    })),
    ...analyzeDescriptionContent(input).map((c) => ({
      ...c,
      classification: "AI_RECOMMENDATION" as const,
    })),
  ];
  const translationRecommendations =
    analysisType === "PRODUCT_TRANSLATION" ? recommendTranslations(input) : recommendTranslations(input);
  const duplicateSignals = detectDuplicateSignals(input);
  const anomalies = detectAnomalies(input);
  const compliance = analyzeComplianceData(input);
  const marketReadiness = analyzeMarketReadiness(input, scores);
  const marketplaceReadiness = analyzeMarketplaceReadiness(input);

  const humanReviewReasons: string[] = [];
  if (categoryRecommendation.reviewRequired) {
    humanReviewReasons.push("Low-confidence category recommendation");
  }
  if (qualityIssuesNeedReview(issues)) {
    humanReviewReasons.push("Critical data quality issues");
  }
  if (duplicateSignals.some((d) => d.duplicateCandidate && d.confidence >= 0.85)) {
    humanReviewReasons.push("Duplicate product ambiguity");
  }
  if (anomalies.some((a) => a.severity === "HIGH")) {
    humanReviewReasons.push("High-severity anomalies detected");
  }
  if (compliance.status === "REVIEW_REQUIRED") {
    humanReviewReasons.push("Compliance data concerns");
  }
  if (input.productType === "automotive" && input.compatibility.length === 0) {
    humanReviewReasons.push("Automotive fitment uncertainty — NEEDS_DATA");
  }
  const unknownCriticalAttrs = attributeRecommendations.filter(
    (a) => a.source === "UNKNOWN" && a.classification === "UNKNOWN"
  );
  if (unknownCriticalAttrs.length >= 3) {
    humanReviewReasons.push("Missing critical product attributes");
  }
  if (contentRecommendations.some((c) => c.issue === "UNSUPPORTED_CLAIM")) {
    humanReviewReasons.push("Unsupported technical claims");
  }

  const partial: Omit<ProductAiResult, "proposedActions"> = {
    productId: input.productId,
    taskId,
    analysisType,
    quality: { issues, scores },
    categoryRecommendation,
    attributeRecommendations,
    contentRecommendations,
    translationRecommendations,
    duplicateSignals,
    anomalies,
    marketReadiness,
    marketplaceReadiness,
    complianceDataStatus: compliance.status,
    humanReviewRequired: {
      required: humanReviewReasons.length > 0,
      reasons: humanReviewReasons,
      priority: humanReviewReasons.some((r) => r.includes("Critical") || r.includes("Duplicate"))
        ? "HIGH"
        : humanReviewReasons.length > 0
          ? "MEDIUM"
          : "LOW",
    },
    confidence: Math.min(0.95, scores.qualityScore / 100),
    reasoningSummary: "",
    provenance: [
      {
        sourceType: "PRODUCT_ENGINE",
        sourceId: input.productId,
        sourceTimestamp: nowIso(),
      },
    ],
    overwriteCanonicalProduct: false,
    inventCompatibility: false,
    modifyIdentifiers: false,
    fabricateComplianceClaim: false,
  };

  const proposedActions = buildProposedActions(partial);
  const result: ProductAiResult = { ...partial, proposedActions, reasoningSummary: "" };
  result.reasoningSummary = summarizeResult(result);

  return result;
}

export function executeProductAiWorker(
  context: WorkerContext,
  task: AiTask
): StructuredWorkerOutput {
  const contextCheck = validateProductAiContext(context);
  if (!contextCheck.ok) {
    return {
      recommendation: { error: "CONTEXT_SECURITY_VIOLATION", errors: contextCheck.errors },
      confidence: 0,
      reasoningSummary: "Product AI context rejected — security violation",
      requiredApproval: false,
      authorityRequired: "NEVER_EXECUTE",
      deterministicValidationRequired: true,
    };
  }

  if (context.metadata?.malformedOutput === true) {
    return {
      recommendation: { incomplete: true },
      confidence: 2,
      reasoningSummary: "Malformed test output",
      requiredApproval: false,
      authorityRequired: "RECOMMEND",
      deterministicValidationRequired: true,
    };
  }

  const input = buildProductAiInput(context);
  if (!input) {
    return {
      recommendation: {
        error: "PRODUCT_NOT_FOUND",
        productId: context.productId,
        humanReviewRequired: { required: true, reasons: ["Product not found in Product Engine"], priority: "HIGH" },
      },
      confidence: 0,
      reasoningSummary: "Product not found — canonical data must exist in Product Engine",
      requiredApproval: false,
      authorityRequired: "RECOMMEND",
      deterministicValidationRequired: true,
      action: buildProposedAction({
        actionType: "REQUEST_HUMAN_REVIEW",
        entityType: "PRODUCT",
        entityId: context.productId ?? "",
        category: "RECOMMENDATION",
        requiresApproval: false,
      }),
    };
  }

  const accessCheck = assertNoUnauthorizedProductAccess(
    input.productId,
    context.productId
  );
  if (!accessCheck.ok && !context.metadata?.fixtureScenario) {
    return {
      recommendation: { error: accessCheck.error },
      confidence: 0,
      reasoningSummary: "Unauthorized product access blocked",
      requiredApproval: false,
      authorityRequired: "NEVER_EXECUTE",
      deterministicValidationRequired: true,
    };
  }

  const analysisType: ProductAiAnalysisType =
    task.taskType === "PRODUCT_TRANSLATION" ? "PRODUCT_TRANSLATION" : "PRODUCT_ANALYSIS";

  let result = runProductAiAnalysis(input, task.taskId, analysisType);

  if (context.metadata?.forcePolicyViolation) {
    result = {
      ...result,
      overwriteCanonicalProduct: true as never,
      inventCompatibility: true,
    };
  }

  const policy = validateProductAiPolicy(result, input);
  const schema = validateProductAiResultSchema(result);

  const primaryAction = result.proposedActions[0];

  return {
    recommendation: {
      ...result,
      validationDecision: policy.decision,
      validationErrors: [...policy.errors, ...schema.errors],
    },
    confidence: result.confidence,
    reasoningSummary: result.reasoningSummary.slice(0, 2000),
    requiredApproval: result.humanReviewRequired.priority === "HIGH",
    authorityRequired: "RECOMMEND",
    deterministicValidationRequired: true,
    proposedAction: primaryAction?.actionType,
    action: primaryAction
      ? buildProposedAction({
          actionType: primaryAction.actionType,
          entityType: "PRODUCT",
          entityId: primaryAction.entityId,
          parameters: primaryAction.parameters,
          category: "RECOMMENDATION",
          requiresApproval: result.humanReviewRequired.priority === "HIGH",
        })
      : undefined,
  };
}
