import { describe, it, expect } from "vitest";
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const require = createRequire(import.meta.url);
const {
  createAgriculturalMachineryEngine,
  createMockConnector,
  validateTaxonomy,
  createTaxonomy,
  COMPATIBILITY_STATES,
  isolation,
} = require("../lib/agriculturalMachinery");
const { createConstructionMachineryEngine } = require("../lib/constructionMachinery");
const { resolveMachineryDomain, DOMAINS, assertAgriculturalScope } = require("../lib/machineryDomainKit/isolation");
const { previewSalePrice, MIN_NET_PROFIT_EUR } = require("../lib/machineryDomainKit/pricingContract");
const { resolveRoutePermission, PUBLIC_ROUTES } = require("../lib/routePermissions");
const pricing = require("../lib/pricing");
const { expandTokens } = require("../lib/agriculturalMachinery/search");

async function loaded() {
  const engine = createAgriculturalMachineryEngine();
  const imported = await engine.importFrom("mock-ag-local");
  expect(imported.ok).toBe(true);
  return engine;
}

describe("agricultural taxonomy", () => {
  it("represents required families and stays on cat-20", () => {
    const taxonomy = createTaxonomy();
    expect(taxonomy.validation.ok).toBe(true);
    expect(taxonomy.shopCategoryId).toBe("cat-20");
    expect(taxonomy.get("ame-cat-tractors-utility")).toBeTruthy();
    expect(taxonomy.get("ame-cat-pto-shafts")).toBeTruthy();
    expect(taxonomy.get("ame-cat-nozzles")).toBeTruthy();
    expect(taxonomy.list().every((category) => category.id.startsWith("ame-cat-"))).toBe(true);
    expect(taxonomy.list().some((category) => category.id.startsWith("cme-cat-"))).toBe(false);
  });

  it("allows a new type without rewriting the engine", () => {
    const extra = {
      version: "1.0.1",
      shopCategoryId: "cat-20",
      categories: [
        ...createTaxonomy().document.categories,
        {
          id: "ame-cat-robot-weeder",
          parentId: "ame-cat-specialist",
          slug: "robot-weeders",
          names: { de: "Hackroboter", en: "Robot weeders" },
          synonyms: [],
          attributes: [],
          shopCategoryId: "cat-20",
        },
      ],
    };
    const result = validateTaxonomy(extra);
    expect(result.ok).toBe(true);
    const engine = createAgriculturalMachineryEngine({ taxonomy: createTaxonomy(extra) });
    expect(engine.taxonomy.get("ame-cat-robot-weeder")).toBeTruthy();
  });

  it("does not alter the shop tree", () => {
    const shop = JSON.parse(readFileSync(resolve("data/buzzard_categories.json"), "utf8"));
    const found = shop.categories.find((row) => row.id === "cat-20");
    expect(found.name).toMatch(/Landwirtschaft/);
  });
});

describe("category isolation", () => {
  it("maps shop L1 ids to isolated domains", () => {
    expect(resolveMachineryDomain({ categoryId: "cat-20-01" })).toBe(DOMAINS.AGRICULTURAL);
    expect(resolveMachineryDomain({ categoryId: "cat-55-01" })).toBe(DOMAINS.CONSTRUCTION);
    expect(resolveMachineryDomain({ categoryId: "cat-05-21" })).toBe(DOMAINS.AUTOMOTIVE);
    expect(resolveMachineryDomain({ categoryId: "cme-cat-excavators" })).toBe(DOMAINS.CONSTRUCTION);
    expect(assertAgriculturalScope({ categoryId: "cat-55" }).ok).toBe(false);
    expect(assertAgriculturalScope({ categoryId: "cat-05" }).ok).toBe(false);
  });

  it("refuses construction and automotive compatibility queries", async () => {
    const engine = await loaded();
    const construction = engine.evaluate({
      categoryId: "cme-cat-excavators",
      oemPartNumber: "OEM-AG-FLT-AIR-01",
      manufacturer: "AgriFixture",
      modelCode: "T-120",
    });
    expect(construction.rejectedDomain).toBe("construction");
    expect(construction.state).toBe(COMPATIBILITY_STATES.INSUFFICIENT_DATA);

    const automotive = engine.evaluate({
      categoryId: "cat-05",
      oemPartNumber: "34116761244",
      domain: "automotive",
    });
    expect(automotive.rejectedDomain).toBe("automotive");

    const search = engine.search({ q: "OEM-FX-HYD-1001", categoryId: "cme-cat-excavators" });
    expect(search.rejectedDomain).toBe("construction");
    expect(search.items).toEqual([]);
  });

  it("does not share catalog state with the construction engine", async () => {
    const agri = await loaded();
    const construction = createConstructionMachineryEngine();
    await construction.importFrom("mock-local");
    expect(agri.listParts().some((part) => String(part.oemPartNumber || "").includes("HYD-1001"))).toBe(false);
    expect(construction.listParts().some((part) => String(part.oemPartNumber || "").includes("FLT-AIR"))).toBe(false);
    expect(agri.health().isolation.constructionEngineUsed).toBe(false);
  });
});

describe("machine and part identity", () => {
  it("stores agricultural fields and rejects construction category ids", () => {
    const engine = createAgriculturalMachineryEngine();
    const machine = engine.upsertMachine({
      manufacturer: "AgriFixture",
      modelCode: "T-120",
      categoryId: "ame-cat-tractors-utility",
      ptoSpeed: "540",
      linkageCategory: "II",
      voltage: "12",
      sourceRecordId: "m1",
      providerId: "test",
    });
    expect(machine.ok).toBe(true);
    expect(machine.machine.domain).toBe("agricultural");
    expect(machine.machine.ptoSpeed).toBe("540");
    expect(engine.validateMachineInput({ manufacturer: "X", modelCode: "Y", categoryId: "cme-cat-excavators" }).ok).toBe(
      false
    );
    const part = engine.upsertPart({
      manufacturer: "AgriFixture",
      oemPartNumber: "OEM-AG-BLT-M16",
      thread: "M16x2",
      sourceRecordId: "p1",
      providerId: "test",
    });
    expect(part.ok).toBe(true);
    expect(part.part.thread).toBe("M16x2");
  });
});

describe("compatibility", () => {
  it("requires evidence and serial bounds for verified status", async () => {
    const engine = await loaded();
    const verified = engine.evaluate({
      oemPartNumber: "OEM-AG-FLT-AIR-01",
      manufacturer: "AgriFixture",
      modelCode: "T-120",
      serialNumber: "T120A00010",
      year: 2019,
      position: "engine-air",
      categoryId: "cat-20",
    });
    expect(verified.state).toBe(COMPATIBILITY_STATES.VERIFIED_COMPATIBLE);
    expect(verified.supportingEvidenceIds.length).toBeGreaterThan(0);

    const missingSerial = engine.evaluate({
      oemPartNumber: "OEM-AG-FLT-AIR-01",
      manufacturer: "AgriFixture",
      modelCode: "T-120",
      year: 2019,
      position: "engine-air",
      categoryId: "cat-20",
    });
    expect(missingSerial.state).toBe(COMPATIBILITY_STATES.INSUFFICIENT_DATA);

    const excluded = engine.evaluate({
      oemPartNumber: "OEM-AG-FLT-AIR-01",
      manufacturer: "AgriFixture",
      modelCode: "T-120",
      serialNumber: "T120B00010",
      year: 2025,
      categoryId: "cat-20",
    });
    expect(excluded.state).toBe(COMPATIBILITY_STATES.VERIFIED_INCOMPATIBLE);
  });

  it("detects PTO, thread and aftermarket states", async () => {
    const engine = await loaded();
    const ptoOk = engine.evaluate({
      oemPartNumber: "OEM-AG-PTO-540",
      manufacturer: "AgriFixture",
      modelCode: "T-120",
      ptoSpeed: "540",
      categoryId: "cat-20",
    });
    expect(ptoOk.state).toBe(COMPATIBILITY_STATES.VERIFIED_COMPATIBLE);

    const ptoBad = engine.evaluate({
      oemPartNumber: "OEM-AG-PTO-540",
      manufacturer: "AgriFixture",
      modelCode: "T-120",
      ptoSpeed: "1000",
      categoryId: "cat-20",
    });
    expect(ptoBad.state).toBe(COMPATIBILITY_STATES.VERIFIED_INCOMPATIBLE);
    expect(ptoBad.conflictingEvidence).toContain("pto_mismatch");

    const threadBad = engine.evaluate({
      oemPartNumber: "OEM-AG-BLT-M16",
      manufacturer: "AgriFixture",
      modelCode: "T-120",
      thread: "M12x1.75",
      hitch: "II",
      categoryId: "cat-20",
    });
    expect(threadBad.state).toBe(COMPATIBILITY_STATES.VERIFIED_INCOMPATIBLE);

    const alt = engine.evaluate({
      oemPartNumber: "AA-NOZ-11003",
      manufacturer: "AgriFixture",
      modelCode: "T-120",
      categoryId: "cat-20",
    });
    expect(alt.state).toBe(COMPATIBILITY_STATES.POSSIBLE_ALTERNATIVE);
  });

  it("records expert corrections in the audit trail", async () => {
    const engine = await loaded();
    const evidenceId = [...engine.store.evidence.keys()][0];
    const result = engine.correctEvidence({ evidenceId, actor: "expert@example.test", patch: { notes: "reviewed" } });
    expect(result.ok).toBe(true);
    expect(engine.store.audit.some((row) => row.action === "evidence.correct" && row.actor === "expert@example.test")).toBe(
      true
    );
  });
});

describe("search", () => {
  it("ranks exact OEM, expands synonyms, and does not verify alternatives", async () => {
    const engine = await loaded();
    const exact = engine.search({ q: "OEM-AG-FLT-AIR-01", categoryId: "cat-20" });
    expect(exact.items[0].matchKind).toBe("exact_oem");
    const synonym = engine.search({ q: "zapfwelle", categoryId: "cat-20" });
    expect(synonym.items.some((row) => row.oemPartNumber === "OEM-AG-PTO-540")).toBe(true);
    expect(expandTokens(["traktor"])).toContain("tractor");
    const alt = engine.search({ q: "AA-NOZ-11003", manufacturer: "AgriFixture", modelCode: "T-120", categoryId: "cat-20" });
    expect(alt.items[0].verifiedExactMatch).toBe(false);
    expect(engine.search({ q: "" }).items.length).toBeGreaterThan(0);
  });
});

describe("import and sourcing", () => {
  it("imports idempotently and handles partial plus timeout", async () => {
    const engine = await loaded();
    const second = await engine.importFrom("mock-ag-local");
    expect(second.job.imported).toBe(0);
    expect(second.job.didDeleteMissing).toBe(false);

    const { createRegistry } = require("../lib/agriculturalMachinery/catalog/registry");
    const isolated = createAgriculturalMachineryEngine({ registry: createRegistry({ registerDefaults: false }) });
    isolated.registry.register(createMockConnector({ failMode: "partial" }));
    const partial = await isolated.importFrom("mock-ag-local");
    expect(partial.job.status).toBe("PARTIAL");

    const timeout = createAgriculturalMachineryEngine({ registry: createRegistry({ registerDefaults: false }) });
    timeout.registry.register(createMockConnector());
    await timeout.importFrom("mock-ag-local");
    timeout.registry.register(createMockConnector({ failMode: "timeout" }));
    const failed = await timeout.importFrom("mock-ag-local");
    expect(failed.job.status).toBe("FAILED");
    expect(failed.job.errors[0].class).toBe("RETRYABLE");
  });

  it("keeps warehouse distinct and applies shared pricing plus EUR 0.50 floor", async () => {
    const engine = await loaded();
    const part = engine.findPartsByNumber("OEM-AG-FLT-AIR-01", "AgriFixture")[0];
    const ranked = engine.rankOffers({
      partId: part.id,
      manufacturer: "AgriFixture",
      modelCode: "T-120",
      serialNumber: "T120A00010",
      year: 2019,
      position: "engine-air",
    });
    expect(ranked.purchaseExecuted).toBe(false);
    expect(ranked.items.some((row) => row.inventory.trust === "STALE" && row.inventory.verifiedStock === false)).toBe(true);
    expect(ranked.items[0].warehouse.inferredFromSupplierCountry).toBe(false);
    const tiny = previewSalePrice({ supplierPrice: 1, markupPercent: 0, minimumMarginPercent: 0 });
    expect(tiny.netProfit).toBeGreaterThanOrEqual(MIN_NET_PROFIT_EUR);
    expect(pricing.calculateSalePrice({ supplierPrice: 100 }).amount).toBe(138);
  });
});

describe("authorization and safety", () => {
  it("protects admin import and leaves sales flags off", () => {
    expect(PUBLIC_ROUTES.has("GET /api/agricultural-machinery/search")).toBe(true);
    expect(resolveRoutePermission("POST", "/api/admin/agricultural-machinery/import")).toEqual({
      permission: "products.write",
    });
    expect(process.env.BUZZARD_SALES_ENABLED === "1").toBe(false);
    expect(process.env.BUZZARD_PRODUCT_SOT_ACTIVE === "1").toBe(false);
    expect(process.env.BUZZARD_LIVE_PAYMENTS === "1").toBe(false);
    expect(require("../lib/salesMode").isSalesEnabled()).toBe(false);
  });
});
