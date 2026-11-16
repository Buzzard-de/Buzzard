import { createRequire } from "node:module";
import { describe, expect, it } from "vitest";

const require = createRequire(import.meta.url);
const { validateEan } = require("../lib/productValidator.js");
const { ApiSupplierAdapter } = require("../lib/supplier/apiSupplierAdapter.js");
const { XmlSupplierAdapter } = require("../lib/supplier/xmlSupplierAdapter.js");
const { CsvSupplierAdapter } = require("../lib/supplier/csvSupplierAdapter.js");
const {
  COMMON_FEED_FIELDS,
  importSupplierFeed,
  runSupplierImportPipeline,
} = require("../lib/supplier/supplierImportPipeline.js");

function ean13(prefix12) {
  for (let digit = 0; digit < 10; digit += 1) {
    const candidate = `${prefix12}${digit}`;
    const result = validateEan(candidate);
    if (result.ok && !result.warning) return candidate;
  }
  throw new Error(`no checksum for ${prefix12}`);
}

const EAN_API = ean13("590123412345");
const EAN_XML = ean13("400638133393");
const EAN_CSV = ean13("871234567890");
const EAN_DUP = ean13("501234567890");

const IMAGE = ["https://cdn.test-supplier.example.de/p85073.jpg"];

function record(overrides = {}) {
  return {
    supplier_sku: "API-SKU-001",
    name: "Bremsbelag Set Vorderachse",
    ean_gtin: EAN_API,
    mpn: "P85073",
    brand: "ATE",
    supplier_category: "automotive/bremssystem",
    images: IMAGE,
    ...overrides,
  };
}

describe("supplier feed common format", () => {
  it("normalizes API, XML, and CSV rows to the same fields", () => {
    const api = new ApiSupplierAdapter().normalizeProduct(record());
    const xml = new XmlSupplierAdapter().normalizeProduct({
      sku: "XML-SKU-001",
      gtin: EAN_XML,
      mpn: "XML85073",
      brand: "ATE",
      title: "Bremsbelag XML",
      category: "automotive/bremssystem",
      images: IMAGE,
    });
    const csv = new CsvSupplierAdapter().normalizeProduct({
      sku: "CSV-SKU-001",
      ean: EAN_CSV,
      mpn: "CSV85073",
      brand: "ATE",
      title: "Bremsbelag CSV",
      category: "automotive/bremssystem",
      images: IMAGE,
    });

    for (const normalized of [api, xml, csv]) {
      for (const field of COMMON_FEED_FIELDS) expect(normalized).toHaveProperty(field);
      expect(normalized.category).toBe("automotive/bremssystem");
      expect(normalized.brand).toBe("ATE");
      expect(normalized.mpn).toBeTruthy();
      expect(normalized.gtin).toBeTruthy();
    }
    expect(api.supplierSku).toBe("API-SKU-001");
    expect(xml.supplierSku).toBe("XML-SKU-001");
    expect(csv.supplierSku).toBe("CSV-SKU-001");
  });
});

describe("dry catalog import", () => {
  it("binds a valid row from each format and leaves price, stock, and PIM untouched", async () => {
    const feeds = [
      ["api", "api-supplier-dry", new ApiSupplierAdapter().normalizeProduct(record())],
      ["xml", "xml-supplier-dry", new XmlSupplierAdapter().normalizeProduct({
        sku: "XML-SKU-001",
        gtin: EAN_XML,
        mpn: "XML85073",
        brand: "ATE",
        title: "Bremsbelag XML",
        category: "automotive/bremssystem",
        images: IMAGE,
      })],
      ["csv", "csv-supplier-dry", new CsvSupplierAdapter().normalizeProduct({
        sku: "CSV-SKU-001",
        ean: EAN_CSV,
        mpn: "CSV85073",
        brand: "ATE",
        title: "Bremsbelag CSV",
        category: "automotive/bremssystem",
        images: IMAGE,
      })],
    ];

    for (const [format, supplierId, normalized] of feeds) {
      const result = await runSupplierImportPipeline(supplierId, { format, records: [normalized] });
      expect(result.dryRun).toBe(true);
      expect(result.live).toBe(false);
      expect(result.pimWrite).toBe(false);
      expect(result.priceUpdated).toBe(false);
      expect(result.stockUpdated).toBe(false);
      expect(result.catalog).toHaveLength(1);
      expect(result.rejected).toHaveLength(0);
      expect(result.duplicates).toHaveLength(0);
      expect(result.catalog[0].catalog).toMatchObject({
        sku: normalized.supplierSku,
        ean: normalized.gtin,
        gtin: normalized.gtin,
        mpn: normalized.mpn,
        brand: "ATE",
        supplierId,
        activeCategoryId: "cat-05",
        supplierCategory: "automotive/bremssystem",
        publicProductCreated: false,
        published: false,
        pimWrite: false,
      });
      expect(result.stages.find((stage) => stage.stage === "pim_staging").pimWrite).toBe(false);
    }
  });

  it("reports retired, hub, ambiguous, unknown, and unmapped rows separately", () => {
    const result = importSupplierFeed({
      supplierId: "api-supplier-dry",
      format: "api",
      records: [
        record({ supplier_sku: "RET-SKU-001", ean_gtin: EAN_API, supplier_category: "cat-25" }),
        record({ supplier_sku: "HUB-SKU-001", ean_gtin: EAN_XML, supplier_category: "cat-54" }),
        record({ supplier_sku: "AMB-SKU-001", ean_gtin: EAN_CSV, supplier_category: "bz.12" }),
        record({ supplier_sku: "UNK-SKU-001", ean_gtin: EAN_DUP, supplier_category: "cat-99" }),
        record({ supplier_sku: "BAD-SKU-001", ean_gtin: ean13("400000000000"), supplier_category: "automotive/brakes" }),
      ],
    });

    expect(result.catalog).toHaveLength(0);
    expect(result.rejected.map((row) => row.code)).toEqual([
      "CATEGORY_RETIRED",
      "CATEGORY_HUB",
      "CATEGORY_AMBIGUOUS",
      "CATEGORY_UNKNOWN",
      "CATEGORY_UNMAPPED",
    ]);
    expect(result.rejected.every((row) => row.catalog === null && row.merged === false && row.pimWrite === false)).toBe(true);
    expect(result.duplicates).toHaveLength(0);
  });

  it("flags a repeated SKU or EAN without merging the rows", () => {
    const seen = new Set();
    const first = importSupplierFeed({
      supplierId: "csv-supplier-dry",
      format: "csv",
      records: [record({ supplier_sku: "DUP-SKU-001", ean_gtin: EAN_DUP })],
      knownFingerprints: seen,
    });
    const second = importSupplierFeed({
      supplierId: "csv-supplier-dry",
      format: "csv",
      records: [
        record({ supplier_sku: "DUP-SKU-001", ean_gtin: ean13("422222222222"), mpn: "P85074" }),
        record({ supplier_sku: "DUP-SKU-002", ean_gtin: EAN_DUP, mpn: "P85075" }),
      ],
      knownFingerprints: seen,
    });

    expect(first.catalog).toHaveLength(1);
    expect(first.catalog[0].catalog.sku).toBe("DUP-SKU-001");
    expect(first.catalog[0].catalog.ean).toBe(EAN_DUP);
    expect(second.catalog).toHaveLength(0);
    expect(second.duplicates.map((row) => row.matchType)).toEqual(["sku", "ean"]);
    expect(second.duplicates.every((row) => row.merged === false && row.catalog === null)).toBe(true);
    expect(first.catalog[0].catalog.mpn).toBe("P85073");
  });

  it("does not load the database module", () => {
    expect(require.cache[require.resolve("../lib/db.js")]).toBeUndefined();
  });
});
