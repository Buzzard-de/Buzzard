import type { WorkerContext } from "../types";
import type { ProductAiInput, ProductAiResult } from "./types";
import { INTERNAL_OUTPUT_FIELDS } from "./constants";

const SECRET_PATTERNS = [/api[_-]?key/i, /password/i, /token/i, /secret/i, /credential/i, /cvv/i];

function scanForSecrets(obj: Record<string, unknown>, prefix = ""): string[] {
  const errors: string[] = [];
  for (const [key, value] of Object.entries(obj)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (SECRET_PATTERNS.some((p) => p.test(key))) {
      errors.push(`SECRET_FIELD:${path}`);
    }
    if (typeof value === "string" && SECRET_PATTERNS.some((p) => p.test(value))) {
      errors.push(`SECRET_VALUE:${path}`);
    }
    if (value && typeof value === "object" && !Array.isArray(value)) {
      errors.push(...scanForSecrets(value as Record<string, unknown>, path));
    }
  }
  return errors;
}

export function validateProductAiContext(context: WorkerContext): { ok: boolean; errors: string[] } {
  const errors = scanForSecrets(context as Record<string, unknown>);
  if ((context as Record<string, unknown>).paymentCredential) {
    errors.push("SECRET_FIELD:paymentCredential");
  }
  return { ok: errors.length === 0, errors };
}

export function stripFinancialFromInput(input: ProductAiInput): ProductAiInput {
  const { _internal, ...safe } = input;
  return safe;
}

export function toCustomerSafeProductAiResult(result: ProductAiResult): Partial<ProductAiResult> {
  const safe: Partial<ProductAiResult> = {
    productId: result.productId,
    analysisType: result.analysisType,
    contentRecommendations: result.contentRecommendations,
    translationRecommendations: result.translationRecommendations.map((t) => ({
      ...t,
      issues: t.issues.filter((i) => !i.startsWith("INTERNAL:")),
    })),
    reasoningSummary: result.reasoningSummary,
    overwriteCanonicalProduct: false,
  };
  return safe;
}

export function containsInternalFields(payload: Record<string, unknown>): boolean {
  for (const field of INTERNAL_OUTPUT_FIELDS) {
    if (field in payload) return true;
  }
  return false;
}

export function assertNoUnauthorizedProductAccess(
  requestedProductId: string,
  contextProductId?: string
): { ok: boolean; error?: string } {
  if (!contextProductId) return { ok: false, error: "UNAUTHORIZED_PRODUCT_ACCESS" };
  if (requestedProductId !== contextProductId) return { ok: false, error: "CROSS_PRODUCT_ACCESS" };
  return { ok: true };
}
