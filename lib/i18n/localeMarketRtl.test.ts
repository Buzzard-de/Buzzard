import { describe, expect, it } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";
import { SUPPORTED_LOCALES, isRtlLocale, localeDirection } from "@/lib/i18n/types";
import { applyDocumentDirection } from "@/lib/i18n/international/resolveLanguage";
import { validateBuzzardI18n } from "@/lib/i18n/international/validate";
import { translate } from "@/lib/i18n/translations";
import { getCatalog } from "@/lib/i18n/translations";
import { getDeliverableMarketCountries } from "@/lib/market/countries";
import {
  getMarket,
  getMarketLanguages,
  listMarkets,
  validateMarketRegistry,
} from "@/lib/market-engine";
import { resolveLocaleAfterMarketChange } from "@/lib/i18n/marketCompatibility";

const REQUIRED_MARKETS = [
  "AT", "BE", "BG", "HR", "CY", "CZ", "DK", "EE", "FI", "FR", "DE", "GR", "HU", "IE", "IT",
  "LV", "LT", "LU", "MT", "NL", "PL", "PT", "RO", "SK", "SI", "ES", "SE",
  "TR", "SA", "AE", "QA", "KW", "BH", "OM", "EG",
];

describe("canonical locale registry", () => {
  it("exposes 30 enabled UI locales", () => {
    expect(SUPPORTED_LOCALES).toHaveLength(30);
    expect(new Set(SUPPORTED_LOCALES).size).toBe(30);
  });

  it("every enabled locale has a translation catalog", () => {
    for (const locale of SUPPORTED_LOCALES) {
      expect(getCatalog(locale)).toBeTruthy();
      expect(translate(locale, "header.search")).not.toBe("header.search");
      expect(translate(locale, "mobile.productCount")).not.toBe("mobile.productCount");
    }
  });
});

describe("canonical market registry", () => {
  it("loads 35 active Buzzard markets", () => {
    const result = validateMarketRegistry();
    expect(result.valid).toBe(true);
    expect(result.count).toBe(35);
    expect(listMarkets()).toHaveLength(35);
    expect(validateBuzzardI18n().valid).toBe(true);
  });

  it("selector lists every registry market and no extras", () => {
    const selector = getDeliverableMarketCountries().map((c) => c.code).sort();
    expect(selector).toEqual([...REQUIRED_MARKETS].sort());
    expect(selector).not.toContain("GB");
    expect(selector).not.toContain("CH");
    expect(selector).not.toContain("AR");
    expect(selector).toContain("SA");
    expect(selector).toContain("EG");
  });

  it("every active market has at least one supported locale", () => {
    for (const code of REQUIRED_MARKETS) {
      const market = getMarket(code);
      expect(market).toBeDefined();
      expect(market!.supportedLanguages.length).toBeGreaterThan(0);
    }
  });
});

describe("language and market independence", () => {
  it("keeps Turkish when the market is Germany", () => {
    expect(resolveLocaleAfterMarketChange("tr", "DE")).toBe("tr");
    expect(resolveLocaleAfterMarketChange("de", "DE")).toBe("de");
    expect(resolveLocaleAfterMarketChange("en", "DE")).toBe("en");
  });

  it("falls back only when the market does not support the locale", () => {
    expect(resolveLocaleAfterMarketChange("tr", "FR")).toBe("fr");
    expect(getMarketLanguages("FR")).toEqual(["fr"]);
  });

  it("does not change market when language would stay valid", () => {
    expect(resolveLocaleAfterMarketChange("ar", "SA")).toBe("ar");
    expect(resolveLocaleAfterMarketChange("en", "AE")).toBe("en");
  });
});

describe("document direction", () => {
  it("marks Arabic as RTL and European locales as LTR", () => {
    expect(isRtlLocale("ar")).toBe(true);
    expect(localeDirection("ar")).toBe("rtl");
    expect(localeDirection("de")).toBe("ltr");
    expect(localeDirection("fr")).toBe("ltr");
    expect(localeDirection("tr")).toBe("ltr");
  });

  it("applyDocumentDirection writes html dir", () => {
    const attrs: Record<string, string> = {};
    const html = {
      lang: "de",
      dir: "ltr",
      classList: { toggle() {} },
      setAttribute(name: string, value: string) {
        attrs[name] = value;
        if (name === "lang") this.lang = value;
        if (name === "dir") this.dir = value;
      },
      getAttribute(name: string) {
        return attrs[name] ?? null;
      },
    } as unknown as HTMLElement;
    const original = globalThis.document;
    (globalThis as { document?: { documentElement: HTMLElement } }).document = { documentElement: html };
    applyDocumentDirection("ar");
    expect(html.dir).toBe("rtl");
    expect(html.lang).toBe("ar");
    expect(html.getAttribute("data-buzzard-locale")).toBe("ar");
    applyDocumentDirection("de");
    expect(html.dir).toBe("ltr");
    (globalThis as { document?: typeof original }).document = original;
  });
});

describe("selector architecture", () => {
  it("language selector is generated from SUPPORTED_LOCALES", () => {
    const source = readFileSync(resolve("components/LanguageSelector.tsx"), "utf8");
    expect(source).toContain("SUPPORTED_LOCALES.map");
    expect(source).not.toContain('value="de"');
    expect(source).not.toContain("Deutsch");
  });

  it("country selector consumes deliverable Market Engine countries", () => {
    const source = readFileSync(resolve("components/CountrySelector.tsx"), "utf8");
    expect(source).toContain("getDeliverableMarketCountries");
    expect(source).not.toContain("setLocale");
  });

  it("RTL CSS uses logical properties instead of text-align:right hacks", () => {
    const rtl = readFileSync(resolve("styles/rtl.css"), "utf8");
    expect(rtl).toContain("text-align: start");
    expect(rtl).not.toContain("text-align: right");
    const shop = readFileSync(resolve("styles/shop.css"), "utf8");
    expect(shop).toContain("inset-inline-end");
  });
});
