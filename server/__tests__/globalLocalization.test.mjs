import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

const countryRegistry = require("../core/globalCountryRegistry.js");
const languageRegistry = require("../core/globalLanguageRegistry.js");
const currencyRegistry = require("../core/globalCurrencyRegistry.js");
const { GLOBAL_SAFETY_POLICY, assertGlobalSafetyPolicy } = require("../core/globalSafetyPolicy.js");
const countryDetection = require("../lib/global/countryDetection.js");
const localeResolution = require("../lib/global/localeResolution.js");
const productIdentity = require("../lib/global/productIdentity.js");
const translationValidation = require("../lib/global/translationValidation.js");
const countryAvailability = require("../lib/global/countryAvailability.js");
const searchNormalization = require("../lib/global/searchNormalization.js");
const synonymEngine = require("../lib/global/synonymEngine.js");
const searchIntelligence = require("../lib/global/searchIntelligence.js");
const zeroResult = require("../lib/global/zeroResultIntelligence.js");
const hreflang = require("../lib/global/hreflang.js");
const slugGeneration = require("../lib/global/slugGeneration.js");
const cacheKeys = require("../lib/global/cacheKeys.js");
const unitLocalization = require("../lib/global/unitLocalization.js");
const categoryLocalization = require("../lib/global/categoryLocalization.js");
const imageLocalization = require("../lib/global/imageLocalization.js");
const seoLocalization = require("../lib/global/seoLocalization.js");
const exchangeRate = require("../lib/global/exchangeRateProvider.js");
const globalPipeline = require("../lib/global/globalProductPipeline.js");
const countryReadiness = require("../lib/global/countryReadinessReport.js");
const countryMatrix = require("../lib/global/countryCatalogMatrix.js");
const globalHealth = require("../lib/global/globalCatalogHealth.js");

const buzzardI18nHealth = require("../lib/global/buzzardI18nHealth.js");

const EXPECTED_COUNTRIES = [
  "AT","BE","BG","HR","CY","CZ","DK","EE","FI","FR","DE","GR","HU","IE","IT",
  "LV","LT","LU","MT","NL","PL","PT","RO","SK","SI","ES","SE",
  "TR","SA","AE","QA","KW","BH","OM","EG",
];

test("country registry exposes exactly 35 countries", () => {
  assert.equal(countryRegistry.getCountryCount(), 35);
});

for (const code of EXPECTED_COUNTRIES) {
  test(`country registry includes ${code}`, () => {
    assert.ok(countryRegistry.isSupportedCountry(code));
    const country = countryRegistry.getCountry(code);
    assert.ok(country.countryName);
    assert.ok(country.defaultLanguage);
    assert.ok(country.currency);
    assert.ok(country.locale);
  });
}

test("default country is DE", () => {
  assert.equal(countryRegistry.getDefaultCountryCode(), "DE");
});

test("unsupported country returns null", () => {
  assert.equal(countryRegistry.getCountry("XX"), null);
});

test("catalog context remains blocked", () => {
  const ctx = countryRegistry.getCatalogContext("DE");
  assert.equal(ctx.catalogEnabled, false);
  assert.equal(ctx.safety.publishBlocked, true);
});

test("language registry preserves UI locales de/en/tr/ar", () => {
  for (const code of ["de", "en", "tr", "ar"]) {
    assert.ok(languageRegistry.getLanguage(code));
    assert.equal(languageRegistry.isUiLocale(code), true);
  }
});

test("Arabic remains RTL", () => {
  assert.equal(languageRegistry.getLanguage("ar").direction, "rtl");
});

for (const code of ["fr", "it", "es", "nl", "pl", "cs", "sk", "hu", "ro", "bg", "hr", "sl", "da", "sv", "fi", "et", "lv", "lt", "pt", "el", "ca", "eu", "gl", "ga", "lb", "mt"]) {
  test(`UI-ready language ${code} exists`, () => {
    const lang = languageRegistry.getLanguage(code);
    assert.ok(lang);
    assert.equal(lang.uiReady, true);
  });
}

test("currency registry includes required currencies", () => {
  for (const code of ["EUR","PLN","CZK","HUF","RON","DKK","SEK","AED","SAR","TRY","QAR","KWD","BHD","OMR","EGP"]) {
    assert.ok(currencyRegistry.getCurrency(code));
  }
});

test("validateBuzzardI18n passes for 35 markets", () => {
  const result = buzzardI18nHealth.validateBuzzardI18n();
  assert.equal(result.valid, true, result.errors.join("; "));
  assert.equal(result.stats.countries, 35);
});

test("currency formatting does not throw", () => {
  const formatted = currencyRegistry.formatCurrencyAmount(10, "EUR", "de-DE");
  assert.match(formatted, /10/);
});

test("global safety policy is fail-closed", () => {
  assert.equal(GLOBAL_SAFETY_POLICY.ready, false);
  assert.equal(GLOBAL_SAFETY_POLICY.status, "BLOCKED");
  assert.equal(GLOBAL_SAFETY_POLICY.autoActivate, false);
  assert.equal(GLOBAL_SAFETY_POLICY.activationAllowed, false);
  assert.equal(GLOBAL_SAFETY_POLICY.salesEnabled, false);
  assert.equal(GLOBAL_SAFETY_POLICY.humanApprovalRequired, true);
});

test("safety assertion respects env defaults", () => {
  const check = assertGlobalSafetyPolicy();
  assert.equal(check.compliant, true);
});

test("country detection defaults to DE", () => {
  const resolved = countryDetection.resolveCountry({});
  assert.equal(resolved.countryCode, "DE");
});

test("country detection uses saved preference", () => {
  const resolved = countryDetection.resolveCountry({ savedCountryCode: "FR" });
  assert.equal(resolved.countryCode, "FR");
  assert.equal(resolved.source, "saved_preference");
});

test("language manual override wins over browser", () => {
  const resolved = localeResolution.resolveLanguage({
    explicitLanguage: "tr",
    manualOverride: true,
    browserLanguages: ["de-DE"],
    countryCode: "DE",
  });
  assert.equal(resolved.language, "tr");
  assert.equal(resolved.source, "manual_override");
});

test("language does not flip when manual override saved", () => {
  const resolved = localeResolution.resolveLanguage({
    savedLanguage: "tr",
    savedManualOverride: true,
    browserLanguages: ["de-DE"],
    countryCode: "DE",
  });
  assert.equal(resolved.language, "tr");
});

test("locale context separates country and language", () => {
  const ctx = localeResolution.buildLocaleContext({
    countryCode: "BE",
    explicitLanguage: "fr",
    manualOverride: true,
  });
  assert.equal(ctx.country, "BE");
  assert.equal(ctx.language, "fr");
  assert.equal(ctx.currency, "EUR");
});

test("product identity prioritizes productId", () => {
  const match = productIdentity.compareIdentity(
    { productId: "P1", title: "Alpha" },
    { productId: "P1", title: "Beta" }
  );
  assert.equal(match.match, true);
  assert.equal(match.method, "productId");
});

test("product identity matches GTIN", () => {
  const match = productIdentity.compareIdentity({ gtin: "5901234123457" }, { gtin: "5901234123457" });
  assert.equal(match.match, true);
  assert.equal(match.method, "gtin");
});

test("translated titles do not define identity", () => {
  const a = productIdentity.extractProductIdentity({ sku: "SKU-1", translations: { de: { title: "A" } } });
  const b = productIdentity.extractProductIdentity({ sku: "SKU-1", translations: { en: { title: "B" } } });
  assert.equal(a.sku, b.sku);
});

test("missing mandatory translation is REVIEW_REQUIRED", () => {
  const result = translationValidation.validateProductTranslations({ translations: { de: { title: "X" } } });
  assert.equal(result.valid, false);
  assert.equal(result.status, "REVIEW_REQUIRED");
  assert.ok(result.missingLanguages.includes("en"));
});

test("valid translations pass", () => {
  const result = translationValidation.validateProductTranslations({
    translations: {
      de: { title: "Bremsbelag", description: "Test", seo: { metaTitle: "Bremsbelag", metaDescription: "Test" } },
      en: { title: "Brake pad", description: "Test", seo: { metaTitle: "Brake pad", metaDescription: "Test" } },
    },
  });
  assert.equal(result.valid, true);
});

test("unknown country availability is REVIEW_REQUIRED", () => {
  const result = countryAvailability.validateCountryAvailability({});
  assert.equal(result.status, "REVIEW_REQUIRED");
});

test("country availability does not fallback across markets", () => {
  const product = { countryAvailability: { DE: true } };
  const fr = countryAvailability.isProductAvailableInCountry(product, "FR");
  assert.equal(fr.available, false);
  assert.equal(fr.status, "REVIEW_REQUIRED");
});

test("search normalization preserves oil grade", () => {
  const q = searchNormalization.normalizeSearchQuery("5W-30 Motoröl");
  assert.match(q, /5W30|5w-30/i);
});

test("search normalization strips diacritics", () => {
  assert.equal(searchNormalization.stripDiacritics("Bremsscheibe"), "Bremsscheibe");
  assert.equal(searchNormalization.stripDiacritics("disqué"), "disque");
});

test("synonym engine maps brake disc variants", () => {
  assert.equal(synonymEngine.resolveCanonicalTerm("bremsscheibe"), "BRAKE_DISC");
  assert.equal(synonymEngine.resolveCanonicalTerm("fren diski"), "BRAKE_DISC");
  assert.equal(synonymEngine.resolveCanonicalTerm("disque de frein"), "BRAKE_DISC");
});

test("multilingual search ranks GTIN highest", () => {
  const products = [
    { sku: "A", title: "Other", gtin: "5901234123457", countryAvailability: { DE: true } },
    { sku: "B", title: "5901234123457 lookalike", countryAvailability: { DE: true } },
  ];
  const result = searchIntelligence.searchProducts(products, "5901234123457", { country: "DE", language: "de" });
  assert.equal(result.results[0].product.sku, "A");
});

test("search filters by country availability", () => {
  const products = [
    { sku: "DE-1", title: "brake disc", countryAvailability: { DE: true } },
    { sku: "FR-1", title: "brake disc", countryAvailability: { FR: true } },
  ];
  const result = searchIntelligence.searchProducts(products, "brake disc", { country: "DE", language: "en" });
  assert.equal(result.resultCount, 1);
  assert.equal(result.results[0].product.sku, "DE-1");
});

test("automotive intent detects BMW and brake disc", () => {
  const intent = searchIntelligence.detectAutomotiveSearchIntent("BMW 320d brake disc");
  assert.equal(intent.detectedMake, "bmw");
  assert.equal(intent.detectedCategory, "BRAKE_DISC");
});

test("zero result does not fabricate products", () => {
  const result = zeroResult.buildZeroResultResponse("bmw fren diski", { language: "tr", country: "TR" });
  assert.equal(result.products.length, 0);
  assert.equal(result.fabricatedProducts, false);
  assert.ok(result.suggestedCategories.includes("BRAKE_DISC"));
});

test("hreflang tag generation", () => {
  assert.equal(hreflang.buildHreflangTag("DE", "de"), "de-DE");
  assert.equal(hreflang.buildHreflangTag("AE", "ar"), "ar-AE");
});

test("slug generation localized", () => {
  assert.equal(slugGeneration.generateLocalizedSlug("Bremsbelag BMW 320d", { language: "de" }), "bremsbelag-bmw-320d");
  assert.equal(slugGeneration.generateLocalizedSlug("BMW 320d Brake Pads", { language: "en" }), "bmw-320d-brake-pads");
});

test("cache keys isolate country and language", () => {
  const de = cacheKeys.buildSearchCacheKey({ country: "DE", language: "de", query: "test" });
  const fr = cacheKeys.buildSearchCacheKey({ country: "FR", language: "fr", query: "test" });
  assert.notEqual(de, fr);
});

test("unit localization keeps canonical value", () => {
  const localized = unitLocalization.localizeAttributeLabel(
    { key: "fuelType", canonicalValue: "diesel", canonicalUnit: "diesel" },
    "tr"
  );
  assert.equal(localized.canonical, "diesel diesel");
});

test("tire size parsing", () => {
  const parsed = unitLocalization.parseTireSize("205/55 R16 91V");
  assert.deepEqual(parsed, { tireWidth: 205, aspectRatio: 55, rimDiameter: 16, speedRating: "91V" });
});

test("image validation rejects non-https", () => {
  const result = imageLocalization.validateImageUrl("http://cdn.example.com/a.jpg");
  assert.equal(result.valid, false);
});

test("exchange rate provider is mock dry-run", () => {
  const converted = exchangeRate.convertAmount(100, "EUR", "TRY");
  assert.equal(converted.live, false);
  assert.equal(converted.provider, "mock_dry_run");
});

test("global pipeline blocks publish", () => {
  const result = globalPipeline.runGlobalProductPipeline(
    {
      sku: "TEST-1",
      supplier: "mock",
      title: "Test",
      categoryId: "automotive",
      supplierCategory: "automotive/brakes",
      countryAvailability: { DE: true },
      translations: {
        de: { title: "Test DE", description: "Desc", seo: { metaTitle: "T", metaDescription: "D" } },
        en: { title: "Test EN", description: "Desc", seo: { metaTitle: "T", metaDescription: "D" } },
      },
      primaryImage: "https://cdn.buzzard24.de/product.jpg",
      gtin: "5901234123457",
      mpn: "MPN-1",
      brand: "TestBrand",
    },
    { country: "DE", language: "de", supplierCode: "mock" }
  );
  assert.equal(result.publishAllowed, false);
  assert.equal(result.autoActivate, false);
  assert.equal(result.safety.publishBlocked, true);
});

test("country readiness report blocked by policy", () => {
  const report = countryReadiness.buildCountryReadinessReport("DE", { productCount: 10, languageReady: true });
  assert.equal(report.publishableCount, 0);
  assert.ok(report.blockers.some((b) => b.code === "PUBLISH_BLOCKED_BY_POLICY"));
});

test("country matrix has 35 rows", () => {
  const matrix = countryMatrix.buildCountryCatalogMatrix();
  assert.equal(matrix.length, 35);
});

test("global catalog health reports blocked status", () => {
  const health = globalHealth.buildGlobalCatalogHealth({
    hasPimFoundation: true,
    hasAutomotive: true,
    hasReconciliation: true,
  });
  assert.equal(health.ready, false);
  assert.equal(health.status, "BLOCKED");
  assert.equal(health.countries.configured, 35);
  assert.equal(health.products.published, 0);
});

test("SEO structured data excludes offers/prices", () => {
  const seo = seoLocalization.buildLocalizedProductSeo(
    { sku: "S1", title: "Product", translations: { de: { title: "Produkt" } } },
    { language: "de", country: "DE" }
  );
  const structured = seoLocalization.buildProductStructuredData({ sku: "S1" }, seo);
  assert.equal(seo.includePrice, false);
  assert.equal(seo.includeOffers, false);
  assert.equal(structured["@type"], "Product");
  assert.equal(structured.offers, undefined);
});

test("category localization resolves synonym query", () => {
  const resolved = categoryLocalization.resolveCategoryFromQuery("bremsscheibe", [
    { id: "auto-sub-04--brake-discs", canonical: "BRAKE_DISC", localizedNames: { de: "Bremsscheiben" } },
  ]);
  assert.equal(resolved.ok, true);
  assert.equal(resolved.confidence, "HIGH");
});

// Additional coverage: language/country combinations
const COMBOS = [
  ["DE", "de"], ["DE", "en"], ["DE", "tr"], ["DE", "ar"],
  ["FR", "fr"], ["TR", "tr"],
  ["AE", "ar"], ["AE", "en"], ["SA", "ar"], ["SA", "en"],
  ["BE", "nl"], ["BE", "fr"], ["ES", "es"], ["ES", "ca"],
];

for (const [country, language] of COMBOS) {
  test(`locale context supports ${country}+${language}`, () => {
    const ctx = localeResolution.buildLocaleContext({ countryCode: country, explicitLanguage: language, manualOverride: true });
    assert.equal(ctx.country, country);
    assert.equal(ctx.language, language);
  });
}

// Per-country default language sanity
for (const code of EXPECTED_COUNTRIES) {
  test(`${code} default language is supported in country`, () => {
    const country = countryRegistry.getCountry(code);
    assert.ok(country.supportedLanguages.includes(country.defaultLanguage));
  });
}

// Currency per country sanity
for (const code of ["DE", "TR", "AE", "PL", "EG"]) {
  test(`${code} currency mapping`, () => {
    const country = countryRegistry.getCountry(code);
    assert.ok(currencyRegistry.getCurrency(country.currency));
  });
}

test("identity fingerprint stable across translations", () => {
  const fp1 = productIdentity.identityFingerprint({ sku: "X", gtin: "123", translations: { de: { title: "A" } } });
  const fp2 = productIdentity.identityFingerprint({ sku: "X", gtin: "123", translations: { en: { title: "B" } } });
  assert.equal(fp1, fp2);
});

test("invalid GTIN flagged", () => {
  const result = globalPipeline.validateGtinEanMpn({ gtin: "abc" });
  assert.equal(result.valid, false);
});

test("duplicate slug detection in translations", () => {
  const result = translationValidation.validateProductTranslations({
    translations: {
      de: { title: "A", slug: "same-slug", seo: { metaTitle: "A", metaDescription: "B" } },
      en: { title: "B", slug: "same-slug", seo: { metaTitle: "A", metaDescription: "B" } },
    },
  });
  assert.ok(result.errors.some((e) => e.code === "DUPLICATE_SLUG"));
});

test("country restrictions block availability", () => {
  const result = countryAvailability.isProductAvailableInCountry(
    { countryAvailability: { DE: true }, countryRestrictions: { DE: true } },
    "DE"
  );
  assert.equal(result.available, false);
  assert.equal(result.status, "BLOCKED");
});

test("filter products by country", () => {
  const filtered = countryAvailability.filterProductsByCountry(
    [
      { sku: "1", countryAvailability: { DE: true } },
      { sku: "2", countryAvailability: { FR: true } },
    ],
    "DE"
  );
  assert.equal(filtered.length, 1);
});

test("hreflang alternates include x-default", () => {
  const alternates = hreflang.buildHreflangAlternates("/product/test", [
    { country: "DE", language: "de", href: "/product/test?country=DE&lang=de" },
    { country: "FR", language: "fr", href: "/product/test?country=FR&lang=fr" },
  ]);
  assert.ok(alternates.some((a) => a.hreflang === "x-default"));
});

test("ensure unique slug appends suffix", () => {
  const existing = new Set(["test-slug"]);
  assert.equal(slugGeneration.ensureUniqueSlug("test-slug", existing), "test-slug-2");
});

test("global health integration flags present on reconciliation branch", () => {
  const health = globalHealth.buildGlobalCatalogHealth({ hasPimFoundation: true, hasAutomotive: true, hasReconciliation: true });
  assert.equal(health.integration.pimCatalogFoundation, true);
  assert.equal(health.integration.automotiveCategorySystem, true);
});
