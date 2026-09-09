import type { ProductTechnicalData } from "./types";
import { shouldPreserveAutomotiveValue } from "@/lib/i18n/international/productTranslation";

export function normalizeTechnicalData(raw: Record<string, unknown>): ProductTechnicalData {
  const result: ProductTechnicalData = {};
  for (const [key, value] of Object.entries(raw)) {
    if (value == null) continue;
    if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
      result[key] = value;
    }
  }
  return result;
}

export function mergeTechnicalData(
  base: ProductTechnicalData,
  patch: ProductTechnicalData
): ProductTechnicalData {
  return { ...base, ...patch };
}

/** Technical values must never be placed in translation payloads. */
export function extractTechnicalFromAttributes(
  attributes: Record<string, string>
): ProductTechnicalData {
  const technical: ProductTechnicalData = {};
  for (const [key, value] of Object.entries(attributes)) {
    if (shouldPreserveAutomotiveValue(value)) {
      technical[key] = value;
    } else if (/^(viscosity|api|acea|diameter|width|profile|rim|size|weight|mpn|oem|ean|gtin|sku)$/i.test(key)) {
      technical[key] = value;
    }
  }
  return technical;
}

export function validateTechnicalConsistency(data: ProductTechnicalData): string[] {
  const warnings: string[] = [];
  if (data.diameter != null && typeof data.diameter === "number" && data.diameter <= 0) {
    warnings.push("INVALID_DIAMETER");
  }
  if (data.viscosity && typeof data.viscosity === "string" && !/^\d+W-\d+/.test(data.viscosity)) {
    warnings.push("UNUSUAL_VISCOSITY_FORMAT");
  }
  return warnings;
}
