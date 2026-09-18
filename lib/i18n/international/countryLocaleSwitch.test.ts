import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  buildCountryLocaleSelection,
  buildLocalizedUrlForSelection,
  bootstrapCountryLocale,
  countryCodeToFlag,
  getDefaultLanguageForCountry,
  resolveLanguageForCountry,
  resolveLocaleForCountryChange,
} from "./countryLocaleSwitch";
import { validateCountryCode, validateLanguageCode } from "./validateInput";

const ORIGINAL = { ...process.env };

describe("Country → Locale automatic switching", () => {
  beforeEach(() => {
    if (typeof localStorage !== "undefined") {
      localStorage.clear();
    }
  });
  afterEach(() => {
    process.env = { ...ORIGINAL };
  });

  const cases: Array<[string, string]> = [
    ["DE", "de"],
    ["FR", "fr"],
    ["IT", "it"],
    ["ES", "es"],
    ["NL", "nl"],
    ["PL", "pl"],
    ["GR", "el"],
    ["RO", "ro"],
    ["HU", "hu"],
    ["TR", "tr"],
    ["SA", "ar"],
    ["AE", "ar"],
    ["EG", "ar"],
  ];

  it.each(cases)("country %s → default locale %s", (country, lang) => {
    const sel = buildCountryLocaleSelection(country);
    expect(sel?.languageCode).toBe(lang);
    expect(sel?.countryCode).toBe(country);
  });

  it("BE supports nl/fr/de default nl", () => {
    const sel = buildCountryLocaleSelection("BE");
    expect(sel?.languageCode).toBe("nl");
    expect(sel?.supportedLocales.length).toBeGreaterThanOrEqual(3);
  });

  it("LU supports configured locales", () => {
    const sel = buildCountryLocaleSelection("LU");
    expect(["lb", "fr", "de"]).toContain(sel?.languageCode);
  });

  it("AR → rtl, DE → ltr", () => {
    expect(buildCountryLocaleSelection("SA")?.direction).toBe("rtl");
    expect(buildCountryLocaleSelection("DE")?.direction).toBe("ltr");
    expect(buildCountryLocaleSelection("FR")?.direction).toBe("ltr");
  });

  it("routing preserves path /de/... → FR/fr (query-param locale)", () => {
    const sel = buildCountryLocaleSelection("FR", "fr")!;
    const url = buildLocalizedUrlForSelection("/de/automotive/brake-pads/", sel);
    expect(url).toContain("automotive");
    expect(url).toContain("country=FR");
    expect(url).toContain("lang=fr");
  });

  it("routing /de/... → /ar/...", () => {
    const sel = buildCountryLocaleSelection("SA", "ar")!;
    const url = buildLocalizedUrlForSelection("/de/products/", sel);
    expect(url).toMatch(/^\/ar\//);
  });

  it("rejects invalid country", () => {
    expect(validateCountryCode("INVALID")).toBeNull();
    expect(validateCountryCode("XX")).toBeNull();
    expect(buildCountryLocaleSelection("XX")).toBeNull();
  });

  it("rejects invalid locale", () => {
    expect(validateLanguageCode("xx")).toBeNull();
    expect(validateLanguageCode("")).toBeNull();
  });

  it("BE user picks fr → country BE locale fr", () => {
    const sel = resolveLanguageForCountry("BE", "fr");
    expect(sel?.countryCode).toBe("BE");
    expect(sel?.languageCode).toBe("fr");
  });

  it("browser detection de-DE → DE/de", () => {
    const sel = bootstrapCountryLocale({
      browserLanguages: ["de-DE"],
    });
    expect(sel.countryCode).toBe("DE");
    expect(sel.languageCode).toBe("de");
  });

  it("browser detection fr-FR → FR/fr", () => {
    const sel = bootstrapCountryLocale({
      browserLanguages: ["fr-FR"],
    });
    expect(sel.countryCode).toBe("FR");
    expect(sel.languageCode).toBe("fr");
  });

  it("browser detection ar-SA → SA/ar", () => {
    const sel = bootstrapCountryLocale({
      browserLanguages: ["ar-SA"],
    });
    expect(sel.countryCode).toBe("SA");
    expect(sel.languageCode).toBe("ar");
    expect(sel.direction).toBe("rtl");
  });

  it("explicit saved preference overrides browser", () => {
    const sel = resolveLanguageForCountry("DE", "tr");
    expect(sel?.languageCode).toBe("tr");
  });

  it("country change applies default when no manual language override", () => {
    const sel = resolveLocaleForCountryChange("FR", { respectManualLanguage: false });
    expect(sel?.languageCode).toBe("fr");
  });

  it("deterministic flag from country code", () => {
    expect(countryCodeToFlag("DE")).toBe("🇩🇪");
    expect(countryCodeToFlag("FR")).toBe("🇫🇷");
  });

  it("getDefaultLanguageForCountry", () => {
    expect(getDefaultLanguageForCountry("IT")).toBe("it");
    expect(getDefaultLanguageForCountry("NL")).toBe("nl");
  });
});
