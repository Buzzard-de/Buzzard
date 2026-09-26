import { describe, it, expect } from "vitest";
import {
  MARKETS,
  validateMarkets,
  getMarket,
  formatMarketPrice,
  isRTL,
  normalizeLanguage,
  t,
  generateHreflang,
  getEnabledMarkets,
  toBuzzardLocale,
  getCountrySelectorData,
} from "@/lib/i18n/internationalCore";
import { getInternationalMarketCountries } from "@/lib/market/internationalBridge";

describe("international i18n core", () => {
  it("validates 35 markets", () => {
    const result = validateMarkets();
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
    expect(Object.keys(MARKETS).length).toBe(35);
  });

  it("loads Germany market config", () => {
    const de = getMarket("DE");
    expect(de.currency).toBe("EUR");
    expect(de.locale).toBe("de-DE");
    expect(de.vatRate).toBe(19);
  });

  it("formats market price per country", () => {
    expect(formatMarketPrice(199.99, "DE")).toMatch(/199/);
    expect(formatMarketPrice(199.99, "SA")).toMatch(/SAR|r\.s|ر\.س|١٩٩|199/);
  });

  it("detects RTL for Arabic markets", () => {
    expect(isRTL("ar-SA")).toBe(true);
    expect(isRTL("de-DE")).toBe(false);
  });

  it("translates with fallback", () => {
    expect(t("de-DE", "addToCart")).toBe("In den Warenkorb");
    expect(t("tr-TR", "addToCart")).toBe("Sepete Ekle");
    expect(t("ar-SA", "addToCart")).toBe("أضف إلى السلة");
  });

  it("normalizes unknown language to en", () => {
    expect(normalizeLanguage("xx-YY")).toBe("en");
    expect(normalizeLanguage("de-AT")).toBe("de");
  });

  it("generates hreflang for all enabled markets", () => {
    const entries = generateHreflang("https://www.buzzard.de", "/reifen");
    expect(entries.length).toBe(getEnabledMarkets().length + 1);
    expect(entries.some((e) => e.locale === "x-default")).toBe(true);
  });

  it("maps to existing Buzzard UI locale", () => {
    expect(toBuzzardLocale("de-DE")).toBe("de");
    expect(toBuzzardLocale("ar-SA")).toBe("ar");
    expect(toBuzzardLocale("fr-FR")).toBe("en");
  });

  it("bridges to market country selector data", () => {
    const countries = getInternationalMarketCountries();
    expect(countries.length).toBe(35);
    expect(countries[0].code).toBeTruthy();
    expect(getCountrySelectorData().length).toBe(35);
  });
});
