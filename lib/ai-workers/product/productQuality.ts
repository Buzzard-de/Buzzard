import type { ProductAiInput, ProductQualityScores, QualityIssue } from "./types";
import {
  CATEGORY_CRITICAL_ATTRIBUTES,
  DESCRIPTION_MIN_LENGTH,
  TITLE_MAX_LENGTH,
  TITLE_MIN_LENGTH,
} from "./constants";

function clampScore(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

export function analyzeQualityIssues(input: ProductAiInput): QualityIssue[] {
  const issues: QualityIssue[] = [];

  if (!input.title?.trim()) {
    issues.push({
      code: "MISSING_TITLE",
      field: "title",
      severity: "CRITICAL",
      message: "Product title is missing",
      classification: "FACT",
    });
  } else {
    if (input.title.length < TITLE_MIN_LENGTH) {
      issues.push({
        code: "TITLE_TOO_SHORT",
        field: "title",
        severity: "WARNING",
        message: `Title shorter than ${TITLE_MIN_LENGTH} characters`,
        classification: "FACT",
      });
    }
    if (input.title.length > TITLE_MAX_LENGTH) {
      issues.push({
        code: "TITLE_TOO_LONG",
        field: "title",
        severity: "WARNING",
        message: `Title exceeds ${TITLE_MAX_LENGTH} characters`,
        classification: "FACT",
      });
    }
    if (/(\b\w+\b)(?:.*\1){2,}/i.test(input.title)) {
      issues.push({
        code: "DUPLICATE_KEYWORDS",
        field: "title",
        severity: "INFO",
        message: "Title contains repeated keywords",
        classification: "AI_RECOMMENDATION",
      });
    }
  }

  if (!input.description?.trim()) {
    issues.push({
      code: "MISSING_DESCRIPTION",
      field: "description",
      severity: "CRITICAL",
      message: "Product description is missing",
      classification: "FACT",
    });
  } else if (input.description.length < DESCRIPTION_MIN_LENGTH) {
    issues.push({
      code: "INSUFFICIENT_DESCRIPTION",
      field: "description",
      severity: "WARNING",
      message: `Description shorter than ${DESCRIPTION_MIN_LENGTH} characters`,
      classification: "FACT",
    });
  }

  if (!input.brand?.trim()) {
    issues.push({
      code: "MISSING_BRAND",
      field: "brand",
      severity: "CRITICAL",
      message: "Brand is missing",
      classification: "FACT",
    });
  }

  if (!input.manufacturer?.trim()) {
    issues.push({
      code: "MISSING_MANUFACTURER",
      field: "manufacturer",
      severity: "WARNING",
      message: "Manufacturer is missing",
      classification: "FACT",
    });
  }

  if (!input.mpn?.trim()) {
    issues.push({
      code: "MISSING_MPN",
      field: "mpn",
      severity: "WARNING",
      message: "MPN is missing",
      classification: "FACT",
    });
  }

  if (!input.ean?.trim() && !input.gtin?.trim()) {
    issues.push({
      code: "MISSING_EAN_GTIN",
      field: "ean",
      severity: "WARNING",
      message: "EAN/GTIN not provided",
      classification: "FACT",
    });
  }

  if (!input.category?.trim()) {
    issues.push({
      code: "MISSING_CATEGORY",
      field: "category",
      severity: "CRITICAL",
      message: "Category is missing",
      classification: "FACT",
    });
  }

  if (!input.imagesMetadata.length) {
    issues.push({
      code: "MISSING_IMAGES",
      field: "imagesMetadata",
      severity: "WARNING",
      message: "No product images metadata",
      classification: "FACT",
    });
  }

  if (!input.dimensions?.length && !input.dimensions?.width && !input.dimensions?.height) {
    issues.push({
      code: "INCOMPLETE_DIMENSIONS",
      field: "dimensions",
      severity: "INFO",
      message: "Product dimensions incomplete",
      classification: "FACT",
    });
  }

  if (input.weight === undefined || input.weight === null) {
    issues.push({
      code: "MISSING_WEIGHT",
      field: "weight",
      severity: "INFO",
      message: "Product weight not provided",
      classification: "UNKNOWN",
    });
  }

  if (!input.countryOfOrigin?.trim()) {
    issues.push({
      code: "MISSING_COUNTRY_OF_ORIGIN",
      field: "countryOfOrigin",
      severity: "INFO",
      message: "Country of origin not provided",
      classification: "FACT",
    });
  }

  if (input.productType === "automotive" && input.compatibility.length === 0) {
    issues.push({
      code: "MISSING_COMPATIBILITY",
      field: "compatibility",
      severity: "WARNING",
      message: "Automotive compatibility data missing — NEEDS_DATA",
      classification: "UNKNOWN",
    });
  }

  const criticalAttrs = input.category ? CATEGORY_CRITICAL_ATTRIBUTES[input.category] ?? [] : [];
  for (const attr of criticalAttrs) {
    const val = input.attributes[attr];
    if (val === undefined || val === null || val === "") {
      issues.push({
        code: "MISSING_CRITICAL_ATTRIBUTE",
        field: attr,
        severity: "WARNING",
        message: `Missing critical attribute: ${attr}`,
        classification: "UNKNOWN",
      });
    }
  }

  for (const [key, val] of Object.entries(input.attributes)) {
    if (typeof val === "string" && val.trim() === "") {
      issues.push({
        code: "WEAK_ATTRIBUTE_VALUE",
        field: key,
        severity: "INFO",
        message: `Empty attribute value for ${key}`,
        classification: "FACT",
      });
    }
  }

  return issues;
}

export function computeQualityScores(input: ProductAiInput, issues: QualityIssue[]): ProductQualityScores {
  const criticalCount = issues.filter((i) => i.severity === "CRITICAL").length;
  const warningCount = issues.filter((i) => i.severity === "WARNING").length;

  const completenessFields = [
    input.title,
    input.description,
    input.brand,
    input.category,
    input.ean || input.gtin,
    input.imagesMetadata.length > 0 ? "yes" : "",
    input.manufacturer,
    input.mpn,
  ];
  const filled = completenessFields.filter((f) => Boolean(f && String(f).trim())).length;
  const completenessScore = clampScore((filled / completenessFields.length) * 100);

  const contentScore = clampScore(
    100 -
      (input.title ? 0 : 30) -
      (input.description && input.description.length >= DESCRIPTION_MIN_LENGTH ? 0 : 25) -
      warningCount * 5
  );

  const criticalAttrs = input.category ? CATEGORY_CRITICAL_ATTRIBUTES[input.category] ?? [] : [];
  const attrFilled = criticalAttrs.filter((a) => {
    const v = input.attributes[a];
    return v !== undefined && v !== null && v !== "";
  }).length;
  const attributeScore =
    criticalAttrs.length === 0
      ? clampScore(100 - warningCount * 10)
      : clampScore((attrFilled / criticalAttrs.length) * 100);

  const targetLangs = input.market ? 2 : 1;
  const translationScore = clampScore(
    (input.existingTranslations.length / targetLangs) * 100
  );

  const marketReadinessScore = clampScore(completenessScore - criticalCount * 15);

  const complianceFields = [input.countryOfOrigin, input.manufacturer];
  const complianceFilled = complianceFields.filter(Boolean).length;
  const complianceDataScore = clampScore((complianceFilled / complianceFields.length) * 100);

  const qualityScore = clampScore(
    completenessScore * 0.3 +
      contentScore * 0.25 +
      attributeScore * 0.2 +
      translationScore * 0.1 +
      marketReadinessScore * 0.1 +
      complianceDataScore * 0.05 -
      criticalCount * 10
  );

  return {
    qualityScore,
    completenessScore,
    contentScore,
    attributeScore,
    translationScore,
    marketReadinessScore,
    complianceDataScore,
  };
}

export function analyzeTitleContent(input: ProductAiInput): Array<{ field: "title"; issue: string; recommendation: string }> {
  const recs: Array<{ field: "title"; issue: string; recommendation: string }> = [];
  if (!input.title) return recs;

  if (!input.brand && !input.mpn && !input.ean) {
    recs.push({
      field: "title",
      issue: "MISSING_IDENTIFIERS",
      recommendation: "Include brand or part identifier in title for marketplace readability",
    });
  }

  if (input.language === "de" && /[а-яА-Я]/.test(input.title)) {
    recs.push({
      field: "title",
      issue: "LANGUAGE_MISMATCH",
      recommendation: "Title language does not match target locale de",
    });
  }

  if (/[A-Z]{5,}/.test(input.title)) {
    recs.push({
      field: "title",
      issue: "SUSPICIOUS_FORMATTING",
      recommendation: "Reduce excessive uppercase formatting",
    });
  }

  return recs;
}

export function analyzeDescriptionContent(input: ProductAiInput): Array<{ field: "description"; issue: string; recommendation: string }> {
  const recs: Array<{ field: "description"; issue: string; recommendation: string }> = [];
  if (!input.description) return recs;

  const unsupportedPatterns = [
    /guaranteed\s+\d+\s*hp/i,
    /universal fit for all vehicles/i,
    /100%\s compatible with every/i,
  ];
  for (const pattern of unsupportedPatterns) {
    if (pattern.test(input.description)) {
      recs.push({
        field: "description",
        issue: "UNSUPPORTED_CLAIM",
        recommendation: "Remove unsupported technical or compatibility claims",
      });
    }
  }

  if (input.description === input.title) {
    recs.push({
      field: "description",
      issue: "DUPLICATE_TEXT",
      recommendation: "Description duplicates title — expand with product details",
    });
  }

  return recs;
}
