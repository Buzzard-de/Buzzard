import { describe, expect, it } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";

describe("language and country independence", () => {
  it("MarketProvider does not call setLocale", () => {
    const source = readFileSync(resolve("lib/market/context.tsx"), "utf8");
    expect(source).not.toContain("setLocale");
    expect(source).not.toContain("resolveUiLocaleForCountry");
    expect(source).not.toContain("useLocale");
  });

  it("CountrySelector does not change language", () => {
    const source = readFileSync(resolve("components/CountrySelector.tsx"), "utf8");
    expect(source).not.toContain("setLocale");
    expect(source).toContain("setCountryCode");
  });

  it("LanguageSelector does not change country", () => {
    const source = readFileSync(resolve("components/LanguageSelector.tsx"), "utf8");
    expect(source).toContain("setLocale");
    expect(source).not.toContain("setCountryCode");
  });

  it("Germany background is language-only", () => {
    const source = readFileSync(resolve("components/storefront/LanguageBackground.tsx"), "utf8");
    expect(source).toContain("useLocale");
    expect(source).not.toContain("useMarket");
    expect(source).not.toContain("country");
  });

  it("LocaleMarketBridge does not treat market boot hydration as a user country change", () => {
    const source = readFileSync(resolve("components/LocaleMarketBridge.tsx"), "utf8");
    expect(source).toContain("if (!ready) return");
    expect(source).toContain("previousCountry.current === null");
    expect(source).toContain("resolveLocaleAfterMarketChange");
  });

  it("language and country use separate storage keys", () => {
    const localeDetect = readFileSync(resolve("lib/i18n/detect.ts"), "utf8");
    const countryStorage = readFileSync(resolve("lib/market/storage.ts"), "utf8");
    expect(localeDetect).toContain("buzzard_locale");
    expect(countryStorage).toContain("buzzard_market_country");
    expect(countryStorage).not.toContain("buzzard_locale");
  });
});
