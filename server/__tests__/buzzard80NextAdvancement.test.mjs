import { describe, it, expect, afterEach } from "vitest";
import { createRequire } from "node:module";
import os from "node:os";
import path from "node:path";

const require = createRequire(import.meta.url);

describe("Buzzard 80 next advancement — local only", () => {
  const prevUrl = process.env.BUZZARD_OPENSEARCH_URL;
  const prevEn = process.env.BUZZARD_OPENSEARCH_ENABLED;

  afterEach(() => {
    if (prevUrl === undefined) delete process.env.BUZZARD_OPENSEARCH_URL;
    else process.env.BUZZARD_OPENSEARCH_URL = prevUrl;
    if (prevEn === undefined) delete process.env.BUZZARD_OPENSEARCH_ENABLED;
    else process.env.BUZZARD_OPENSEARCH_ENABLED = prevEn;
  });

  it("OpenSearch env does not make search live", () => {
    process.env.BUZZARD_OPENSEARCH_URL = "https://example.invalid";
    process.env.BUZZARD_OPENSEARCH_ENABLED = "1";
    const software = require("../lib/software");
    const { getSearchHealth } = require("../lib/commerce/productSearchAbstraction");
    const health = getSearchHealth();
    const status = software.getLocalSearchIndexStatus();
    expect(health.liveOpenSearch).toBe(false);
    expect(health.servingBackend).toBe("sql_fallback");
    expect(status.liveOpenSearch).toBe(false);
    expect(status.servingBackend).toBe("sql_fallback");
    const filtered = software.searchCatalog(
      [{ sku: "A1", title: "Bremse" }, { sku: "B2", title: "Filter" }],
      { q: "bremse" }
    );
    expect(filtered.invented).toBe(false);
    expect(filtered.fitmentClaimed).toBe(false);
    expect(filtered.total).toBe(1);
  });

  it("Amazon/eBay stay unpublished and listing transform is not a publish", () => {
    const software = require("../lib/software");
    const amazon = software.marketplace.classify("amazon");
    const ebay = software.marketplace.classify("ebay");
    expect(amazon.published).toBe(false);
    expect(ebay.published).toBe(false);
    expect(amazon.live).toBe(false);
    expect(ebay.liveVerified).toBe(false);
    const transformed = software.marketplace.transformListing({
      channel: "ebay",
      sku: "EB-80",
      price: 9.5,
    });
    expect(transformed.published).toBe(false);
    expect(software.marketplace.publishListing({ channel: "amazon", sku: "A", price: 1 }).reason).toBe("PUBLISH_BLOCKED");
  });

  it("local ops pack keeps sales/SoT off and refuses /tmp as source", () => {
    const software = require("../lib/software");
    const pack = software.operationsPack.runLocalOperationsPack({
      dbPath: path.join(process.cwd(), "server", "data", "buzzard.db"),
    });
    expect(pack.salesLocked).toBe(true);
    expect(pack.productSourceOfTruthActive).toBe(false);
    expect(pack.productionRestoreBlocked).toBe(true);
    expect(pack.productionVerified).toBe(false);
    expect(pack.providers.live).toBe(0);
    expect(pack.backupRestore.ephemeralScratch === true || pack.backupRestore.ok === true).toBe(true);
    const refused = software.operationsPack.runLocalOperationsPack({
      dbPath: path.join(os.tmpdir(), "buzzard-not-durable.db"),
    });
    expect(refused.backupRestore.status).toBe("EPHEMERAL_SOURCE_REFUSED");
    expect(refused.sourceEphemeral).toBe(true);
  });

  it("message send stays blocked and locale coverage does not invent translations", () => {
    const software = require("../lib/software");
    const db = require("../lib/db").db;
    software.initialize(db);
    const drafted = software.communications.draft(db, { message: "Sipariş nerede?", customerId: "c-80" });
    expect(drafted.sent).toBe(false);
    expect(drafted.locale).toBe("tr");
    const sent = software.communications.sendPrepared(db, drafted.draft.id);
    expect(sent.sent).toBe(false);
    expect(sent.blocked).toBe(true);
    expect(sent.live).toBe(false);
    const locales = software.localeCoverage.measure();
    expect(locales.inventedTranslations).toBe(false);
    expect(locales.liveVerified).toBe(false);
    expect(locales.localeCount).toBeGreaterThanOrEqual(30);
    expect(locales.rtlPreserved).toBe(true);
  });
});
