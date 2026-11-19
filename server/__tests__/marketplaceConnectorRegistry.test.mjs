import { describe, expect, it } from "vitest";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { createConnector, listConnectors, snapshot } = require("../lib/marketplace/marketplaceConnectorRegistry.js");

describe("marketplace connector registry", () => {
  it("lists ten sandbox channels with live blocked", () => {
    expect(listConnectors().length).toBe(10);
    expect(snapshot().anyLive).toBe(false);
    expect(snapshot().allBlocked).toBe(true);
  });

  it("refuses publish without credentials", async () => {
    process.env.BUZZARD_SALES_ENABLED = "0";
    const amazon = createConnector("amazon");
    const result = await amazon.publishListing({
      sku: "LIST-AMZ",
      title: "Brake pad",
      gtin: "5901234123457",
      mpn: "P85073",
      image_link: "https://cdn.test-supplier.example.de/p85073.jpg",
    });
    expect(result.ok).toBe(false);
    expect(result.code).toBe("LIVE_CONNECTION_BLOCKED");
    expect(result.live).toBe(false);
  });
});