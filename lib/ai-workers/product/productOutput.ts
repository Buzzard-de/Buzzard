import type { ProductAiResult } from "./types";

const REQUIRED_RESULT_FIELDS: (keyof ProductAiResult)[] = [
  "productId",
  "taskId",
  "analysisType",
  "quality",
  "attributeRecommendations",
  "contentRecommendations",
  "translationRecommendations",
  "duplicateSignals",
  "anomalies",
  "marketReadiness",
  "marketplaceReadiness",
  "complianceDataStatus",
  "proposedActions",
  "humanReviewRequired",
  "confidence",
  "reasoningSummary",
  "provenance",
  "overwriteCanonicalProduct",
];

export function validateProductAiResultSchema(result: unknown): { ok: boolean; errors: string[] } {
  const errors: string[] = [];
  if (!result || typeof result !== "object") {
    return { ok: false, errors: ["MALFORMED_OUTPUT:NOT_OBJECT"] };
  }

  const rec = result as Record<string, unknown>;

  for (const field of REQUIRED_RESULT_FIELDS) {
    if (rec[field] === undefined) {
      errors.push(`MALFORMED_OUTPUT:MISSING_${field.toUpperCase()}`);
    }
  }

  if (typeof rec.confidence !== "number" || (rec.confidence as number) < 0 || (rec.confidence as number) > 1) {
    errors.push("MALFORMED_OUTPUT:INVALID_CONFIDENCE");
  }

  if (rec.overwriteCanonicalProduct === true) {
    errors.push("POLICY_VIOLATION:OVERWRITE_CANONICAL");
  }

  const quality = rec.quality as ProductAiResult["quality"] | undefined;
  if (quality?.scores) {
    for (const [key, val] of Object.entries(quality.scores)) {
      if (typeof val !== "number" || val < 0 || val > 100) {
        errors.push(`MALFORMED_OUTPUT:INVALID_SCORE_${key}`);
      }
    }
  }

  return { ok: errors.length === 0, errors };
}

export function summarizeResult(result: ProductAiResult): string {
  const issueCount = result.quality.issues.length;
  return `Product AI ${result.analysisType} for ${result.productId}: score ${result.quality.scores.qualityScore}/100, ${issueCount} issues, market ${result.marketReadiness.status}`;
}
