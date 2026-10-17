import { describe, it, expect } from "vitest";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { CLASSIFICATION_ONLY_IDS, MARKETPLACE_CHANNELS } = require("../lib/software/marketplaceChannels.js");
const marketplace = require("../lib/software/marketplace.js");
const marketplaceHub = require("../lib/marketplaceHub.js");

describe("marketplace classification-only channels", () => {
  it("lists OTTO, eMAG, Skroutz, bol.com, and Cdiscount as classification-only", () => {
    expect(CLASSIFICATION_ONLY_IDS).toEqual(expect.arrayContaining(["otto", "emag", "skroutz", "bol", "cdiscount"]));
    for (const id of ["otto", "emag", "skroutz", "bol", "cdiscount"]) {
      const row = marketplace.classify(id);
      expect(row.classificationOnly).toBe(true);
      expect(row.adapterExists).toBe(false);
      expect(row.live).toBe(false);
      expect(row.published).toBe(false);
      expect(row.blocked).toBe(true);
      const published = marketplace.publishListing({ channel: id, sku: "SKU-CLASS", price: 1 });
      expect(published.ok).toBe(false);
      expect(published.reason).toBe("PUBLISH_BLOCKED");
      expect(published.listingId).toBeNull();
    }
  });

  it("keeps hub channel list aligned with the software classification list", () => {
    const hubIds = marketplaceHub.CHANNELS.map((row) => row[0]).sort();
    const softwareIds = MARKETPLACE_CHANNELS.map((row) => row.id).sort();
    expect(hubIds).toEqual(softwareIds);
    expect(marketplaceHub.CHANNELS.length).toBe(MARKETPLACE_CHANNELS.length);
  });

  it("blocks hub enablement and sync queues while sales are off", () => {
    const enable = marketplaceHub.updateMarketplace("amazon", { enabled: true });
    expect(enable.error).toBe("marketplace_mutations_disabled");
    expect(enable.status).toBe(409);
    expect(enable.live).toBe(false);

    const stock = marketplaceHub.queueStockSync();
    expect(stock.error).toBe("marketplace_mutations_disabled");
    expect(stock.queued).toBe(0);

    const webhook = marketplaceHub.importOrderWebhook({
      marketplace: "amazon",
      externalOrderId: "ext-blocked",
    });
    expect(webhook.error).toBe("marketplace_mutations_disabled");
  });
});
