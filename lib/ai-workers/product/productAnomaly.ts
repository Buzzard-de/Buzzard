import type { AnomalySignal, ProductAiInput } from "./types";

export function detectAnomalies(input: ProductAiInput): AnomalySignal[] {
  const anomalies: AnomalySignal[] = [];

  if (input.weight !== undefined && input.weight < 0) {
    anomalies.push({
      code: "IMPOSSIBLE_NEGATIVE_VALUE",
      field: "weight",
      message: "Weight cannot be negative",
      severity: "HIGH",
      classification: "FACT",
    });
  }

  if (input.dimensions) {
    const { length, width, height } = input.dimensions;
    if (length && width && height && length < width && height < width) {
      anomalies.push({
        code: "CONFLICTING_DIMENSIONS",
        field: "dimensions",
        message: "Dimension values appear inconsistent",
        severity: "MEDIUM",
        classification: "AI_RECOMMENDATION",
      });
    }
  }

  if (input.ean && input.gtin && input.ean !== input.gtin) {
    anomalies.push({
      code: "DUPLICATE_IDENTIFIERS",
      field: "ean",
      message: "EAN and GTIN values conflict",
      severity: "HIGH",
      classification: "FACT",
    });
  }

  if (input.category === "cat-05-02" && input.title && !/reifen|tire|tyre|r\d+/i.test(input.title)) {
    anomalies.push({
      code: "INCONSISTENT_CATEGORY",
      field: "category",
      message: "Category suggests tires but title does not match",
      severity: "MEDIUM",
      classification: "AI_RECOMMENDATION",
    });
  }

  if (input.language === "de" && input.title && /[а-яА-Я]/.test(input.title)) {
    anomalies.push({
      code: "LANGUAGE_MISMATCH",
      field: "title",
      message: "Title language does not match declared locale",
      severity: "LOW",
      classification: "FACT",
    });
  }

  const width = input.attributes.width;
  const conflictingWidth = input.attributes.conflictingWidth;
  if (width !== undefined && conflictingWidth !== undefined && width !== conflictingWidth) {
    anomalies.push({
      code: "CONFLICTING_SUPPLIER_DATA",
      field: "width",
      message: "Conflicting width values from supplier data",
      severity: "HIGH",
      classification: "FACT",
    });
  }

  return anomalies;
}
