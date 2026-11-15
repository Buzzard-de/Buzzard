import { describe, expect, it } from "vitest";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const gate = require("../lib/pim/catalogPublishGate.js");
const publish = require("../lib/pim/productCatalogPublish.js");

const ready = {
  sku: "BZ-LOCAL-1",
  marketplace: "storefront",
  country: "DE",
  category: "tools",
  productVerified: true,
  priceVerified: true,
  price: 10,
  stockVerified: true,
  stock: 4,
  image: "local-image",
  imageVerified: true,
  marketplaceAuthorized: true,
  published: true,
  sellable: true,
  live: true,
  translations: { de: "Hammer", en: "Hammer" },
};

describe("catalog publish stays closed", () => {
  it("does not publish missing product, price, stock, or image facts", () => {
    const blocked = gate.planCatalogPublish({
      sku: "BZ-GAP",
      marketplace: "storefront",
      country: "DE",
      price: 19,
      stock: 8,
      published: true,
      sellable: true,
    });
    expect(blocked.code).toBe("PRODUCT_UNVERIFIED");
    expect(blocked.published).toBe(false);
    expect(blocked.sellable).toBe(false);
    expect(blocked.price).toBeNull();
    expect(blocked.stock).toBeNull();
    expect(blocked.productionReady).toBe(false);
    expect(blocked.liveMarketplace).toBe(false);
    expect(blocked.reasons).toEqual(expect.arrayContaining([
      "CATEGORY_UNVERIFIED",
      "PRICE_UNVERIFIED",
      "STOCK_UNVERIFIED",
      "IMAGE_UNVERIFIED",
      "SALES_CLOSED",
    ]));
  });

  it("marks missing translations and keeps an out-of-scope country unpublished", () => {
    const content = gate.planCatalogPublish({
      ...ready,
      idempotencyKey: "content-1",
      translations: { de: "Hammer" },
    });
    expect(content.code).toBe("TRANSLATION_MISSING");
    expect(content.missingTranslations).toEqual(["en"]);
    expect(content.translationsComplete).toBe(false);
    expect(content.published).toBe(false);

    const abroad = gate.planCatalogPublish({ ...ready, idempotencyKey: "us-1", country: "US" });
    expect(abroad.code).toBe("COUNTRY_OUT_OF_SCOPE");
    expect(abroad.countryScope).toBe("OUT_OF_SCOPE");
    expect(abroad.published).toBe(false);

    const greece = gate.planCatalogPublish({ ...ready, idempotencyKey: "gr-1", country: "GR" });
    expect(greece.country).toBe("EL");
    expect(greece.countryScope).toBe("IN_SCOPE");
    expect(greece.code).toBe("MARKETPLACE_NOT_AUTHORIZED");
    expect(greece.sellable).toBe(false);
    expect(greece.price).toBeNull();
    expect(greece.stock).toBeNull();
  });

  it("rejects a repeated plan, a synthetic listing, and a failed retry", () => {
    const first = gate.planCatalogPublish({ ...ready, idempotencyKey: "dup-1" });
    const second = gate.planCatalogPublish({ ...ready, idempotencyKey: "dup-1", published: true });
    expect(first.code).toBe("MARKETPLACE_NOT_AUTHORIZED");
    expect(first.published).toBe(false);
    expect(first.sellable).toBe(false);
    expect(first.productionReady).toBe(false);
    expect(second.code).toBe("DUPLICATE_PUBLISH");
    expect(second.duplicate).toBe(true);
    expect(second.published).toBe(false);
    expect(second.attempts).toBe(1);

    const synthetic = gate.planCatalogPublish({ ...ready, idempotencyKey: "mock-1", synthetic: true, live: true });
    expect(synthetic.code).toBe("MOCK_NOT_A_PUBLISH");
    expect(synthetic.live).toBe(false);
    expect(synthetic.liveMarketplace).toBe(false);
    expect(synthetic.published).toBe(false);

    const failed = gate.planCatalogPublish({ ...ready, idempotencyKey: "fail-1", timeout: true });
    expect(failed.code).toBe("TIMEOUT");
    expect(failed.status).toBe("FAILED");
    expect(failed.attempts).toBe(1);
    expect(failed.published).toBe(false);
    const again = gate.planCatalogPublish({ ...ready, idempotencyKey: "fail-1", timeout: true });
    expect(again.code).toBe("DUPLICATE_PUBLISH");
    const retried = gate.retryCatalogPublish("fail-1");
    expect(retried.code).toBe("TIMEOUT");
    expect(retried.status).toBe("FAILED");
    expect(retried.attempts).toBe(2);
    expect(retried.published).toBe(false);
    expect(retried.sellable).toBe(false);
    expect(gate.retryCatalogPublish("missing-publish").code).toBe("RETRY_UNKNOWN");

    const demo = publish.publishProduct("BZ-CORE-DEMO-001");
    const dry = publish.publishDryRun("BZ-CORE-DEMO-001");
    const closed = publish.publishProduct("BZ-LOCAL-1");
    expect(demo.success).toBe(false);
    expect(demo.status).toBe("SKIPPED_DEMO");
    expect(dry.wouldPublish).toBe(false);
    expect(dry.salesWouldChange).toBe(false);
    expect(closed.code).toBe("SALES_CLOSED");
    expect(closed.published).toBe(false);
    expect(closed.sellable).toBe(false);
    expect(closed.productionReady).toBe(false);
  });
});
