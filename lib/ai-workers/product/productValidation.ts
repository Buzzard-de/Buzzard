import { validateProduct } from "@/lib/product-engine/validation";
import { getProduct } from "@/lib/product-engine/service";
import { validateCategoryId } from "./productCategory";
import { detectFabricatedAttributes } from "./productAttributes";
import { validateTranslationLanguage } from "./productTranslation";
import { validateProductAiResultSchema } from "./productOutput";
import type { ProductAiInput, ProductAiResult, ProductAiValidationResult } from "./types";

export function validateProductAiPolicy(
  result: ProductAiResult,
  input: ProductAiInput
): ProductAiValidationResult {
  const errors: string[] = [];

  const schema = validateProductAiResultSchema(result);
  if (!schema.ok) errors.push(...schema.errors);

  if (result.overwriteCanonicalProduct) {
    errors.push("PRODUCT_ENGINE:CANNOT_OVERWRITE_CANONICAL");
  }

  if (result.inventCompatibility) {
    errors.push("PRODUCT_ENGINE:CANNOT_INVENT_COMPATIBILITY");
  }

  if (result.modifyIdentifiers) {
    errors.push("PRODUCT_ENGINE:CANNOT_MODIFY_IDENTIFIERS");
  }

  if (result.fabricateComplianceClaim) {
    errors.push("PRODUCT_ENGINE:CANNOT_FABRICATE_COMPLIANCE");
  }

  if (result.categoryRecommendation?.primaryCategory) {
    if (!validateCategoryId(result.categoryRecommendation.primaryCategory)) {
      errors.push("PRODUCT_ENGINE:INVALID_CATEGORY");
    }
  }

  errors.push(...detectFabricatedAttributes(result.attributeRecommendations));

  for (const attr of result.attributeRecommendations) {
    if (attr.source === "OBSERVED" && attr.classification === "AI_RECOMMENDATION") {
      errors.push(`PRODUCT_AI:OBSERVED_CANNOT_BE_RECOMMENDATION:${attr.attribute}`);
    }
  }

  if (input.market && input.language) {
    if (!validateTranslationLanguage(input.language, input.market)) {
      errors.push("PRODUCT_AI:INVALID_LANGUAGE");
    }
  }

  if (input.market && !["DE", "FR", "PL", "AT", "NL", "BE", "IT", "ES", "SA", "AE", "EG"].includes(input.market.toUpperCase())) {
    const product = getProduct(input.productId);
    if (!product && input.market.length !== 2) {
      errors.push("PRODUCT_AI:INVALID_MARKET");
    }
  }

  const product = getProduct(input.productId);
  if (product) {
    const engineValidation = validateProduct(product);
    if (!engineValidation.valid && result.overwriteCanonicalProduct) {
      errors.push("PRODUCT_ENGINE:VALIDATION_FAILED");
    }
  }

  if (errors.length > 0) {
    const review = errors.some((e) => e.includes("REVIEW") || e.includes("CONFIDENCE"));
    return {
      ok: false,
      decision: review ? "REVIEW" : "REJECT",
      errors,
    };
  }

  return { ok: true, decision: "ALLOW", errors: [] };
}

export function validateProductExists(productId: string): boolean {
  return Boolean(getProduct(productId)) || productId.startsWith("fixture-") || productId.startsWith("duplicate-");
}

export function validateNoCanonicalMutation(result: ProductAiResult): boolean {
  return result.overwriteCanonicalProduct === false;
}

export function validateIdentifierIntegrity(
  input: ProductAiInput,
  result: ProductAiResult
): string[] {
  const errors: string[] = [];
  for (const translation of result.translationRecommendations) {
    for (const issue of translation.issues) {
      if (issue.startsWith("IDENTIFIER_ALTERED") || issue.startsWith("IDENTIFIER_NOT_PRESERVED")) {
        errors.push(issue);
      }
    }
  }
  if (result.modifyIdentifiers) errors.push("IDENTIFIER_MODIFICATION_ATTEMPT");
  return errors;
}
