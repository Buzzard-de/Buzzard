import { describe, it, expect } from "vitest";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

describe("product and catalog infrastructure — established fail-closed", () => {
  it("keeps SoT inactive, sales off, and dual-write forbidden", () => {
    const software = require("../lib/software");
    const inspect = software.catalogIntegrity.inspect();
    expect(inspect.productSourceOfTruthActive).toBe(false);
    expect(inspect.writeBoundaryActive).toBe(false);
    expect(inspect.dualWrite).toBe(false);
    expect(inspect.salesEnabled).toBe(false);
    expect(inspect.candidateActivated).toBe(false);
    expect(inspect.liveVerified).toBe(false);
    const refused = software.catalogIntegrity.refuseDualWrite();
    expect(refused.ok).toBe(true);
    expect(refused.thrown).toBe(true);
    expect(refused.dualWrite).toBe(false);
  });

  it("matches only exact sku/ean and never invents a merge", () => {
    const { catalogIntegrity } = require("../lib/software");
    expect(
      catalogIntegrity.matchProducts({ sku: "BRK-1", ean: "4006633001237" }, { sku: "brk-1" }).matched
    ).toBe(true);
    expect(
      catalogIntegrity.matchProducts({ ean: "4006633001237" }, { gtin: "4006633001237" }).key
    ).toBe("ean");
    const titleOnly = catalogIntegrity.matchProducts(
      { sku: "A", title: "Bremse" },
      { sku: "B", title: "Bremse" },
      { mergeByTitle: true }
    );
    expect(titleOnly.matched).toBe(false);
    expect(titleOnly.reason).toBe("INVENTED_MERGE_BLOCKED");
    expect(catalogIntegrity.skuUniqueness([{ sku: "A" }, { sku: "a" }]).ok).toBe(false);
    expect(catalogIntegrity.skuUniqueness([{ sku: "A" }, { sku: "B" }]).globalSot).toBe(false);
    const variant = catalogIntegrity.variantsLocal({ parentSku: "BRK-1", sku: "BRK-1-RED" });
    expect(variant.secondMaster).toBe(false);
    expect(variant.ok).toBe(true);
  });

  it("blocks invented live prices/images, live OpenSearch, live catalog, and live import", () => {
    const software = require("../lib/software");
    expect(software.catalogIntegrity.inventLivePrice().reason).toBe("INVENTED_LIVE_PRICE_BLOCKED");
    expect(software.catalogIntegrity.inventLiveImage().reason).toBe("INVENTED_LIVE_IMAGE_BLOCKED");
    expect(software.catalogIntegrity.confirmLiveOpenSearch().liveOpenSearch).toBe(false);
    expect(software.getLocalSearchIndexStatus().liveOpenSearch).toBe(false);
    expect(software.catalogIntegrity.confirmLiveCatalog().reason).toBe("LIVE_CATALOG_NOT_PROVEN");
    expect(software.catalogIntegrity.importLive({ forceLive: true }).reason).toBe("LIVE_IMPORT_BLOCKED");
    const dry = software.catalogIntegrity.importDryRun([{ sku: "DRY-1" }]);
    expect(dry.persist).toBe(false);
    expect(dry.dryRun).toBe(true);
  });

  it("reports taxonomy 53/50/48 honestly and does not invent translations", () => {
    const { catalogIntegrity } = require("../lib/software");
    const tax = catalogIntegrity.taxonomyHonesty();
    expect(tax.shopL1).toBe(53);
    expect(tax.customerFacingL1).toBe(50);
    expect(tax.masterLegacyL1).toBe(48);
    expect(tax.collapsedToOneCount).toBe(false);
    expect(tax.ok).toBe(true);
    const loc = catalogIntegrity.categoryLocalization();
    expect(loc.inventedTranslations).toBe(false);
    expect(loc.localesDocumented).toEqual(["de", "en", "tr", "ar"]);
    expect(loc.everySkuProven).toBe(false);
  });

  it("validates products and fail-closes customs without a legal claim", () => {
    const { catalogIntegrity } = require("../lib/software");
    const missing = catalogIntegrity.validateProduct({});
    expect(missing.ok).toBe(false);
    const valid = catalogIntegrity.validateProduct({
      sku: "VAL-1",
      name: "Bremse",
      supplier_id: "sup-1",
      supplier_sku: "s-1",
      status: "draft",
    });
    expect(valid.ok).toBe(true);
    expect(valid.legalClaim).toBe(false);
    const customs = catalogIntegrity.customsDecision({});
    expect(customs.ok).toBe(false);
    expect(customs.failClosed).toBe(true);
    expect(customs.legalClaim).toBe(false);
  });

  it("keeps PIM publish and SoT activation human-gated; SEO ACTIVE create rejected", () => {
    const software = require("../lib/software");
    const ai = software.catalogIntegrity.livePublish({ sku: "SKU-1", actorId: "pusat" });
    expect(ai.reason).toBe("SELF_APPROVE_DENIED");
    expect(ai.published).toBe(false);
    const human = software.catalogIntegrity.livePublish({ sku: "SKU-1", actorId: "operator", forceLive: true });
    expect(human.reason).toBe("HUMAN_PUBLISH_REQUIRED");
    const sot = software.catalogIntegrity.activateSot({ actor: "operator", forceActivate: true, envFlag: true });
    expect(sot.reason).toBe("HUMAN_SOT_ACTIVATION_REQUIRED");
    expect(sot.productSourceOfTruthActive).toBe(false);
    const seo = software.catalogIntegrity.seoCreatePolicy({ sku: "SEO-1", status: "ACTIVE" });
    expect(seo.activeCreateRejected).toBe(true);
    expect(software.catalogIntegrity.jsonStorePath().pathIsCanonicalSot).toBe(false);
    expect(software.catalogIntegrity.catalogHealth().live).toBe(false);
  });
});
