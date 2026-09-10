import type { AttributeRecommendation, ProductAiInput } from "./types";
import { CATEGORY_CRITICAL_ATTRIBUTES } from "./constants";

function nowIso(): string {
  return new Date().toISOString();
}

export function recommendAttributes(input: ProductAiInput): AttributeRecommendation[] {
  const recommendations: AttributeRecommendation[] = [];
  const criticalAttrs = input.category ? CATEGORY_CRITICAL_ATTRIBUTES[input.category] ?? [] : [];

  for (const [key, value] of Object.entries(input.attributes)) {
    recommendations.push({
      attribute: key,
      value,
      confidence: 1,
      source: "OBSERVED",
      classification: "FACT",
      provenance: {
        sourceType: "PIM_FIELD",
        sourceId: input.productId,
        sourceTimestamp: nowIso(),
        sourceField: key,
      },
    });
  }

  for (const attr of criticalAttrs) {
    const existing = input.attributes[attr];
    if (existing === undefined || existing === null || existing === "") {
      recommendations.push({
        attribute: attr,
        value: null,
        confidence: 0,
        source: "UNKNOWN",
        classification: "UNKNOWN",
        provenance: {
          sourceType: "AI_ANALYSIS",
          sourceId: input.productId,
          sourceTimestamp: nowIso(),
          sourceField: attr,
        },
      });
    }
  }

  if (input.weight === undefined) {
    recommendations.push({
      attribute: "weight",
      value: null,
      confidence: 0,
      source: "UNKNOWN",
      classification: "UNKNOWN",
      provenance: {
        sourceType: "AI_ANALYSIS",
        sourceId: input.productId,
        sourceTimestamp: nowIso(),
        sourceField: "weight",
      },
    });
  } else {
    recommendations.push({
      attribute: "weight",
      value: input.weight,
      unit: input.weightUnit ?? "kg",
      confidence: 1,
      source: "OBSERVED",
      classification: "FACT",
      provenance: {
        sourceType: "PRODUCT_ENGINE",
        sourceId: input.productId,
        sourceTimestamp: nowIso(),
        sourceField: "weight",
      },
    });
  }

  return recommendations;
}

export function detectFabricatedAttributes(
  recommendations: AttributeRecommendation[]
): string[] {
  const errors: string[] = [];
  for (const rec of recommendations) {
    if (rec.source === "OBSERVED" && rec.classification === "AI_RECOMMENDATION") {
      errors.push(`FABRICATED_ATTRIBUTE:${rec.attribute}`);
    }
    if (rec.source === "UNKNOWN" && rec.classification === "FACT") {
      errors.push(`UNKNOWN_AS_FACT:${rec.attribute}`);
    }
  }
  return errors;
}
