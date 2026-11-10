import { describe, expect, it } from "vitest";
import { auditLocales } from "./localeAudit";
import { LANGUAGE_CODES } from "./languages";
import { formatPrice, formatDate } from "./format";

describe("locale audit", () => {
  it("covers 30 locales and never marks translations complete", () => {
    const audit = auditLocales();
    expect(LANGUAGE_CODES).toHaveLength(30);
    expect(audit.listed).toBe(30);
    expect(audit.complete).toBe(false);
    expect(audit.machineTranslationAccepted).toBe(false);
    expect(audit.fallback).toBe("de");
    const ar = audit.rows.find((r) => r.locale === "ar");
    expect(ar?.rtl).toBe(true);
    expect(audit.rows.every((r) => r.verified === false)).toBe(true);
    expect(audit.rows.every((r) => r.complete === false)).toBe(true);
    expect(audit.rows.every((r) => Array.isArray(r.mixedLanguageKeys))).toBe(true);
    expect(audit.rows.every((r) => r.missingKeys.length === 0)).toBe(true);
    expect(audit.rows.every((r) => r.fallbackKeys.length === 0)).toBe(true);
    expect(audit.rows.every((r) => r.humanReviewed === false)).toBe(true);
    expect(audit.humanReviewedStrings).toBe(0);
    expect(audit.fallbackStrings).toBe(0);
    expect(audit.missingStrings).toBe(0);
    expect(audit.keyCompleteAll).toBe(true);
    const ga = audit.rows.find((r) => r.locale === "ga");
    expect(ga?.machineGeneratedKeys).toContain("header.tagline");
    expect(ga?.nativeKeys).not.toContain("header.tagline");
    expect(audit.machineGeneratedStrings).toBeGreaterThan(0);
    const machineLocales = audit.rows.filter((r) => !["de", "en", "tr", "ar"].includes(r.locale));
    expect(machineLocales.every((r) => r.machineGeneratedKeys.length > 0)).toBe(true);
  });

  it("formats EUR and dates per locale without claiming catalog completeness", () => {
    expect(formatPrice(10, "de", "EUR")).toMatch(/10/);
    expect(formatPrice(10, "ar", "EUR")).toBeTruthy();
    expect(formatDate(new Date("2026-11-09T00:00:00Z"), "de")).toBeTruthy();
  });
});
