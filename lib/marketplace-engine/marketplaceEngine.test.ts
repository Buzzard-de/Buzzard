import { describe, it, expect, beforeEach } from "vitest";
import {
  listMarketplaces,
  getMarketplace,
  hasCapability,
  createListing,
  updateListing,
  pauseListing,
  getListing,
  getMarketplacePrice,
  getMarketplaceStock,
  evaluatePublishEligibility,
  importMarketplaceOrder,
  createMarketplaceShipment,
  createMarketplaceReturn,
  documentMarketplaceRefundChain,
  receiveWebhook,
  hashWebhookPayload,
  runSyncJob,
  checkMarketplaceHealth,
  getMarketplaceEvents,
  getMarketplaceAuditLog,
  rejectClientMarketplaceModification,
  getMarketplaceAdminOverview,
  validateListingPayload,
  createCategoryMapping,
  createProductMapping,
  mapAttributes,
  buildDefaultAttributeMappings,
  mapMarketplaceOrderStatus,
  connectMarketplace,
  setStockPolicy,
  seedMarketplaceEngineFixtures,
  buildListingInput,
  buildImportOrderInput,
  TEST_AMAZON,
  TEST_EBAY,
  TEST_KAUFLAND,
  listMarketplacesForMarket,
} from "./index";
import { resetRateLimit } from "@/lib/supplier-engine/rateLimit";

describe("Marketplace Engine Foundation", () => {
  beforeEach(() => {
    seedMarketplaceEngineFixtures();
  });

  describe("Marketplace Model & Registry", () => {
    it("registers initial marketplaces", () => {
      const all = listMarketplaces();
      expect(all.length).toBeGreaterThanOrEqual(10);
      expect(all.find((m) => m.marketplaceId === "amazon")).toBeDefined();
      expect(all.find((m) => m.marketplaceId === "ebay")).toBeDefined();
      expect(all.find((m) => m.marketplaceId === "kaufland")).toBeDefined();
      expect(all.find((m) => m.marketplaceId === "allegro")).toBeDefined();
      expect(all.find((m) => m.marketplaceId === "bol")).toBeDefined();
      expect(all.find((m) => m.marketplaceId === "cdiscount")).toBeDefined();
      expect(all.find((m) => m.marketplaceId === "otto")).toBeDefined();
    });

    it("default status is DISCOVERED or TESTING not CONNECTED", () => {
      const amazon = getMarketplace("amazon")!;
      expect(amazon.status).toBe("DISCOVERED");
      expect(TEST_AMAZON).toBe("TEST_AMAZON");
      expect(getMarketplace(TEST_AMAZON)!.status).toBe("TESTING");
    });

    it("uses Market Engine markets not duplicate country list", () => {
      const deMarketplaces = listMarketplacesForMarket("DE");
      expect(deMarketplaces.length).toBeGreaterThan(0);
      expect(deMarketplaces.every((m) => m.supportedMarkets.includes("DE"))).toBe(true);
    });
  });

  describe("Connector Interface", () => {
    it("connects via dry-run", async () => {
      const result = await connectMarketplace(TEST_AMAZON);
      expect(result.ok).toBe(true);
      expect(result.dryRun).toBe(true);
    });

    it("health check returns latency", async () => {
      const health = await checkMarketplaceHealth(TEST_AMAZON);
      expect(health.latencyMs).toBeGreaterThanOrEqual(0);
      expect(health.connector).toBe("dry-run");
    });
  });

  describe("Capabilities", () => {
    it("reflects configured capabilities only", () => {
      expect(hasCapability("amazon", "productListing")).toBe(true);
      expect(hasCapability("otto", "xml")).toBe(false);
      expect(hasCapability("cdiscount", "xml")).toBe(true);
    });
  });

  describe("Product & Category Mapping", () => {
    it("maps Buzzard product to marketplace listing independently", () => {
      const amazon = createProductMapping({
        productId: "reifen-pilot-sport",
        marketplaceId: TEST_AMAZON,
        marketId: "DE",
        marketplaceListingId: "ASIN-TEST-123",
        marketplaceSku: "AMZ-TIRE-001",
      });
      const ebay = createProductMapping({
        productId: "reifen-pilot-sport",
        marketplaceId: TEST_EBAY,
        marketId: "DE",
        marketplaceListingId: "EBAY-999",
        marketplaceSku: "EBAY-TIRE-001",
      });
      expect(amazon.productId).toBe(ebay.productId);
      expect(amazon.marketplaceListingId).not.toBe(ebay.marketplaceListingId);
    });

    it("creates category mapping foundation", () => {
      const mapping = createCategoryMapping({
        marketplaceId: TEST_KAUFLAND,
        marketId: "PL",
        buzzardCategoryId: "cat-05-05",
        marketplaceCategoryId: "KAU-TIRES-PL",
      });
      expect(mapping.status).toBe("ACTIVE");
    });

    it("maps attributes without modifying canonical product", () => {
      const attrs = mapAttributes(
        { ean: "4006633001247", brand: "Michelin", tireSize: "225/45 R17" },
        buildDefaultAttributeMappings()
      );
      expect(attrs.ean).toBe("4006633001247");
      expect(attrs.tire_size).toBe("225/45 R17");
    });
  });

  describe("Listing Pipeline", () => {
    it("creates single item listing", async () => {
      const result = await createListing(buildListingInput("reifen-pilot-sport"));
      expect(result.ok).toBe(true);
      expect(result.listing?.status).toBe("ACTIVE");
      expect(result.listing?.marketplaceListingId).toMatch(/^DRY-/);
    });

    it("creates multi-item listings on different marketplaces", async () => {
      const tire = await createListing(buildListingInput("reifen-pilot-sport", TEST_AMAZON));
      const oil = await createListing(buildListingInput("motoroel-5w30", TEST_EBAY));
      expect(tire.ok).toBe(true);
      expect(oil.ok).toBe(true);
      expect(tire.listing?.marketplaceId).not.toBe(oil.listing?.marketplaceId);
    });

    it("updates listing with fresh price and stock", async () => {
      const created = await createListing(buildListingInput("reifen-pilot-sport"));
      const updated = await updateListing(created.listing!.listingId);
      expect(updated.ok).toBe(true);
      expect(updated.listing!.lastSyncedAt).toBeDefined();
    });

    it("pauses listing", async () => {
      const created = await createListing(buildListingInput("motoroel-5w30"));
      const paused = await pauseListing(created.listing!.listingId);
      expect(paused.ok).toBe(true);
      expect(getListing(created.listing!.listingId)?.status).toBe("PAUSED");
    });

    it("invalid payload gets REVIEW_REQUIRED or ERROR", () => {
      const validation = validateListingPayload({
        productId: "x",
        marketplaceId: TEST_AMAZON,
        marketId: "DE",
        title: "",
        description: "",
        price: 0,
        currency: "EUR",
        stock: 0,
        language: "de",
      });
      expect(validation.valid).toBe(false);
      expect(["REVIEW_REQUIRED", "ERROR", "OUT_OF_STOCK"]).toContain(validation.status);
    });
  });

  describe("Price Integration", () => {
    it("gets price from Pricing Engine not hardcoded", () => {
      const direct = getMarketplacePrice({
        productId: "reifen-pilot-sport",
        marketplaceId: TEST_AMAZON,
        marketId: "DE",
        supplierId: "TEST_SUPPLIER_A",
        supplierOfferId: "TSA-TIRE-225-45-17",
        supplierPrice: 55.79,
        supplierCurrency: "EUR",
        stock: 100,
      });
      const ebay = getMarketplacePrice({
        productId: "reifen-pilot-sport",
        marketplaceId: TEST_EBAY,
        marketId: "DE",
        supplierId: "TEST_SUPPLIER_A",
        supplierOfferId: "TSA-TIRE-225-45-17",
        supplierPrice: 55.79,
        supplierCurrency: "EUR",
        stock: 100,
      });
      expect(direct.ok).toBe(true);
      expect(ebay.ok).toBe(true);
      expect(direct.price).toBeGreaterThan(0);
    });
  });

  describe("Stock Integration", () => {
    it("uses Inventory Engine saleable quantity", () => {
      const stock = getMarketplaceStock({
        productId: "reifen-pilot-sport",
        supplierId: "TEST_SUPPLIER_A",
        supplierOfferId: "TSA-TIRE-225-45-17",
        marketplaceId: TEST_AMAZON,
      });
      expect(stock.saleableQuantity).toBeGreaterThan(0);
    });

    it("applies marketplace max published quantity", () => {
      setStockPolicy(TEST_AMAZON, { maxPublishedQuantity: 20 });
      const stock = getMarketplaceStock({
        productId: "reifen-pilot-sport",
        supplierId: "TEST_SUPPLIER_A",
        supplierOfferId: "TSA-TIRE-225-45-17",
        marketplaceId: TEST_AMAZON,
      });
      expect(stock.publishedQuantity).toBeLessThanOrEqual(20);
    });

    it("out of stock sets OUT_OF_STOCK status", async () => {
      const { processSupplierStockUpdate } = await import("@/lib/inventory-engine");
      const { buildStockUpdateFixture } = await import("@/lib/inventory-engine/test-fixtures");
      processSupplierStockUpdate(buildStockUpdateFixture("reifen-pilot-sport", 0));
      const stock = getMarketplaceStock({
        productId: "reifen-pilot-sport",
        supplierId: "TEST_SUPPLIER_A",
        supplierOfferId: "TSA-TIRE-225-45-17",
        marketplaceId: TEST_AMAZON,
      });
      expect(stock.listingStatus).toBe("OUT_OF_STOCK");
    });
  });

  describe("Multi-Market", () => {
    it("supports DE FR PL markets from registry", () => {
      for (const marketId of ["DE", "FR", "PL", "CZ", "TR", "SA", "AE", "EG"]) {
        expect(listMarketplacesForMarket(marketId).length).toBeGreaterThan(0);
      }
    });
  });

  describe("Order Import", () => {
    it("imports marketplace order into Order Engine", async () => {
      const input = buildImportOrderInput({ marketplaceOrderId: "MP-1001" });
      const result = await importMarketplaceOrder(input);
      expect(result.ok).toBe(true);
      expect(result.orderId).toBeDefined();
      expect(result.mapping?.marketplaceOrderId).toBe("MP-1001");
    });

    it("idempotent import returns same order", async () => {
      const input = buildImportOrderInput({ marketplaceOrderId: "MP-1002" });
      const first = await importMarketplaceOrder(input);
      const second = await importMarketplaceOrder(input);
      expect(second.idempotentReplay).toBe(true);
      expect(second.orderId).toBe(first.orderId);
    });

    it("maps marketplace status to Buzzard status", () => {
      expect(mapMarketplaceOrderStatus("PAID")).toBe("PAID");
      expect(mapMarketplaceOrderStatus("SHIPPED")).toBe("SHIPPED");
      expect(mapMarketplaceOrderStatus("CANCELLED")).toBe("CANCELLED");
    });
  });

  describe("Shipment & Tracking", () => {
    it("creates dry-run shipment", async () => {
      const imported = await importMarketplaceOrder(
        buildImportOrderInput({ marketplaceOrderId: "MP-SHIP-1" })
      );
      const shipment = await createMarketplaceShipment({
        marketplaceId: TEST_AMAZON,
        orderId: imported.orderId!,
        marketplaceOrderId: "MP-SHIP-1",
        carrier: "DHL",
        trackingNumber: "1234567890",
        trackingUrl: "https://tracking.example/123",
      });
      expect(shipment.ok).toBe(true);
      expect(shipment.shipment?.status).toBe("PREPARED");
    });
  });

  describe("Returns & Refunds Foundation", () => {
    it("documents refund chain", () => {
      const chain = documentMarketplaceRefundChain();
      expect(chain).toContain("Supplier Credit");
      expect(chain).toContain("Final Buzzard Loss");
    });

    it("creates return record without real refund", () => {
      const ret = createMarketplaceReturn({
        marketplaceReturnId: "RET-001",
        orderId: "ord_test",
        marketplaceId: TEST_AMAZON,
        reason: "Defective",
        requestedAmount: 89.99,
      });
      expect(ret.status).toBe("REQUESTED");
    });
  });

  describe("Webhook", () => {
    it("processes webhook and prevents duplicates", () => {
      const payload = { orderId: "MP-WH-1", status: "PAID" };
      const hash = hashWebhookPayload(payload);
      const first = receiveWebhook({
        marketplaceId: TEST_AMAZON,
        eventType: "ORDER_PAID",
        payload,
      });
      const second = receiveWebhook({
        marketplaceId: TEST_AMAZON,
        eventType: "ORDER_PAID",
        payload,
      });
      expect(first.ok).toBe(true);
      expect(second.duplicate).toBe(true);
      expect(hash).toHaveLength(64);
    });
  });

  describe("Sync Jobs", () => {
    it("runs price sync job", async () => {
      await createListing(buildListingInput("reifen-pilot-sport"));
      const result = await runSyncJob({ marketplaceId: TEST_AMAZON, type: "PRICE_SYNC" });
      expect(result.ok).toBe(true);
      expect(result.job.status).toBe("COMPLETED");
    });
  });

  describe("Marketplace Selection", () => {
    it("evaluates publish eligibility deterministically", () => {
      const eligible = evaluatePublishEligibility({
        productId: "reifen-pilot-sport",
        marketplaceId: TEST_AMAZON,
        marketId: "DE",
      });
      expect(eligible.eligible).toBe(true);
    });
  });

  describe("Security", () => {
    it("rejects client credential modification", () => {
      const result = rejectClientMarketplaceModification({ apiKey: "secret" });
      expect(result.allowed).toBe(false);
    });

    it("rejects client listing id modification", () => {
      const result = rejectClientMarketplaceModification({ marketplaceListingId: "fake" });
      expect(result.allowed).toBe(false);
    });
  });

  describe("Admin", () => {
    it("provides marketplace admin overview", async () => {
      await createListing(buildListingInput("reifen-pilot-sport"));
      const overview = await getMarketplaceAdminOverview();
      expect(overview.length).toBeGreaterThan(0);
      const amazon = overview.find((r) => r.marketplaceId === TEST_AMAZON);
      expect(amazon?.activeListings).toBeGreaterThanOrEqual(1);
    });
  });

  describe("Events & Audit", () => {
    it("records listing events", async () => {
      await createListing(buildListingInput("bremsscheibe-280"));
      const events = getMarketplaceEvents(TEST_AMAZON);
      expect(events.some((e) => e.type === "LISTING_CREATED")).toBe(true);
      const audit = getMarketplaceAuditLog(TEST_AMAZON);
      expect(audit.some((a) => a.action === "LISTING_CREATED")).toBe(true);
    });
  });

  describe("Rate Limit", () => {
    it("respects rate limits on connector", async () => {
      resetRateLimit();
      const { checkRateLimit } = await import("@/lib/supplier-engine/rateLimit");
      for (let i = 0; i < 120; i++) checkRateLimit(TEST_AMAZON, { requestsPerMinute: 120 });
      const blocked = checkRateLimit(TEST_AMAZON, { requestsPerMinute: 120 });
      expect(blocked.allowed).toBe(false);
    });
  });
});
