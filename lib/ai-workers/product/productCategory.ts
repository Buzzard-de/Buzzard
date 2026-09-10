import type { CategoryRecommendation, ProductAiInput } from "./types";
import {
  CATEGORY_CONFIDENCE_THRESHOLD,
  CATEGORY_KEYWORD_HINTS,
  KNOWN_CATEGORY_IDS,
} from "./constants";

export function recommendCategory(input: ProductAiInput): CategoryRecommendation {
  const current = input.category;
  const text = `${input.title ?? ""} ${input.description ?? ""}`.toLowerCase();

  if (current && KNOWN_CATEGORY_IDS.has(current)) {
    return {
      primaryCategory: current,
      secondaryCategory: input.subcategory,
      categoryConfidence: 0.95,
      categoryReasons: ["Category already assigned in Product Engine"],
      reviewRequired: false,
      classification: "FACT",
    };
  }

  let bestCategory: string | undefined;
  let bestScore = 0;
  const reasons: string[] = [];

  for (const [categoryId, keywords] of Object.entries(CATEGORY_KEYWORD_HINTS)) {
    let score = 0;
    for (const kw of keywords) {
      if (text.includes(kw.toLowerCase())) {
        score += 1;
        reasons.push(`Keyword match: ${kw} → ${categoryId}`);
      }
    }
    if (score > bestScore) {
      bestScore = score;
      bestCategory = categoryId;
    }
  }

  const confidence = bestScore > 0 ? Math.min(0.5 + bestScore * 0.15, 0.9) : 0.3;
  const reviewRequired = confidence < CATEGORY_CONFIDENCE_THRESHOLD || !bestCategory;

  return {
    primaryCategory: bestCategory,
    secondaryCategory: input.subcategory,
    categoryConfidence: confidence,
    categoryReasons: reasons.length ? reasons : ["Insufficient signals for category assignment"],
    reviewRequired,
    classification: bestCategory ? "AI_RECOMMENDATION" : "UNKNOWN",
  };
}

export function validateCategoryId(categoryId: string): boolean {
  return KNOWN_CATEGORY_IDS.has(categoryId);
}
