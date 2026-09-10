import type {
  ProductAiProposedAction,
  ProductAiProvenance,
  ProductAiResult,
  QualityIssue,
} from "./types";

function nowIso(): string {
  return new Date().toISOString();
}

function baseProvenance(productId: string, field?: string): ProductAiProvenance {
  return {
    sourceType: "AI_ANALYSIS",
    sourceId: productId,
    sourceTimestamp: nowIso(),
    sourceField: field,
  };
}

export function buildProposedActions(result: Omit<ProductAiResult, "proposedActions">): ProductAiProposedAction[] {
  const actions: ProductAiProposedAction[] = [];

  for (const issue of result.quality.issues.filter((i) => i.severity === "CRITICAL" || i.severity === "WARNING")) {
    actions.push({
      actionType: "FLAG_DATA_QUALITY",
      entityType: "PRODUCT",
      entityId: result.productId,
      parameters: { code: issue.code, field: issue.field },
      classification: issue.classification,
      provenance: baseProvenance(result.productId, issue.field),
    });
  }

  if (result.categoryRecommendation?.reviewRequired && result.categoryRecommendation.primaryCategory) {
    actions.push({
      actionType: "RECOMMEND_CATEGORY",
      entityType: "PRODUCT",
      entityId: result.productId,
      parameters: {
        primaryCategory: result.categoryRecommendation.primaryCategory,
        confidence: result.categoryRecommendation.categoryConfidence,
      },
      classification: "AI_RECOMMENDATION",
      provenance: baseProvenance(result.productId, "category"),
    });
  }

  for (const attr of result.attributeRecommendations.filter((a) => a.source === "UNKNOWN")) {
    actions.push({
      actionType: "RECOMMEND_ATTRIBUTE",
      entityType: "PRODUCT",
      entityId: result.productId,
      parameters: { attribute: attr.attribute, source: "UNKNOWN" },
      classification: "UNKNOWN",
      provenance: attr.provenance,
    });
  }

  for (const content of result.contentRecommendations) {
    const actionType =
      content.field === "title" ? "RECOMMEND_TITLE" : "RECOMMEND_DESCRIPTION";
    actions.push({
      actionType,
      entityType: "PRODUCT",
      entityId: result.productId,
      parameters: { issue: content.issue, recommendation: content.recommendation },
      classification: content.classification,
      provenance: baseProvenance(result.productId, content.field),
    });
  }

  for (const translation of result.translationRecommendations.filter((t) => !t.valid)) {
    actions.push({
      actionType: "RECOMMEND_TRANSLATION",
      entityType: "PRODUCT",
      entityId: result.productId,
      parameters: {
        targetLanguage: translation.targetLanguage,
        field: translation.field,
        issues: translation.issues,
      },
      classification: translation.classification,
      provenance: baseProvenance(result.productId, translation.field),
    });
  }

  for (const dup of result.duplicateSignals.filter((d) => d.duplicateCandidate)) {
    actions.push({
      actionType: "FLAG_DUPLICATE",
      entityType: "PRODUCT",
      entityId: result.productId,
      parameters: {
        matchedProductId: dup.matchedProductId,
        matchType: dup.matchType,
        confidence: dup.confidence,
      },
      classification: dup.classification,
      provenance: baseProvenance(result.productId, "duplicate"),
    });
  }

  if (result.complianceDataStatus !== "DATA_COMPLETE") {
    actions.push({
      actionType: "FLAG_COMPLIANCE_REVIEW",
      entityType: "PRODUCT",
      entityId: result.productId,
      parameters: { status: result.complianceDataStatus },
      classification: "AI_RECOMMENDATION",
      provenance: baseProvenance(result.productId, "compliance"),
    });
  }

  if (result.humanReviewRequired.required) {
    actions.push({
      actionType: "REQUEST_HUMAN_REVIEW",
      entityType: "PRODUCT",
      entityId: result.productId,
      parameters: { reasons: result.humanReviewRequired.reasons },
      classification: "AI_RECOMMENDATION",
      provenance: baseProvenance(result.productId),
    });
  }

  return actions;
}

export function qualityIssuesNeedReview(issues: QualityIssue[]): boolean {
  return issues.some((i) => i.severity === "CRITICAL");
}
