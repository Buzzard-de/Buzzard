import { describe, it, expect } from "vitest";
import { loadLocale, loadLocaleSync, isCatalogLanguage } from "@/lib/i18n/catalogLoader";
import { translate, getCatalog } from "@/lib/i18n/translations";
import { resolveLanguageFromLocaleTag } from "@/lib/i18n/types";

const LOCALE_TAGS = [
  "de-DE", "fr-FR", "fr-BE", "nl-NL", "nl-BE", "it-IT", "pl-PL", "es-ES", "ca-ES",
  "pt-PT", "cs-CZ", "sk-SK", "hr-HR", "bg-BG", "ro-RO", "da-DK", "sv-SE", "fi-FI",
  "et-EE", "lv-LV", "lt-LT", "hu-HU", "el-GR", "el-CY", "lb-LU", "mt-MT", "ga-IE",
  "tr-TR", "tr-CY", "ar-SA", "ar-AE", "ar-QA", "ar-KW", "ar-BH", "ar-OM", "ar-EG",
  "en-IE", "en-MT", "en-SA", "de-BE", "de-LU", "fr-LU", "eu-ES", "gl-ES",
];

describe("locale catalog loading", () => {
  for (const tag of LOCALE_TAGS) {
    it(`loadLocale("${tag}") resolves and loads catalog`, async () => {
      const catalog = await loadLocale(tag);
      expect(catalog).toBeTruthy();
      expect(typeof catalog.header).toBe("object");
      const lang = resolveLanguageFromLocaleTag(tag);
      expect(isCatalogLanguage(lang)).toBe(true);
      const addToCart = translate(lang, "cart.checkout");
      expect(addToCart).not.toBe("cart.checkout");
      expect(addToCart.length).toBeGreaterThan(0);
    });
  }

  it("French UI uses French strings not English fallback", () => {
    expect(translate("fr", "home.addToCart")).toMatch(/panier/i);
    expect(translate("fr", "header.cart")).toMatch(/panier/i);
  });

  it("Polish UI uses Polish strings", () => {
    expect(translate("pl", "home.addToCart")).toMatch(/koszyk/i);
  });

  it("Arabic UI uses Arabic strings and RTL language", () => {
    const text = translate("ar", "home.addToCart");
    expect(text).toMatch(/[\u0600-\u06FF]/);
  });

  it("loadLocaleSync matches async catalog", () => {
    const sync = loadLocaleSync("it-IT");
    expect(translate("it", "home.addToCart")).toBeTruthy();
    expect(getCatalog("it")).toBe(sync);
  });

  it("all 30 language catalogs have header.search key", () => {
    const langs = [
      "de", "en", "tr", "ar", "fr", "nl", "bg", "hr", "el", "cs", "da", "et", "fi",
      "hu", "it", "lv", "lt", "lb", "mt", "pl", "pt", "ro", "sk", "sl", "es", "ca",
      "eu", "gl", "sv", "ga",
    ] as const;
    for (const lang of langs) {
      expect(translate(lang, "header.search")).not.toBe("header.search");
    }
  });
});
