import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync } from "fs";
import { resolve } from "path";
import {
  SUPPORTED_LOCALES,
  ROUTING_LOCALE_PREFIXES,
  isRtlLocale,
  localeDirection,
  isSupportedLocale,
  resolveSupportedLocale,
} from "@/lib/i18n/types";
import { fallbackChain, listMissingKeys, translate } from "@/lib/i18n/translations";
import { getEmailTemplate, EMAIL_TEMPLATE_KEYS } from "@/lib/email/templates";
import { resolveLocaleAfterMarketChange } from "@/lib/i18n/marketCompatibility";

const LIVE_SOURCE_ROOTS = ["server/lib", "lib", "components", "app"];

function collectJsFiles(dir: string, acc: string[] = []): string[] {
  const abs = resolve(dir);
  for (const entry of readdirSync(abs, { withFileTypes: true })) {
    const next = `${dir}/${entry.name}`;
    if (entry.isDirectory()) collectJsFiles(next, acc);
    else if (/\.(js|ts|tsx|mjs)$/.test(entry.name) && !/\.test\.(ts|tsx|js|mjs)$/.test(entry.name)) acc.push(next);
  }
  return acc;
}

describe("30-locale completeness", () => {
  it("keeps the canonical 30-locale registry", () => {
    expect(SUPPORTED_LOCALES).toEqual([
      "de", "en", "tr", "ar", "fr", "nl", "bg", "hr", "el", "cs", "da", "et", "fi",
      "hu", "it", "lv", "lt", "lb", "mt", "pl", "pt", "ro", "sk", "sl", "es", "ca",
      "eu", "gl", "sv", "ga",
    ]);
  });

  it("routing prefixes stay URL-only and are not the UI whitelist", () => {
    expect(ROUTING_LOCALE_PREFIXES).toEqual(["de", "en", "tr", "ar"]);
    expect(SUPPORTED_LOCALES.length).toBeGreaterThan(ROUTING_LOCALE_PREFIXES.length);
  });

  it("exposes storefront keys for every enabled locale", () => {
    const keys = [
      "header.search",
      "header.cart",
      "nav.home",
      "mobile.productCount",
      "mobile.home",
      "cart.checkout",
      "account.dashboardTitle",
      "category.notFound",
    ];
    for (const locale of SUPPORTED_LOCALES) {
      for (const key of keys) {
        const value = translate(locale, key);
        expect(value, `${locale} ${key}`).not.toBe(key);
        expect(value.length).toBeGreaterThan(0);
      }
    }
  });
});

describe("fallback hierarchy", () => {
  it("falls back selected locale → English, never German or Turkish by default", () => {
    expect(fallbackChain("fr")).toEqual(["fr", "en"]);
    expect(fallbackChain("pl")).toEqual(["pl", "en"]);
    expect(fallbackChain("en")).toEqual(["en"]);
    expect(fallbackChain("ar")).not.toContain("de");
    expect(fallbackChain("nl")).not.toContain("tr");
  });

  it("reports missing keys against the German baseline without inventing them", () => {
    const missingFr = listMissingKeys("fr");
    expect(Array.isArray(missingFr)).toBe(true);
    expect(translate("en", "header.search")).toBe("Search");
  });
});

describe("backend locale acceptance", () => {
  it("accepts every enabled locale in email templates via English fallback", () => {
    for (const locale of SUPPORTED_LOCALES) {
      const tpl = getEmailTemplate("order_confirmation", locale);
      expect(tpl.subject.length).toBeGreaterThan(0);
      expect(tpl.body.length).toBeGreaterThan(0);
    }
    for (const key of EMAIL_TEMPLATE_KEYS) {
      expect(getEmailTemplate(key, "fr").subject).toBe(getEmailTemplate(key, "en").subject);
    }
    expect(getEmailTemplate("order_confirmation", "de").subject).toMatch(/Bestell/);
  });

  it("resolveSupportedLocale accepts all 30 codes and unknown codes fall back to English", () => {
    for (const locale of SUPPORTED_LOCALES) {
      expect(isSupportedLocale(locale)).toBe(true);
      expect(resolveSupportedLocale(locale)).toBe(locale);
    }
    expect(resolveSupportedLocale("xx")).toBe("en");
    expect(resolveSupportedLocale("de-DE")).toBe("de");
  });

  it("does not keep a 4-locale backend whitelist in live source", () => {
    const files = LIVE_SOURCE_ROOTS.flatMap((root) => collectJsFiles(root));
    const banned = [
      'VALID_LOCALES = new Set(["de", "en", "tr", "ar"])',
      'new Set(["de", "en", "tr", "ar"])',
      '["de", "en", "tr", "ar"].includes(locale) ? locale : "de"',
    ];
    for (const file of files) {
      if (file.endsWith("lib/i18n/types.ts")) continue;
      const source = readFileSync(resolve(file), "utf8");
      for (const needle of banned) {
        expect(source.includes(needle), `${file} still clamps to 4 locales`).toBe(false);
      }
    }
    const validator = readFileSync(resolve("server/lib/productValidator.js"), "utf8");
    expect(validator).toContain("canonicalLocales");
    const chat = readFileSync(resolve("server/lib/aiChatService.js"), "utf8");
    expect(chat).toContain("resolveSupportedLocale");
    expect(chat).not.toContain('? locale : "de"');
  });
});

describe("language and market combinations", () => {
  it("keeps independent language on Germany when the market supports it", () => {
    expect(resolveLocaleAfterMarketChange("tr", "DE")).toBe("tr");
    expect(resolveLocaleAfterMarketChange("de", "DE")).toBe("de");
    expect(resolveLocaleAfterMarketChange("en", "DE")).toBe("en");
    expect(resolveLocaleAfterMarketChange("ar", "DE")).toBe("ar");
  });

  it("language selector does not write market state", () => {
    const source = readFileSync(resolve("components/LanguageSelector.tsx"), "utf8");
    expect(source).not.toContain("setCountryCode");
    expect(source).not.toContain("useMarket");
  });

  it("country selector does not write locale state", () => {
    const source = readFileSync(resolve("components/CountrySelector.tsx"), "utf8");
    expect(source).not.toContain("setLocale");
  });

  it("market change uses resolveLanguage only when the locale is unsupported", () => {
    expect(resolveLocaleAfterMarketChange("tr", "FR")).toBe("fr");
    expect(resolveLocaleAfterMarketChange("en", "FR")).toBe("fr");
  });
});

describe("RTL and LTR architecture", () => {
  it("marks Arabic RTL and other enabled locales LTR", () => {
    expect(isRtlLocale("ar")).toBe(true);
    expect(localeDirection("ar")).toBe("rtl");
    for (const locale of SUPPORTED_LOCALES.filter((code) => code !== "ar")) {
      expect(localeDirection(locale)).toBe("ltr");
    }
  });

  it("keeps Arabic storefront strings in Arabic script", () => {
    expect(translate("ar", "nav.home")).toMatch(/[\u0600-\u06FF]/);
    expect(translate("ar", "header.search")).toMatch(/[\u0600-\u06FF]/);
    expect(translate("ar", "mobile.home")).toMatch(/[\u0600-\u06FF]/);
  });

  it("uses logical CSS for storefront direction", () => {
    const shop = readFileSync(resolve("styles/shop.css"), "utf8");
    expect(shop).toContain("inset-inline-end");
    expect(shop).toContain("inset-inline");
    expect(shop).not.toMatch(/\.ai-chat-panel[\s\S]{0,120}right:\s*12px/);
    const rtl = readFileSync(resolve("styles/rtl.css"), "utf8");
    expect(rtl).toContain('html[dir="rtl"]');
    expect(rtl).toContain("text-align: start");
    const mobile = readFileSync(resolve("styles/buzzard-mobile.css"), "utf8");
    expect(mobile).toContain("inset-inline-end: 12px");
    expect(mobile).toContain("safe-area-inset-bottom");
  });
});
