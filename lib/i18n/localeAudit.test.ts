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
    expect(audit.rows.every((r) => Array.isArray(r.mixedLanguageKeys))).toBe(true);
  });

  it("formats EUR and dates per locale without claiming catalog completeness", () => {
    expect(formatPrice(10, "de", "EUR")).toMatch(/10/);
    expect(formatPrice(10, "ar", "EUR")).toBeTruthy();
    expect(formatDate(new Date("2026-11-09T00:00:00Z"), "de")).toBeTruthy();
  });
});
