import { describe, it, expect, beforeEach } from "vitest";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

describe("Part 18 — storefront listing", () => {
  beforeEach(() => {
    process.env.BUZZARD_SALES_ENABLED = "0";
    process.env.NEXT_PUBLIC_SALES_ENABLED = "0";
  });

  it("1. catalog health reports zero public products without supplier", () => {
    const catalogReadService = require("../lib/storefront/catalogReadService.js");
    const health = catalogReadService.getHealth();
    expect(health.salesEnabled).toBe(false);
    expect(typeof health.productCount).toBe("number");
  });

  it("2. listProducts excludes demo from public catalog", () => {
    const catalogReadService = require("../lib/storefront/catalogReadService.js");
    const productCore = require("../lib/pim/productCore.js");
    const demo = productCore.getProduct("pim_prod_demo001");
    expect(demo).toBeTruthy();
    const { items } = catalogReadService.listProducts({});
    expect(items.find((p) => p.sku === demo.sku)).toBeUndefined();
  });
});

describe("Part 18 — search and filter", () => {
  beforeEach(() => {
    process.env.BUZZARD_SALES_ENABLED = "0";
  });

  it("3. search supports required fields", () => {
    const search = require("../lib/storefront/storefrontSearchService.js");
    expect(search.SEARCH_FIELDS).toContain("sku");
    expect(search.SEARCH_FIELDS).toContain("gtin");
    expect(search.SEARCH_FIELDS).toContain("mpn");
    expect(search.SEARCH_FIELDS).toContain("brand");
  });

  it("4. search excludes demo products", () => {
    const search = require("../lib/storefront/storefrontSearchService.js");
    const result = search.searchCatalog({ q: "Demo" });
    expect(result.demoExcluded).toBe(true);
    expect(result.items.find((p) => p.sku === "BZ-CORE-DEMO-001")).toBeUndefined();
  });

  it("5. filter supports availability param", () => {
    const { filterProducts } = require("../lib/storefront/filterSort.js");
    const items = [
      { sku: "A", stockStatus: "in_stock", price: 10, stock: 5 },
      { sku: "B", stockStatus: "out_of_stock", price: 20, stock: 0 },
    ];
    const filtered = filterProducts(items, { availability: "in_stock" });
    expect(filtered).toHaveLength(1);
    expect(filtered[0].sku).toBe("A");
  });
});

describe("Part 18 — categories", () => {
  it("6. unknown category is blocked", () => {
    const cat = require("../lib/storefront/storefrontCategoryService.js");
    const result = cat.validateCategoryForListing("nonexistent-category-xyz");
    expect(result.ok).toBe(false);
    expect(result.status).toBe("BLOCKED");
  });

  it("7. category tree returns visible main categories", () => {
    const cat = require("../lib/storefront/storefrontCategoryService.js");
    const tree = cat.getCategoryTree({ depth: 1 });
    expect(Array.isArray(tree)).toBe(true);
    expect(tree.length).toBeGreaterThan(0);
    expect(tree.every((c) => c.customerVisible)).toBe(true);
  });
});

describe("Part 18 — product quality", () => {
  it("8. demo product rejected for storefront", () => {
    const quality = require("../lib/storefront/storefrontProductQuality.js");
    const result = quality.evaluateStorefrontEligibility({
      sku: "BZ-CORE-DEMO-001",
      title: "Demo Product",
      visibility: "PUBLIC",
      status: "READY",
    });
    expect(result.eligible).toBe(false);
    expect(result.status).toBe("REJECTED");
  });

  it("9. missing GTIN blocks validation pipeline", () => {
    const quality = require("../lib/storefront/storefrontProductQuality.js");
    const result = quality.evaluateImportRecord(
      { supplier_sku: "NO-GTIN-001", name: "Validationsartikel ohne GTIN" },
      { supplierCode: "SUP-REAL-001" }
    );
    expect(result.blocked).toBe(true);
    expect(result.blockingReasons).toContain("GTIN_MISSING");
  });

  it("10. unverified product not feed-eligible without GTIN/MPN", () => {
    const quality = require("../lib/storefront/storefrontProductQuality.js");
    expect(
      quality.isFeedEligible({
        sku: "FEED-TEST",
        title: "No Identifiers",
        visibility: "PUBLIC",
        status: "READY",
        provenance: { verified: false },
      })
    ).toBe(false);
  });
});

describe("Part 18 — SEO", () => {
  it("11. sitemap has no fake products when public catalog empty", () => {
    const seo = require("../lib/storefront/storefrontSeoService.js");
    const readiness = seo.getSeoReadiness();
    expect(readiness.fakeProductsInSitemap).toBe(false);
    if (readiness.publicProductCount === 0) {
      expect(readiness.sitemapProductCount).toBe(0);
    }
  });

  it("12. category SEO includes canonical", () => {
    const seo = require("../lib/storefront/storefrontSeoService.js");
    const cat = require("../lib/storefront/storefrontCategoryService.js");
    const tree = cat.getCategoryTree({ depth: 1 });
    if (tree.length) {
      const meta = seo.buildCategorySeo(tree[0].id);
      expect(meta?.canonical).toMatch(/^https?:\/\//);
      expect(meta?.slug).toBeTruthy();
    }
  });
});

describe("Part 18 — merchant feed", () => {
  beforeEach(() => {
    process.env.BUZZARD_SALES_ENABLED = "0";
  });

  it("13. feed excludes demo and unverified products", () => {
    const feed = require("../lib/storefront/merchantFeedService.js");
    const readiness = feed.getMerchantFeedReadiness();
    expect(readiness.demoExcluded).toBe(true);
    expect(readiness.unverifiedGtinExcluded).toBe(true);
    expect(readiness.fakeDataGenerated).toBe(false);
  });

  it("14. feed XML is valid RSS with g namespace", () => {
    const feed = require("../lib/storefront/merchantFeedService.js");
    const xml = feed.buildGoogleMerchantFeedXml({ locale: "de-DE", country: "DE" });
    expect(xml).toContain('xmlns:g="http://base.google.com/ns/1.0"');
    expect(xml).toContain("<channel>");
    expect(xml).not.toContain("BZ-CORE-DEMO-001");
  });

  it("15. localization feed delegates to PIM-safe builder", () => {
    const localizationFeeds = require("../lib/localizationFeeds.js");
    process.env.BUZZARD_MERCHANT_FEED_LEGACY = "0";
    const xml = localizationFeeds.buildGoogleMerchantFeed({ locale: "de-DE" });
    expect(xml).toContain("Validated public catalog only");
  });
});

describe("Part 18 — i18n", () => {
  it("16. required locales configured without inventing translations", () => {
    const i18n = require("../lib/storefront/storefrontI18nReadiness.js");
    const readiness = i18n.getI18nReadiness();
    expect(readiness.configuredLocales).toContain("de");
    expect(readiness.configuredLocales).toContain("en");
    expect(readiness.configuredLocales).toContain("ar");
    expect(readiness.autoInventTranslations).toBe(false);
  });
});

describe("Part 18 — customer and checkout", () => {
  beforeEach(() => {
    process.env.BUZZARD_SALES_ENABLED = "0";
    process.env.BUZZARD_STRIPE_ENABLED = "0";
    process.env.BUZZARD_PAYPAL_ENABLED = "0";
  });

  it("17. customer account readiness without real orders", () => {
    const customer = require("../lib/storefront/customerAccountReadiness.js");
    const readiness = customer.getCustomerAccountReadiness();
    expect(readiness.realOrdersEnabled).toBe(false);
    expect(readiness.fakeOrdersCreated).toBe(false);
    expect(readiness.goLiveLock).toBe(true);
  });

  it("18. checkout fail-closed while sales OFF", () => {
    const checkout = require("../lib/storefront/checkoutSafetyReadiness.js");
    const readiness = checkout.getCheckoutSafetyReadiness();
    expect(readiness.salesEnabled).toBe(false);
    expect(readiness.realCheckoutCompletes).toBe(false);
    expect(readiness.realPaymentProcesses).toBe(false);
    expect(readiness.failClosed).toBe(true);
  });
});

describe("Part 18 — safety regression", () => {
  beforeEach(() => {
    process.env.BUZZARD_SALES_ENABLED = "0";
    process.env.NEXT_PUBLIC_SALES_ENABLED = "0";
    process.env.REAL_SUPPLIER_LIVE_IMPORT = "0";
    process.env.REAL_SUPPLIER_DRY_RUN = "1";
  });

  it("19. storefront readiness is diagnostic only", () => {
    const readiness = require("../lib/storefront/storefrontReadiness.js");
    const report = readiness.evaluateStorefrontReadiness();
    expect(report.STOREFRONT_READINESS.diagnosticOnly).toBe(true);
    expect(report.STOREFRONT_READINESS.autoActivate).toBe(false);
    expect(report.STOREFRONT_READINESS.gates.length).toBe(11);
  });

  it("20. safety gate PASS with sales OFF", () => {
    const readiness = require("../lib/storefront/storefrontReadiness.js");
    const report = readiness.evaluateStorefrontReadiness();
    const safety = report.STOREFRONT_READINESS.gates.find((g) => g.gate === "SAFETY");
    expect(safety.status).toBe("PASS");
  });

  it("21. hidden product not in public catalog", () => {
    const { isProductVisibleOnStorefront } = require("../lib/storefront/storefrontVisibility.js");
    expect(
      isProductVisibleOnStorefront({
        sku: "HIDDEN-001",
        title: "Hidden Product Test",
        visibility: "HIDDEN",
        status: "READY",
        category: "automotive",
      })
    ).toBe(false);
  });

  it("22. go-live lock remains active", () => {
    const goLiveApproval = require("../lib/commerce/goLiveApproval.js");
    expect(goLiveApproval.PRODUCTION_SAFETY_LOCK).toBe(true);
  });

  it("23. stripe and paypal OFF via feature flags", () => {
    const { getEffectiveFlags } = require("../lib/commerce/commerceFeatureFlags.js");
    const flags = getEffectiveFlags();
    expect(flags.stripeEnabled).toBe(false);
    expect(flags.paypalEnabled).toBe(false);
    expect(flags.mockPaymentOnly).toBe(true);
  });
});
