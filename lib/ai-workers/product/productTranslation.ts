import { getMarketLanguages } from "@/lib/market-engine/registry";
import type { ProductAiInput, TranslationRecommendation } from "./types";
import { IDENTIFIER_FIELDS, PRESERVE_IN_TRANSLATION } from "./constants";

const PLACEHOLDER_PATTERN = /\{\{|\[\[|<\w+>|TODO|TBD/i;

export function recommendTranslations(input: ProductAiInput): TranslationRecommendation[] {
  const market = input.market ?? "DE";
  const sourceLanguage = input.language ?? "de";
  const targetLanguages = getMarketLanguages(market).filter((l) => l !== sourceLanguage);

  const recommendations: TranslationRecommendation[] = [];

  for (const targetLanguage of targetLanguages) {
    const existing = input.existingTranslations.find((t) => t.locale.startsWith(targetLanguage));
    const issues: string[] = [];

    if (!existing?.title) issues.push("MISSING_TITLE_TRANSLATION");
    if (!existing?.description) issues.push("MISSING_DESCRIPTION_TRANSLATION");

    const suggestedTitle = existing?.title ?? `[${targetLanguage}] ${input.title ?? ""}`.trim();
    const identifierIssues = validateIdentifierPreservation(input, suggestedTitle);
    issues.push(...identifierIssues);

    const titleValid =
      Boolean(existing?.title) &&
      issues.length === 0 &&
      !PLACEHOLDER_PATTERN.test(suggestedTitle);

    recommendations.push({
      sourceLanguage,
      targetLanguage,
      field: "title",
      suggestedText: suggestedTitle,
      issues,
      valid: titleValid,
      classification: existing?.title ? "FACT" : "AI_RECOMMENDATION",
    });

    if (input.description) {
      const suggestedDesc = existing?.description ?? `[${targetLanguage}] ${input.description}`;
      const descIssues = validateIdentifierPreservation(input, suggestedDesc);
      descIssues.push(...validateUnsupportedClaims(suggestedDesc));
      const descValid =
        Boolean(existing?.description) &&
        descIssues.length === 0 &&
        !PLACEHOLDER_PATTERN.test(suggestedDesc);

      recommendations.push({
        sourceLanguage,
        targetLanguage,
        field: "description",
        suggestedText: suggestedDesc,
        issues: descIssues,
        valid: descValid,
        classification: existing?.description ? "FACT" : "AI_RECOMMENDATION",
      });
    }
  }

  return recommendations;
}

export function validateIdentifierPreservation(input: ProductAiInput, text: string): string[] {
  const issues: string[] = [];
  const identifiers = [
    input.ean,
    input.gtin,
    input.mpn,
    input.attributes.oem as string | undefined,
    input.attributes.partNumber as string | undefined,
  ].filter(Boolean) as string[];

  for (const id of identifiers) {
    if (input.title?.includes(id) && !text.includes(id)) {
      issues.push(`IDENTIFIER_NOT_PRESERVED:${id}`);
    }
  }

  for (const label of PRESERVE_IN_TRANSLATION) {
    if (text.toLowerCase().includes(`${label.toLowerCase()}:`)) {
      const original = input.attributes[label.toLowerCase()];
      if (original && !text.includes(String(original))) {
        issues.push(`IDENTIFIER_ALTERED:${label}`);
      }
    }
  }

  return issues;
}

export function validateUnsupportedClaims(text: string): string[] {
  const issues: string[] = [];
  if (/guaranteed\s+\d+\s*hp/i.test(text)) issues.push("UNSUPPORTED_CLAIM:HP");
  if (/universal fit for all vehicles/i.test(text)) issues.push("UNSUPPORTED_CLAIM:FITMENT");
  return issues;
}

export function validateTranslationLanguage(language: string, market: string): boolean {
  const supported = getMarketLanguages(market);
  return supported.includes(language);
}

export function detectPlaceholderCorruption(text: string): boolean {
  return PLACEHOLDER_PATTERN.test(text);
}
