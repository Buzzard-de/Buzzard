import { describe, it, expect, beforeEach } from "vitest";
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const require = createRequire(import.meta.url);
const {
  createConstructionMachineryEngine,
  createMockConnector,
  assertConnectorContract,
  validateTaxonomy,
  loadTaxonomyDocument,
  COMPATIBILITY_STATES,
  CONNECTOR_STATUS,
} = require("../lib/constructionMachinery");
const pricing = require("../lib/pricing");
const { resolveRoutePermission, PUBLIC_ROUTES } = require("../lib/routePermissions");
const { convertUnit } = require("../lib/constructionMachinery/units");
const { normalizePartNumber } = require("../lib/constructionMachinery/identifiers");
const {
  assertSafeRemoteUrl,
  stripXmlDoctype,
  rejectFormula,
  assertPayloadSize,
} = require("../lib/constructionMachinery/catalog/security");
const { createStubConnector } = require("../lib/constructionMachinery/catalog/stubConnectors");

function engineWithMock() {
  return createConstructionMachineryEngine();
}

describe("construction machinery taxonomy", () => {
  it("validates parent-child relationships and rejects cycles", () => {
    const document = loadTaxonomyDocument();
    const ok = validateTaxonomy(document);
    expect(ok.ok).toBe(true);
    expect(ok.count).toBeGreaterThanOrEqual(32);
  });

  it("detects circular and duplicate categories", () => {
    const result = validateTaxonomy({
      shopCategoryId: "cat-55",
      categories: [
        { id: "cme-cat-a", parentId: "cme-cat-b", slug: "a", names: { de: "A", en: "A" } },
        { id: "cme-cat-b", parentId: "cme-cat-a", slug: "b", names: { de: "B", en: "B" } },
        { id: "cme-cat-a", parentId: null, slug: "a2", names: { de: "A2", en: "A2" } },
      ],
    });
    expect(result.ok).toBe(false);
    expect(result.issues.some((issue) => issue.code === "circular")).toBe(true);
    expect(result.issues.some((issue) => issue.code === "duplicate_id")).toBe(true);
  });

  it("does not replace the shop tree cat-55", () => {
    const shop = JSON.parse(readFileSync(resolve("data/buzzard_categories.json"), "utf8"));
    const found = (shop.categories || []).find((row) => row.id === "cat-55");
    expect(found?.name).toMatch(/Baumaschinen/);
  });
});

describe("identifiers and units", () => {
  it("normalizes part numbers conservatively and keeps originals", () => {
    const result = normalizePartNumber("oem-fx-hyd-1001", "FixtureWorks");
    expect(result.original).toBe("oem-fx-hyd-1001");
    expect(result.normalized).toBe("OEMFXHYD1001");
    expect(result.valid).toBe(true);
  });

  it("rejects formula-like part numbers", () => {
    expect(normalizePartNumber("=CMD", "FixtureWorks").valid).toBe(false);
  });

  it("converts compatible units and refuses incompatible families", () => {
    const mm = convertUnit(2, "inch", "mm");
    expect(mm.ok).toBe(true);
    expect(mm.value).toBeCloseTo(50.8);
    const bad = convertUnit(2, "kg", "mm");
    expect(bad.ok).toBe(false);
    expect(bad.error).toBe("incompatible_units");
  });
});

describe("machine and part identity", () => {
  it("represents a machine and rejects incomplete identity", () => {
    const engine = engineWithMock();
    const created = engine.upsertMachine({
      manufacturer: "FixtureWorks",
      modelCode: "FX-220",
      categoryId: "cme-cat-crawler-excavators",
      sourceRecordId: "m1",
      providerId: "test",
    });
    expect(created.ok).toBe(true);
    expect(created.machine.id).toMatch(/^cme-machine-/);
    const invalid = engine.validateMachineInput({ manufacturer: "", modelName: "" });
    expect(invalid.ok).toBe(false);
  });

  it("does not merge two parts with similar descriptions", () => {
    const engine = engineWithMock();
    const a = engine.upsertPart({
      manufacturer: "FixtureWorks",
      oemPartNumber: "OEM-A",
      description: "Seal kit",
      sourceRecordId: "p-a",
      providerId: "test",
    });
    const b = engine.upsertPart({
      manufacturer: "FixtureWorks",
      oemPartNumber: "OEM-B",
      description: "Seal kit",
      sourceRecordId: "p-b",
      providerId: "test",
    });
    expect(a.part.id).not.toBe(b.part.id);
    expect(engine.listParts()).toHaveLength(2);
  });
});

describe("compatibility engine", () => {
  async function loaded() {
    const engine = engineWithMock();
    const imported = await engine.importFrom("mock-local");
    expect(imported.ok).toBe(true);
    return engine;
  }

  it("requires authorized evidence for VERIFIED_COMPATIBLE", async () => {
    const engine = await loaded();
    const decision = engine.evaluate({
      oemPartNumber: "OEM-FX-HYD-1001",
      manufacturer: "FixtureWorks",
      modelCode: "FX-220",
      serialNumber: "FX220A00010",
      year: 2020,
      position: "main-pump",
    });
    expect(decision.state).toBe(COMPATIBILITY_STATES.VERIFIED_COMPATIBLE);
    expect(decision.supportingEvidenceIds.length).toBeGreaterThan(0);
    expect(decision.aiSoleAuthority).toBe(false);
  });

  it("is CONDITIONALLY_COMPATIBLE when approved evidence exists but position is omitted", async () => {
    const engine = await loaded();
    const decision = engine.evaluate({
      oemPartNumber: "OEM-FX-HYD-1001",
      manufacturer: "FixtureWorks",
      modelCode: "FX-220",
      serialNumber: "FX220A00010",
      year: 2020,
    });
    expect(decision.state).toBe(COMPATIBILITY_STATES.CONDITIONALLY_COMPATIBLE);
  });

  it("returns INSUFFICIENT_DATA when serial is required but missing", async () => {
    const engine = await loaded();
    const decision = engine.evaluate({
      oemPartNumber: "OEM-FX-HYD-1001",
      manufacturer: "FixtureWorks",
      modelCode: "FX-220",
      year: 2020,
      position: "main-pump",
    });
    expect(decision.state).toBe(COMPATIBILITY_STATES.INSUFFICIENT_DATA);
    expect(decision.missingInformation).toContain("serial_required");
  });

  it("honors serial-number exclusion for revision B", async () => {
    const engine = await loaded();
    const decision = engine.evaluate({
      oemPartNumber: "OEM-FX-HYD-1001",
      manufacturer: "FixtureWorks",
      modelCode: "FX-220",
      serialNumber: "FX220B00010",
      year: 2025,
      position: "main-pump",
    });
    expect(decision.state).toBe(COMPATIBILITY_STATES.VERIFIED_INCOMPATIBLE);
  });

  it("does not treat technical similarity as verified", () => {
    const engine = engineWithMock();
    const part = engine.upsertPart({
      manufacturer: "FixtureWorks",
      oemPartNumber: "SIM-1",
      sourceRecordId: "sim",
      providerId: "test",
    });
    engine.addEvidence({
      partId: part.part.id,
      type: "technical_similarity",
      manufacturer: "FixtureWorks",
      modelCode: "FX-220",
    });
    const decision = engine.evaluate({
      partId: part.part.id,
      manufacturer: "FixtureWorks",
      modelCode: "FX-220",
    });
    expect(decision.state).toBe(COMPATIBILITY_STATES.INSUFFICIENT_DATA);
  });

  it("keeps supersession as POSSIBLE_ALTERNATIVE not verified OEM", async () => {
    const engine = await loaded();
    const decision = engine.evaluate({
      oemPartNumber: "AF-FLT-200",
      manufacturer: "FixtureWorks",
      modelCode: "FX-220",
    });
    expect(decision.state).toBe(COMPATIBILITY_STATES.POSSIBLE_ALTERNATIVE);
  });

  it("returns INSUFFICIENT_DATA for unknown machines and wrong OEM", async () => {
    const engine = await loaded();
    expect(engine.evaluate({ machineId: "missing", oemPartNumber: "OEM-FX-HYD-1001" }).missingInformation).toContain(
      "unknown_machine"
    );
    expect(engine.evaluate({ oemPartNumber: "NO-SUCH", manufacturer: "FixtureWorks", modelCode: "FX-220" }).state).toBe(
      COMPATIBILITY_STATES.INSUFFICIENT_DATA
    );
  });
});

describe("catalog import", () => {
  it("imports the mock catalog and is idempotent", async () => {
    const engine = engineWithMock();
    const first = await engine.importFrom("mock-local");
    const partsAfterFirst = engine.listParts().length;
    const second = await engine.importFrom("mock-local");
    expect(first.job.status).toBe("SUCCEEDED");
    expect(second.job.status).toBe("SUCCEEDED");
    expect(engine.listParts().length).toBe(partsAfterFirst);
    expect(second.job.imported).toBe(0);
    expect(second.job.didDeleteMissing).toBe(false);
  });

  it("handles partial validation failure without dropping valid rows", async () => {
    const engine = createConstructionMachineryEngine({
      registry: require("../lib/constructionMachinery/catalog/registry").createRegistry({ registerDefaults: false }),
    });
    engine.registry.register(createMockConnector({ failMode: "partial" }));
    const job = await engine.importFrom("mock-local");
    expect(job.job.status).toBe("PARTIAL");
    expect(engine.listParts().length).toBeGreaterThan(0);
    expect(job.job.rejected).toBeGreaterThan(0);
  });

  it("classifies provider timeout as retryable and keeps catalog intact", async () => {
    const { createRegistry } = require("../lib/constructionMachinery/catalog/registry");
    const isolated = createConstructionMachineryEngine({
      registry: createRegistry({ registerDefaults: false }),
    });
    isolated.registry.register(createMockConnector());
    await isolated.importFrom("mock-local");
    const before = isolated.listParts().length;
    isolated.registry.register(createMockConnector({ failMode: "timeout" }));
    const failed = await isolated.importFrom("mock-local");
    expect(failed.job.status).toBe("FAILED");
    expect(failed.job.errors[0].class).toBe("RETRYABLE");
    expect(isolated.listParts().length).toBe(before);
  });

  it("records conflicts instead of silent overwrite of OEM numbers", () => {
    const engine = engineWithMock();
    engine.upsertPart({
      manufacturer: "FixtureWorks",
      oemPartNumber: "OEM-1",
      sourceRecordId: "same",
      providerId: "src-a",
    });
    engine.upsertPart({
      manufacturer: "FixtureWorks",
      oemPartNumber: "OEM-2",
      sourceRecordId: "same",
      providerId: "src-a",
    });
    expect(engine.store.conflicts.size).toBeGreaterThan(0);
  });

  it("rejects malicious import payloads", () => {
    expect(rejectFormula("=1+1").ok).toBe(false);
    expect(stripXmlDoctype("<!DOCTYPE x [<!ENTITY x SYSTEM 'file:///etc/passwd'>]>").ok).toBe(false);
    expect(assertSafeRemoteUrl("http://127.0.0.1/secret").ok).toBe(false);
    expect(assertSafeRemoteUrl("https://example.com/feed.xml").ok).toBe(true);
    expect(assertPayloadSize("x".repeat(3 * 1024 * 1024)).ok).toBe(false);
  });
});

describe("search ranking", () => {
  it("ranks exact OEM above alternatives and does not mark alternatives as exact", async () => {
    const engine = engineWithMock();
    await engine.importFrom("mock-local");
    const exact = engine.search({ q: "OEM-FX-HYD-1001" });
    expect(exact.items[0].matchKind).toBe("exact_oem");
    expect(exact.items[0].verifiedExactMatch).toBe(true);
    const alt = engine.search({ q: "AF-FLT-200", manufacturer: "FixtureWorks", modelCode: "FX-220" });
    const firstAlt = alt.items[0];
    expect(firstAlt.compatibility?.state).toBe(COMPATIBILITY_STATES.POSSIBLE_ALTERNATIVE);
    expect(firstAlt.verifiedExactMatch).toBe(false);
    const mixed = engine.search({ q: "seal", manufacturer: "FixtureWorks", modelCode: "FX-220" });
    const possible = mixed.items.find((row) => row.compatibility?.state === COMPATIBILITY_STATES.POSSIBLE_ALTERNATIVE);
    if (possible) expect(possible.verifiedExactMatch).toBe(false);
  });
});

describe("sourcing and pricing reuse", () => {
  it("keeps supplier HQ distinct from warehouse and marks stale stock", async () => {
    const engine = engineWithMock();
    await engine.importFrom("mock-local");
    const part = engine.findPartsByNumber("OEM-FX-HYD-1001", "FixtureWorks")[0];
    const ranked = engine.rankOffers({
      partId: part.id,
      manufacturer: "FixtureWorks",
      modelCode: "FX-220",
      serialNumber: "FX220A00010",
      year: 2020,
      position: "main-pump",
    });
    expect(ranked.pricingEngine).toBe("server/lib/pricing.js");
    expect(ranked.purchaseExecuted).toBe(false);
    const stale = ranked.items.find((row) => row.offerId && row.inventory.trust === "STALE");
    expect(stale.inventory.verifiedStock).toBe(false);
    const fresh = ranked.items.find((row) => row.warehouse.location?.city === "Leipzig");
    expect(fresh.warehouse.inferredFromSupplierCountry).toBe(false);
    expect(fresh.factors.marketUndercutApplied).toBe(false);
    const expected = pricing.calculateSalePrice({ supplierPrice: 84.5 });
    expect(fresh.factors.salePreview.amount).toBe(expected.amount);
    expect(fresh.score).toBeGreaterThan(stale.score);
  });
});

describe("connector contracts", () => {
  it("allows a new mock provider without changing core search", async () => {
    const extra = createMockConnector();
    extra.id = "mock-second";
    extra.name = "Second mock";
    const engine = engineWithMock();
    expect(assertConnectorContract(extra).ok).toBe(true);
    engine.registry.register(extra);
    const ids = engine.registry.list().map((row) => row.id);
    expect(ids).toContain("mock-local");
    expect(ids).toContain("mock-second");
    const stub = createStubConnector("REST");
    expect(stub.status).toBe(CONNECTOR_STATUS.NOT_CONFIGURED);
    const health = await stub.healthCheck();
    expect(health.liveCalls).toBe(false);
  });
});

describe("authorization and regression safety", () => {
  it("protects admin import and keeps search public", () => {
    expect(PUBLIC_ROUTES.has("GET /api/construction-machinery/search")).toBe(true);
    expect(resolveRoutePermission("POST", "/api/admin/construction-machinery/import")).toEqual({
      permission: "products.write",
    });
    expect(resolveRoutePermission("GET", "/api/admin/construction-machinery/overview")).toEqual({
      permission: "products.read",
    });
  });

  it("does not change sales, SoT, or payment flags", () => {
    expect(process.env.BUZZARD_SALES_ENABLED === "1").toBe(false);
    expect(process.env.BUZZARD_LIVE_PAYMENTS === "1").toBe(false);
    const sales = require("../lib/salesMode");
    expect(sales.isSalesEnabled()).toBe(false);
    const source = readFileSync(resolve("server/lib/constructionMachinery/engine.js"), "utf8");
    expect(source).not.toMatch(/BUZZARD_SALES_ENABLED\s*=/);
  });

  it("existing pricing helpers remain unchanged", () => {
    expect(pricing.calculateSalePrice({ supplierPrice: 100 }).amount).toBe(138);
    expect(pricing.meetsMinimumMargin({ salePrice: 114, purchasePrice: 100 })).toBe(true);
  });
});

describe("performance (small fixture, not production-scale)", () => {
  it("measures exact, filtered, compatibility, and import on fixture size", async () => {
    const engine = engineWithMock();
    const t0 = Date.now();
    await engine.importFrom("mock-local");
    const importMs = Date.now() - t0;
    const t1 = Date.now();
    engine.search({ q: "OEM-FX-HYD-1001" });
    const exactMs = Date.now() - t1;
    const t2 = Date.now();
    engine.search({ q: "hydraulic", categoryId: "cme-cat-crawler-excavators" });
    const filteredMs = Date.now() - t2;
    const t3 = Date.now();
    engine.evaluate({
      oemPartNumber: "OEM-FX-HYD-1001",
      manufacturer: "FixtureWorks",
      modelCode: "FX-220",
      serialNumber: "FX220A00010",
      year: 2020,
      position: "main-pump",
    });
    const compatMs = Date.now() - t3;
    expect(importMs).toBeLessThan(2000);
    expect(exactMs).toBeLessThan(200);
    expect(filteredMs).toBeLessThan(200);
    expect(compatMs).toBeLessThan(200);
    // values are recorded for the report; this is a 2-machine fixture
    expect(engine.listParts().length).toBeLessThan(20);
  });
});
