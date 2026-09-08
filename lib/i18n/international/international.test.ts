import { describe, it, expect } from "vitest";
import {
  validateBuzzardI18n,
  detectCountry,
  resolveLanguage,
  getLanguageOptionsForCountry,
  buildBuzzardHreflangAlternates,
  formatCurrencyIntl,
  toBuzzardUiLocale,
} from "@/lib/i18n/international";
import { getCountryConfig } from "@/lib/i18n/international/config";

describe("Buzzard international i18n — 35 markets", () => {
  it("validates all 35 markets", () => {
    const result = validateBuzzardI18n();
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
    expect(result.stats.countries).toBe(35);
  });

  it("Germany resolves to Deutsch", () => {
    const resolved = resolveLanguage({
      explicitCountryCode: "DE",
      explicitLanguage: "de",
      manualOverride: true,
      browserLanguages: ["en-US"],
    });
    expect(resolved.countryCode).toBe("DE");
    expect(resolved.languageCode).toBe("de");
    expect(resolved.locale).toBe("de-DE");
  });

  it("France resolves to Français", () => {
    const resolved = resolveLanguage({
      explicitCountryCode: "FR",
      explicitLanguage: "fr",
      manualOverride: true,
    });
    expect(resolved.languageCode).toBe("fr");
    expect(resolved.locale).toBe("fr-FR");
  });

  it("Italy resolves to Italiano", () => {
    const country = getCountryConfig("IT");
    expect(country?.defaultLanguage).toBe("it");
    expect(country?.locale).toBe("it-IT");
  });

  it("Spain supports regional languages", () => {
    const options = getLanguageOptionsForCountry("ES");
    const codes = options.map((o) => o.languageCode);
    expect(codes).toContain("es");
    expect(codes).toContain("ca");
    expect(codes).toContain("eu");
    expect(codes).toContain("gl");
  });

  it("Poland resolves to Polski", () => {
    const resolved = resolveLanguage({
      explicitCountryCode: "PL",
      explicitLanguage: "pl",
      manualOverride: true,
    });
    expect(resolved.languageCode).toBe("pl");
  });

  it("Turkey resolves to Türkçe", () => {
    const resolved = resolveLanguage({
      explicitCountryCode: "TR",
      explicitLanguage: "tr",
      manualOverride: true,
    });
    expect(resolved.languageCode).toBe("tr");
    expect(resolved.locale).toBe("tr-TR");
  });

  it("Saudi Arabia uses Arabic + RTL", () => {
    const resolved = resolveLanguage({
      explicitCountryCode: "SA",
      explicitLanguage: "ar",
      manualOverride: true,
    });
    expect(resolved.languageCode).toBe("ar");
    expect(resolved.direction).toBe("rtl");
  });

  it("UAE uses Arabic + RTL", () => {
    const resolved = resolveLanguage({
      explicitCountryCode: "AE",
      explicitLanguage: "ar",
      manualOverride: true,
    });
    expect(resolved.direction).toBe("rtl");
    expect(resolved.currency).toBe("AED");
  });

  it("Egypt uses Arabic + RTL", () => {
    const resolved = resolveLanguage({
      explicitCountryCode: "EG",
      explicitLanguage: "ar",
      manualOverride: true,
    });
    expect(resolved.direction).toBe("rtl");
    expect(resolved.currency).toBe("EGP");
  });

  it("Belgium supports nl/fr/de", () => {
    const options = getLanguageOptionsForCountry("BE");
    expect(options.map((o) => o.languageCode).sort()).toEqual(["de", "fr", "nl"]);
  });

  it("Luxembourg supports lb/fr/de", () => {
    const options = getLanguageOptionsForCountry("LU");
    expect(options.map((o) => o.languageCode).sort()).toEqual(["de", "fr", "lb"]);
  });

  it("manual override wins over browser language", () => {
    const resolved = resolveLanguage({
      explicitCountryCode: "DE",
      explicitLanguage: "tr",
      manualOverride: true,
      browserLanguages: ["de-DE"],
    });
    expect(resolved.languageCode).toBe("tr");
    expect(resolved.source).toBe("manual_override");
  });

  it("detectCountry uses saved preference", () => {
    const result = detectCountry({ savedCountryCode: "FR" });
    expect(result.countryCode).toBe("FR");
    expect(result.source).toBe("saved_preference");
  });

  it("detectCountry is GeoIP-ready via headers", () => {
    const result = detectCountry({
      requestHeaders: { "cf-ipcountry": "IT" },
    });
    expect(result.countryCode).toBe("IT");
    expect(result.source).toBe("request_header");
  });

  it("formats currency with Intl", () => {
    const formatted = formatCurrencyIntl(199.99, "EUR", "de-DE");
    expect(formatted).toMatch(/199/);
    const pln = formatCurrencyIntl(100, "PLN", "pl-PL");
    expect(pln).toMatch(/100/);
  });

  it("generates hreflang from routing", () => {
    const entries = buildBuzzardHreflangAlternates("/");
    expect(entries.length).toBeGreaterThan(35);
    expect(entries.some((e) => e.hreflang === "de-DE")).toBe(true);
    expect(entries.some((e) => e.hreflang === "x-default")).toBe(true);
    expect(entries.every((e) => e.href.startsWith("https://"))).toBe(true);
  });

  it("maps prepared languages to English UI catalog", () => {
    expect(toBuzzardUiLocale("fr")).toBe("en");
    expect(toBuzzardUiLocale("de")).toBe("de");
    expect(toBuzzardUiLocale("ar")).toBe("ar");
  });

  it("Arabic resolved locale has RTL direction", () => {
    const resolved = resolveLanguage({
      explicitCountryCode: "SA",
      explicitLanguage: "ar",
      manualOverride: true,
    });
    expect(resolved.direction).toBe("rtl");
  });
});
