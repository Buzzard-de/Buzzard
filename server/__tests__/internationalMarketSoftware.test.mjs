import { describe, it, expect, beforeAll } from "vitest";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

describe("international market / locale / VAT / marketplace — established fail-closed", () => {
  let software;
  let marketEngine;

  beforeAll(() => {
    software = require("../lib/software");
    marketEngine = require("../core/marketEngineRegistry");
  });

  it("registry has 35 markets and does not invent VAT for unknown countries", () => {
    const validation = marketEngine.validateMarketRegistry();
    expect(validation.valid).toBe(true);
    expect(validation.count).toBe(35);
    expect(marketEngine.getMarket("DE").vat.standardRate).toBe(0.19);
    expect(marketEngine.getMarket("QA").vat.standardRate).toBe(0);
    expect(marketEngine.getMarket("XX")).toBeNull();
    const unknownVat = marketEngine.getVatContext({
      sellerCountry: "DE",
      buyerCountry: "XX",
      customerType: "B2C",
    });
    expect(unknownVat.ok).toBe(false);
    expect(unknownVat.invented).toBe(false);
    expect(unknownVat.vatLive).toBe(false);
    expect(unknownVat.reason).toBe("UNKNOWN_MARKET");
  });

  it("quotes stay language-independent and refuse FX invention", () => {
    const fx = software.pricing.quoteForMarket({
      market: "PL",
      currency: "PLN",
      supplierCost: 10,
      shippingCost: 2,
      returnReserve: 0.4,
      marketplaceCommissionRate: 0.12,
    });
    expect(fx.ok).toBe(false);
    expect(fx.reason).toBe("MARKET_FX_UNSUPPORTED");
    expect(fx.conversionInvented).toBe(false);
    expect(fx.languageIndependentFromMarket).toBe(true);

    const deTr = software.pricing.quoteForMarket({
      market: "DE",
      locale: "tr",
      supplierCost: 10,
      shippingCost: 2,
      returnReserve: 0.4,
      marketplaceCommissionRate: 0.12,
    });
    expect(deTr.ok).toBe(true);
    expect(deTr.languageIndependentFromMarket).toBe(true);
    expect(deTr.vatLive).toBe(false);
    expect(deTr.marketUndercut.implemented).toBe(false);
  });

  it("tax provider does not default unknown country or category to DE", () => {
    const tax = require("../lib/commerce/taxProvider");
    expect(tax.calculateTax({ country: "XX", subtotal: 100 }).code).toBe("tax_rate_unknown");
    expect(tax.calculateTax({ country: "DE", subtotal: 100, category: "tires" }).code).toBe("tax_category_rate_unknown");
    const health = tax.getProviderHealth();
    expect(health.live).toBe(false);
    expect(health.fiscalLive).toBe(false);
    expect(health.invented).toBe(false);
  });

  it("locale coverage does not invent copy or bind language to market", () => {
    const missing = software.localeCoverage.resolveMessage({
      locale: "ar",
      key: "nav.home",
      catalog: { de: "Start" },
    });
    expect(missing.invented).toBe(false);
    expect(missing.fallbackUsed).toBe(true);
    const none = software.localeCoverage.resolveMessage({
      locale: "ar",
      key: "nav.home",
      catalog: {},
    });
    expect(none.ok).toBe(false);
    expect(none.reason).toBe("TRANSLATION_MISSING");
    const bound = software.localeCoverage.bindLocaleToMarket({ locale: "tr", market: "DE" });
    expect(bound.rewritten).toBe(false);
    expect(bound.languageIndependentFromMarket).toBe(true);
    const legal = software.localeCoverage.legalCopyForMarket({ market: "FR" });
    expect(legal.reason).toBe("LEGAL_COPY_NOT_INVENTED");
    expect(legal.copy).toBeNull();
    const coverage = software.localeCoverage.measure();
    expect(coverage.inventedTranslations).toBe(false);
    expect(coverage.languageIndependentFromMarket).toBe(true);
  });

  it("classification-only channels stay unpublished with a safe interface", () => {
    for (const id of ["otto", "emag", "skroutz", "bol", "cdiscount"]) {
      const row = software.marketplace.classify(id);
      expect(row.classificationOnly).toBe(true);
      expect(row.published).toBe(false);
      expect(row.live).toBe(false);
      const published = software.marketplace.publishListing({ channel: id, sku: "SKU-1", price: 9 });
      expect(published.reason).toBe("PUBLISH_BLOCKED");
      expect(published.classificationOnly).toBe(true);
    }
    const amazon = software.marketplace.classify("amazon");
    expect(amazon.published).toBe(false);
    expect(amazon.live).toBe(false);
  });

  it("marketplace writes, confirms, webhooks, and live feeds stay blocked", () => {
    expect(software.marketplace.confirmPublished().reason).toBe("PUBLISH_CONFIRM_BLOCKED");
    expect(software.marketplace.inboundMarketplaceWebhook().httpAttempted).toBe(false);
    expect(software.marketplace.pushFeed({ channel: "amazon", products: [{ sku: "A", price: 1 }] }).pushed).toBe(
      false
    );
    expect(software.marketplace.approvePublish({ actor: "operator" }).reason).toBe("HUMAN_LISTING_APPROVAL_REQUIRED");
    expect(software.marketplace.activateDraft({ draftId: "smd_x" }).reason).toBe("LISTING_ACTIVATE_BLOCKED");
    const mapped = software.marketplace.mapCategory({ channel: "amazon", sourceCategory: "bremsen" });
    expect(mapped.mapped).toBe(false);
    expect(mapped.invented).toBe(false);
    const transformed = software.marketplace.transformListing({
      channel: "amazon",
      sku: "BR-1",
      price: 12,
      category: "bremsen",
    });
    expect(transformed.ok).toBe(true);
    expect(transformed.published).toBe(false);
    expect(transformed.live).toBe(false);
  });
});
