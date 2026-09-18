import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  applyCountryLocalePersistence,
  bootstrapCountryLocale,
  buildCountryLocaleSelection,
  buildLocalizedUrlForSelection,
  resolveLanguageForCountry,
} from "./countryLocaleSwitch";
import {
  isLanguageSupportedForCountry,
  validateCountryCode,
  validateLanguageCode,
} from "./validateInput";
import { getLanguageOptionsForCountry } from "./config";
import { getMarket, getMarketStatus } from "@/lib/market-engine/registry";
import { isProductionFlagEnabled, getProductionFlagsSnapshot } from "@/lib/production-defaults";
import { splitProductFields } from "./productTranslation";
import { CART_STORAGE_KEY } from "@/lib/cart/storage";
import { STORAGE_KEY, MARKET_LOCALE_KEY } from "@/lib/i18n/detect";
import { translate, getCatalog } from "@/lib/i18n/translations";
import { isRtlLocale } from "@/lib/i18n/types";

const ORIGINAL_ENV = { ...process.env };

function createMemoryStorage() {
  const store = new Map<string, string>();
  return {
    getItem: (key: string) => (store.has(key) ? store.get(key)! : null),
    setItem: (key: string, value: string) => {
      store.set(key, value);
    },
    removeItem: (key: string) => {
      store.delete(key);
    },
    clear: () => {
      store.clear();
    },
    _dump: () => new Map(store),
  };
}

function installBrowserStorage() {
  const local = createMemoryStorage();
  const session = createMemoryStorage();
  vi.stubGlobal("window", { localStorage: local, sessionStorage: session });
  vi.stubGlobal("localStorage", local);
  vi.stubGlobal("sessionStorage", session);
  return { local, session };
}

describe("Country → Language QA hardening (#351)", () => {
  beforeEach(() => {
    process.env.SALES_ENABLED = "0";
    process.env.SUPPLIER_NETWORK_ENABLED = "0";
    process.env.SUPPLIER_ORDER_NETWORK_ENABLED = "0";
    process.env.PAYMENT_PRODUCTION_ENABLED = "0";
  });

  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
    vi.unstubAllGlobals();
  });

  describe("multi-language countries", () => {
    it("BE supports nl/fr/de default nl", () => {
      const options = getLanguageOptionsForCountry("BE").map((o) => o.languageCode).sort();
      expect(options).toEqual(["de", "fr", "nl"]);
      expect(buildCountryLocaleSelection("BE")?.languageCode).toBe("nl");
    });

    it("LU supports lb/fr/de", () => {
      const options = getLanguageOptionsForCountry("LU").map((o) => o.languageCode).sort();
      expect(options).toEqual(["de", "fr", "lb"]);
    });

    it("CY supports el/tr", () => {
      const options = getLanguageOptionsForCountry("CY").map((o) => o.languageCode).sort();
      expect(options).toEqual(["el", "tr"]);
      expect(buildCountryLocaleSelection("CY")?.languageCode).toBe("el");
    });

    it("IE supports en/ga default en", () => {
      const options = getLanguageOptionsForCountry("IE").map((o) => o.languageCode).sort();
      expect(options).toEqual(["en", "ga"]);
      expect(buildCountryLocaleSelection("IE")?.languageCode).toBe("en");
    });

    it("MT supports mt/en default mt", () => {
      const options = getLanguageOptionsForCountry("MT").map((o) => o.languageCode).sort();
      expect(options).toEqual(["en", "mt"]);
      expect(buildCountryLocaleSelection("MT")?.languageCode).toBe("mt");
    });
  });

  describe("RTL direction", () => {
    it("ar → rtl", () => {
      expect(buildCountryLocaleSelection("SA")?.direction).toBe("rtl");
      expect(isRtlLocale("ar")).toBe(true);
    });

    it("de/fr/it → ltr", () => {
      for (const country of ["DE", "FR", "IT"] as const) {
        expect(buildCountryLocaleSelection(country)?.direction).toBe("ltr");
      }
      expect(isRtlLocale("de")).toBe(false);
      expect(isRtlLocale("fr")).toBe(false);
      expect(isRtlLocale("it")).toBe(false);
    });
  });

  describe("path preservation (routing SSOT)", () => {
    it("/de/... → /ar/... keeps path segment", () => {
      const sel = buildCountryLocaleSelection("SA", "ar")!;
      const url = buildLocalizedUrlForSelection("/de/automotive/brake-pads/", sel);
      expect(url).toMatch(/^\/ar\//);
      expect(url).toContain("automotive/brake-pads");
    });

    it("/de/... → /tr/... keeps path segment", () => {
      const sel = buildCountryLocaleSelection("TR", "tr")!;
      const url = buildLocalizedUrlForSelection("/de/automotive/brake-pads/", sel);
      expect(url).toMatch(/^\/tr\//);
      expect(url).toContain("automotive/brake-pads");
    });

    it("/de/... → FR/fr uses query-param routing standard", () => {
      const sel = buildCountryLocaleSelection("FR", "fr")!;
      const url = buildLocalizedUrlForSelection("/de/automotive/brake-pads/", sel);
      expect(url).toContain("automotive/brake-pads");
      expect(url).toContain("country=FR");
      expect(url).toContain("lang=fr");
    });

    it("/de/... → IT/it uses query-param routing standard", () => {
      const sel = buildCountryLocaleSelection("IT", "it")!;
      const url = buildLocalizedUrlForSelection("/de/automotive/brake-pads/", sel);
      expect(url).toContain("automotive/brake-pads");
      expect(url).toContain("country=IT");
      expect(url).toContain("lang=it");
    });
  });

  describe("persistence reload (localStorage mock)", () => {
    it("DE/de survives simulated reload", () => {
      const { local } = installBrowserStorage();
      const sel = buildCountryLocaleSelection("DE", "de")!;
      applyCountryLocalePersistence(sel, { manualLanguage: true });
      local.setItem("buzzard_market_country", "DE");

      expect(local.getItem(STORAGE_KEY)).toBe("de");
      expect(local.getItem(MARKET_LOCALE_KEY)).toBe("de-DE");
      expect(local.getItem("buzzard_market_country")).toBe("DE");

      const reloaded = bootstrapCountryLocale({
        savedCountryCode: local.getItem("buzzard_market_country"),
        savedLanguage: local.getItem(STORAGE_KEY),
      });
      expect(reloaded.countryCode).toBe("DE");
      expect(reloaded.languageCode).toBe("de");
    });

    it("FR/fr survives simulated reload", () => {
      const { local } = installBrowserStorage();
      const sel = buildCountryLocaleSelection("FR", "fr")!;
      applyCountryLocalePersistence(sel, { manualLanguage: true });
      local.setItem("buzzard_market_country", "FR");

      const reloaded = bootstrapCountryLocale({
        savedCountryCode: local.getItem("buzzard_market_country"),
        savedLanguage: local.getItem(STORAGE_KEY),
      });
      expect(reloaded.countryCode).toBe("FR");
      expect(reloaded.languageCode).toBe("fr");
    });

    it("SA/ar/rtl survives simulated reload", () => {
      const { local } = installBrowserStorage();
      const sel = buildCountryLocaleSelection("SA", "ar")!;
      applyCountryLocalePersistence(sel, { manualLanguage: true });
      local.setItem("buzzard_market_country", "SA");

      const reloaded = bootstrapCountryLocale({
        savedCountryCode: local.getItem("buzzard_market_country"),
        savedLanguage: local.getItem(STORAGE_KEY),
      });
      expect(reloaded.countryCode).toBe("SA");
      expect(reloaded.languageCode).toBe("ar");
      expect(reloaded.direction).toBe("rtl");
    });
  });

  describe("browser language bootstrap priority", () => {
    it("de-DE → DE/de", () => {
      const sel = bootstrapCountryLocale({ browserLanguages: ["de-DE"] });
      expect(sel.countryCode).toBe("DE");
      expect(sel.languageCode).toBe("de");
    });

    it("fr-FR → FR/fr", () => {
      const sel = bootstrapCountryLocale({ browserLanguages: ["fr-FR"] });
      expect(sel.countryCode).toBe("FR");
      expect(sel.languageCode).toBe("fr");
    });

    it("it-IT → IT/it", () => {
      const sel = bootstrapCountryLocale({ browserLanguages: ["it-IT"] });
      expect(sel.countryCode).toBe("IT");
      expect(sel.languageCode).toBe("it");
    });

    it("ar-SA → SA/ar", () => {
      const sel = bootstrapCountryLocale({ browserLanguages: ["ar-SA"] });
      expect(sel.countryCode).toBe("SA");
      expect(sel.languageCode).toBe("ar");
    });

    it("saved preference overrides browser language", () => {
      const sel = bootstrapCountryLocale({
        savedCountryCode: "DE",
        savedLanguage: "tr",
        browserLanguages: ["fr-FR"],
      });
      expect(sel.countryCode).toBe("DE");
      expect(sel.languageCode).toBe("tr");
    });
  });

  describe("cart preservation", () => {
    it("locale persistence does not mutate cart storage", () => {
      const { local } = installBrowserStorage();
      const cart = [
        {
          lineId: "prod-1",
          productId: "prod-1",
          name: "Brake Pad",
          sku: "SKU-001",
          unitPrice: 19.99,
          qty: 2,
          variantIds: [],
          variantLabel: "",
          vatRate: 0.19,
        },
      ];
      local.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
      local.setItem("buzzard_commerce_cart_id", "cart-e2e-123");

      const sel = buildCountryLocaleSelection("FR", "fr")!;
      applyCountryLocalePersistence(sel);

      expect(JSON.parse(local.getItem(CART_STORAGE_KEY)!)).toEqual(cart);
      expect(local.getItem("buzzard_commerce_cart_id")).toBe("cart-e2e-123");
    });
  });

  describe("auth session preservation", () => {
    it("locale persistence does not clear account token", () => {
      const { session } = installBrowserStorage();
      session.setItem("buzzard_account_token", "token-qa-abc");

      const sel = buildCountryLocaleSelection("SA", "ar")!;
      applyCountryLocalePersistence(sel);

      expect(session.getItem("buzzard_account_token")).toBe("token-qa-abc");
    });
  });

  describe("product canonical immutability", () => {
    it("UI locale switch does not alter canonical technical fields", () => {
      const product = {
        productId: "canonical-prod-99",
        sku: "SKU-ABC",
        ean: "4012345678901",
        gtin: "4012345678901",
        mpn: "MPN-XYZ",
        oem: "OEM-123",
        brand: "Bosch",
        name: "Bremsbelag",
        title: "Bremsbelag",
        supplierSku: "SUP-SKU-1",
        supplierOfferId: "offer-77",
      };

      const before = splitProductFields(product);
      void buildCountryLocaleSelection("FR", "fr");
      void buildCountryLocaleSelection("SA", "ar");
      const after = splitProductFields(product);

      expect(after.technical.sku).toBe(before.technical.sku);
      expect(after.technical.ean).toBe(before.technical.ean);
      expect(after.technical.brand).toBe(before.technical.brand);
      expect(product.productId).toBe("canonical-prod-99");
      expect(product.supplierSku).toBe("SUP-SKU-1");
      expect(product.supplierOfferId).toBe("offer-77");
    });
  });

  describe("market engine separation", () => {
    it("UI country selection resolves locale without toggling production flags", () => {
      const eg = buildCountryLocaleSelection("EG", "ar");
      expect(eg?.languageCode).toBe("ar");
      expect(getMarket("EG")).toBeTruthy();
      expect(getMarketStatus("EG")).toBe("TESTING");

      const flags = getProductionFlagsSnapshot();
      expect(flags.SALES).toBe("OFF");
      expect(flags.SUPPLIER_NETWORK).toBe("OFF");
      expect(isProductionFlagEnabled("SALES")).toBe(false);
    });

    it("country locale switch does not mutate market feature flags", () => {
      const before = getMarket("FR")?.featureFlags;
      void buildCountryLocaleSelection("FR", "fr");
      void buildCountryLocaleSelection("EG", "ar");
      const after = getMarket("FR")?.featureFlags;
      expect(after).toEqual(before);
    });
  });

  describe("security hardening", () => {
    const maliciousInputs = [
      "INVALID",
      "XX",
      "__proto__",
      "constructor",
      "prototype",
      "**proto**",
      "DE';DROP TABLE",
      null,
      undefined,
      42,
      { country: "FR" },
    ];

    it.each(maliciousInputs)("rejects malicious country input: %s", (input) => {
      expect(validateCountryCode(input)).toBeNull();
      if (typeof input === "string") {
        expect(buildCountryLocaleSelection(input)).toBeNull();
      }
    });

    it("rejects array/object country payloads without throwing", () => {
      expect(validateCountryCode(["FR"])).toBeNull();
      expect(() => validateCountryCode({ country: "FR", __proto__: { polluted: true } })).not.toThrow();
    });

    const badLocales = ["xx", "INVALID", "constructor", "prototype", "__proto__", "", null, 99];

    it.each(badLocales)("rejects malicious locale input: %s", (input) => {
      expect(validateLanguageCode(input)).toBeNull();
      expect(resolveLanguageForCountry("DE", String(input))).toBeNull();
    });

    it("sanitizes injection-style locale prefix to whitelist value without throwing", () => {
      expect(validateLanguageCode("de';--")).toBe("de");
      expect(() => resolveLanguageForCountry("DE", "de';--")).not.toThrow();
    });

    it("rejects unsupported locale for country", () => {
      expect(isLanguageSupportedForCountry("DE", "fr")).toBe(false);
      expect(resolveLanguageForCountry("DE", "fr")).toBeNull();
    });

    it("malformed query-style strings do not bypass whitelist", () => {
      expect(validateCountryCode("country=INVALID")).toBeNull();
      expect(validateLanguageCode("lang=INVALID")).toBeNull();
    });
  });

  describe("i18n catalog smoke", () => {
    it("core routing catalogs de/en/tr/ar resolve keys", () => {
      for (const lang of ["de", "en", "tr", "ar"] as const) {
        expect(getCatalog(lang).header).toBeTruthy();
        expect(translate(lang, "header.cart")).not.toBe("header.cart");
      }
    });

    it("extended UI locales fr/it/es/nl resolve keys", () => {
      for (const lang of ["fr", "it", "es", "nl"] as const) {
        expect(getCatalog(lang).header).toBeTruthy();
        expect(translate(lang, "home.addToCart").length).toBeGreaterThan(0);
      }
    });
  });
});
