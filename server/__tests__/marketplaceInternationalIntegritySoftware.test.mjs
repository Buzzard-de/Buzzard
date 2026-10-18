import { describe, it, expect } from "vitest";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

describe("marketplace and international infrastructure — established fail-closed", () => {
  it("keeps listings unpublished and classification-only channels blocked", () => {
    const { marketplaceInternationalIntegrity } = require("../lib/software");
    const inspect = marketplaceInternationalIntegrity.inspect();
    expect(inspect.salesEnabled).toBe(false);
    expect(inspect.anyPublished).toBe(false);
    expect(inspect.anyLiveListing).toBe(false);
    expect(inspect.liveVerified).toBe(false);
    expect(inspect.marketCount).toBe(35);
    expect(inspect.marketRegistryValid).toBe(true);
    expect(inspect.languageIndependentFromMarket).toBe(true);
    expect(inspect.inventedTranslations).toBe(false);
    expect(inspect.unpublished).toBe(true);
    for (const id of ["otto", "emag", "skroutz", "bol", "cdiscount"]) {
      const row = marketplaceInternationalIntegrity.classifyChannel(id);
      expect(row.classificationOnly).toBe(true);
      expect(row.published).toBe(false);
      expect(marketplaceInternationalIntegrity.publishListing({ channel: id, sku: "SKU-1", price: 9 }).reason).toBe(
        "PUBLISH_BLOCKED"
      );
    }
    expect(marketplaceInternationalIntegrity.activateDraft({ draftId: "smd_x" }).reason).toBe("LISTING_ACTIVATE_BLOCKED");
    expect(marketplaceInternationalIntegrity.pushFeed({ channel: "amazon", products: [{ sku: "A", price: 1 }] }).pushed).toBe(
      false
    );
    expect(marketplaceInternationalIntegrity.approvePublish({ actor: "pusat" }).reason).toBe("SELF_APPROVE_DENIED");
    expect(marketplaceInternationalIntegrity.approvePublish({ actor: "operator" }).reason).toBe(
      "HUMAN_LISTING_APPROVAL_REQUIRED"
    );
    const mapped = marketplaceInternationalIntegrity.mapCategory({ channel: "amazon", sourceCategory: "bremsen" });
    expect(mapped.mapped).toBe(false);
    expect(mapped.invented).toBe(false);
  });

  it("selects language without rewriting market, and country without rewriting language", () => {
    const { marketplaceInternationalIntegrity } = require("../lib/software");
    const language = marketplaceInternationalIntegrity.selectLanguage({ locale: "tr", market: "DE" });
    expect(language.ok).toBe(true);
    expect(language.locale).toBe("tr");
    expect(language.market).toBe("DE");
    expect(language.marketRewritten).toBe(false);
    expect(language.invented).toBe(false);
    expect(language.languageIndependentFromMarket).toBe(true);
    const missingLocale = marketplaceInternationalIntegrity.selectLanguage({ market: "DE" });
    expect(missingLocale.ok).toBe(false);
    expect(missingLocale.reason).toBe("LOCALE_REQUIRED");
    const country = marketplaceInternationalIntegrity.selectCountry({ locale: "tr", market: "DE" });
    expect(country.rewritten).toBe(false);
    expect(country.marketRewrittenLanguage).toBe(false);
    expect(country.languageIndependentFromMarket).toBe(true);
    expect(country.vatInvented).toBe(false);
    const copy = marketplaceInternationalIntegrity.resolveCopy({
      locale: "ar",
      key: "nav.home",
      catalog: {},
    });
    expect(copy.ok).toBe(false);
    expect(copy.invented).toBe(false);
    expect(copy.reason).toBe("TRANSLATION_MISSING");
    expect(marketplaceInternationalIntegrity.legalCopy({ market: "FR" }).reason).toBe("LEGAL_COPY_NOT_INVENTED");
  });

  it("keeps RTL honest and unknown VAT / FX fail-closed", () => {
    const { marketplaceInternationalIntegrity } = require("../lib/software");
    const ar = marketplaceInternationalIntegrity.rtlForLocale("ar");
    expect(ar.dir).toBe("rtl");
    expect(ar.rtlSupport).toBe(true);
    expect(ar.rtlStylesheet).toBe(true);
    expect(ar.logicalTextAlignStart).toBe(true);
    expect(ar.rightAlignHack).toBe(false);
    expect(ar.invented).toBe(false);
    const de = marketplaceInternationalIntegrity.rtlForLocale("de");
    expect(de.dir).toBe("ltr");
    const vat = marketplaceInternationalIntegrity.unknownVat({ country: "XX" });
    expect(vat.code).toBe("tax_rate_unknown");
    expect(vat.defaultedToDe).toBe(false);
    expect(vat.invented).toBe(false);
    const fx = marketplaceInternationalIntegrity.quoteForeignCurrency({ market: "PL", currency: "PLN" });
    expect(fx.ok).toBe(false);
    expect(fx.reason).toBe("MARKET_FX_UNSUPPORTED");
    expect(fx.conversionInvented).toBe(false);
  });
});
