import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  buildInterCarsProfileSummary,
  buildDataQualityReport,
  normalizeB2bSandboxRecord,
  preprocessInterCarsProduct,
  preprocessInterCarsStock,
  preprocessInterCarsPrice,
  resolvePredefinedLiveProfile,
  runSupplierLiveOnboarding,
  summarizeIdentifierValidation,
  validateEan,
} from "./index";
import { resetSupplierEngineForTests } from "./testReset";

describe("Inter Cars adapter", () => {
  it("preprocesses IC catalog product fields", () => {
    const raw = preprocessInterCarsProduct({
      sku: "ADDFFF",
      index: "OP 520",
      tecDoc: "32.303",
      brand: "FILTRON",
      shortDescription: "Oil filter",
      eans: ["5904608005205"],
      genericArticleReferences: [{ genericArticleId: "GenericArticle_1280", primary: true }],
    });
    expect(raw.ean).toBe("5904608005205");
    expect(raw.mpn).toBe("OP 520");
    expect(raw.tecdocId).toBe("32.303");
    expect(raw.supplierCategory).toBe("GenericArticle_1280");
  });

  it("maps availability to stock per IC semantics", () => {
    const stock = preprocessInterCarsStock({ sku: "ADDFFF", availability: 5 });
    expect(stock.stock).toBe(5);
    expect(stock.stock_status).toBe("available");
  });

  it("uses customerPriceNet as supplier cost", () => {
    const price = preprocessInterCarsPrice(
      {
        sku: "ADDFFF",
        price: {
          currencyCode: "EUR",
          customerPriceNet: 12.5,
          listPriceNet: 15,
          vatPercentage: 19,
        },
      },
      "EUR"
    );
    expect(price.supplierPrice).toBe(12.5);
    expect((price.supplier_price as { includesVat?: boolean }).includesVat).toBe(false);
  });

  it("maps to Buzzard category when configured", () => {
    process.env.SUPPLIER_LIVE_PROFILE = "inter-cars";
    const profile = resolvePredefinedLiveProfile();
    expect(profile?.supplierId).toBe("SUP-INTER-CARS-001");
    const mapped = normalizeB2bSandboxRecord(
      {
        sku: "ADDFFF",
        index: "OP 520",
        brand: "FILTRON",
        shortDescription: "Oil filter",
        eans: ["5904608005205"],
        genericArticleReferences: [{ genericArticleId: "GenericArticle_1280" }],
      },
      profile!
    );
    expect(mapped.buzzardCategory).toBe("auto-sub-05--oil-filters");
    expect(mapped.fitment).toBe("UNKNOWN");
    delete process.env.SUPPLIER_LIVE_PROFILE;
  });

  it("builds profile summary without secrets", () => {
    process.env.SUPPLIER_LIVE_PROFILE = "inter-cars";
    const profile = resolvePredefinedLiveProfile()!;
    const summary = buildInterCarsProfileSummary(profile);
    expect(summary).not.toHaveProperty("secretsRef");
    expect(JSON.stringify(summary)).not.toContain("token");
    delete process.env.SUPPLIER_LIVE_PROFILE;
  });
});

describe("Identifier validation", () => {
  it("validates EAN format", () => {
    expect(validateEan("4006633001247")?.valid).toBe(true);
    expect(validateEan("invalid")?.valid).toBe(false);
  });

  it("does not invent missing identifiers", () => {
    const summary = summarizeIdentifierValidation([{ supplierSku: "SKU1" }]);
    expect(summary.invalidCount).toBe(0);
  });
});

describe("Live onboarding — skipped without credentials", () => {
  beforeEach(() => {
    resetSupplierEngineForTests();
    process.env.SUPPLIER_LIVE_PROFILE = "inter-cars";
    process.env.SUPPLIER_NETWORK_ENABLED = "0";
    process.env.SUPPLIER_LIVE_READ_ENABLED = "0";
    delete process.env.SUPPLIER_LIVE_CREDENTIALS;
  });

  afterEach(() => {
    delete process.env.SUPPLIER_LIVE_PROFILE;
  });

  it("reports SKIPPED without fake success", async () => {
    const report = await runSupplierLiveOnboarding();
    expect(report.source).toBe("SKIPPED");
    expect(report.connection.status).toBe("SKIPPED");
    expect(report.security.orderNetworkDisabled).toBe(true);
    expect(report.supplier.name).toBe("Inter Cars");
  });
});

describe("Data quality coverage metrics", () => {
  it("reports coverage percentages", () => {
    const report = buildDataQualityReport(
      [
        { supplierSku: "A1", ean: "4006633001247", gtin: "4006633001247", mpn: "MPN1", brand: "Bosch", buzzardCategory: "auto-sub-05--oil-filters", supplierPrice: 10, stock: 1, images: ["https://cdn.example/x.jpg"] },
        { supplierSku: "A2" },
      ],
      { automotive: true }
    );
    expect(report.eanCoverage).toBe(50);
    expect(report.skuCoverage).toBe(100);
    expect(report.tecDocCoverage).toBe(0);
  });
});
