import { describe, it, expect, afterEach } from "vitest";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

describe("local search index honesty", () => {
  afterEach(() => {
    delete process.env.BUZZARD_OPENSEARCH_URL;
    delete process.env.BUZZARD_OPENSEARCH_ENABLED;
  });

  it("reports sql serving and never claims live OpenSearch by default", () => {
    const productSearch = require("../lib/commerce/productSearchAbstraction.js");
    const software = require("../lib/software");
    expect(productSearch.getBackend()).toBe("sql");
    const health = productSearch.getSearchHealth();
    expect(health.liveOpenSearch).toBe(false);
    expect(health.servingBackend).toBe("sql");
    expect(health.opensearchStubActive).toBe(false);
    expect(health.invented).toBe(false);
    const local = software.getLocalSearchIndexStatus();
    expect(local.liveOpenSearch).toBe(false);
    expect(local.opensearchDeployed).toBe(false);
    expect(local.mode).toBe("local_catalog_filter");
  });

  it("uses the OpenSearch stub as a SQL fallback when the env flags are set", () => {
    process.env.BUZZARD_OPENSEARCH_URL = "https://opensearch.example.invalid";
    process.env.BUZZARD_OPENSEARCH_ENABLED = "1";
    const productSearch = require("../lib/commerce/productSearchAbstraction.js");
    expect(productSearch.getBackend()).toBe("opensearch");
    const health = productSearch.getSearchHealth();
    expect(health.liveOpenSearch).toBe(false);
    expect(health.opensearchStubActive).toBe(true);
    expect(health.servingBackend).toBe("sql_fallback");
    const result = productSearch.searchProducts({ q: "brake", publicOnly: true });
    expect(result.backend).toBe("opensearch_stub");
    expect(result.fallbackUsed).toBe(true);
  });

  it("filters provided catalog rows without inventing fitment", () => {
    const software = require("../lib/software");
    const search = software.searchCatalog(
      [
        { sku: "BRK-1", title: "Bremse", category: "auto" },
        { sku: "GRD-1", title: "Schlauch", category: "garden" },
      ],
      { q: "bremse", category: "auto" }
    );
    expect(search.items).toHaveLength(1);
    expect(search.invented).toBe(false);
    expect(search.fitmentClaimed).toBe(false);
    expect(search.source).toBe("provided_rows");
  });
});
