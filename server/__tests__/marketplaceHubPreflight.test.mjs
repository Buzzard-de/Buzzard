import { describe, expect, it } from "vitest";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { preflightListing } = require("../lib/marketplaceHub.js");

describe("marketplace hub preflight", () => {
  it("validates listing through connector sandbox", async () => {
    process.env.BUZZARD_SALES_ENABLED = "0";
    const row = preflightListing({
      marketplace: "amazon",
      productSku: "LIST-001",
      title: "Brake pad set",
      ean: "5901234123457",
      mpn: "P85073",
      imageLink: "https://cdn.test-supplier.example.de/p85073.jpg",
    });
    expect(row.ok).toBe(true);
    expect(row.live).toBe(false);
    const publish = await row.dryPublish;
    expect(publish.code).toBe("LIVE_CONNECTION_BLOCKED");
  });

  it("rejects unknown marketplace channel", () => {
    const row = preflightListing({ marketplace: "unknown_channel_xyz", productSku: "A", title: "Test title" });
    expect(row.ok).toBe(false);
    expect(row.code).toBe("CHANNEL_UNKNOWN");
  });
});