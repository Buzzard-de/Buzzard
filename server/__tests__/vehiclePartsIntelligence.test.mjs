import { describe, it, expect } from "vitest";
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const require = createRequire(import.meta.url);
const {
  createVehiclePartsEngine,
  createMockConnector,
  validateTaxonomy,
  createTaxonomy,
  COMPATIBILITY_STATES,
  CROSS_REF_STATES,
  isolation,
  inspectVin,
  resetEngineForTests,
} = require("../lib/vehiclePartsIntelligence");
const { createAgriculturalMachineryEngine } = require("../lib/agriculturalMachinery");
const { createConstructionMachineryEngine } = require("../lib/constructionMachinery");
const {
  resolveMachineryDomain,
  DOMAINS,
  assertAutomotiveScope,
  assertAgriculturalScope,
  assertConstructionScope,
} = require("../lib/machineryDomainKit/isolation");
const { routeCompatibility, routeSearch } = require("../lib/machineryDomainKit/router");
const { previewSalePrice, MIN_NET_PROFIT_EUR } = require("../lib/machineryDomainKit/pricingContract");
const { resolveRoutePermission, PUBLIC_ROUTES } = require("../lib/routePermissions");
const { normalizeFitmentEntry } = require("../lib/pim/fitmentSchema");
const { expand } = require("../lib/vehiclePartsIntelligence/search");
const pricing = require("../lib/pricing");

async function loaded() {
  const engine = createVehiclePartsEngine();
  const imported = await engine.importFrom("mock-vpe-local");
  expect(imported.ok).toBe(true);
  return engine;
}

describe("vehicle taxonomy", () => {
  it("covers assemblies, small components, EV, commercial and motorcycle families on cat-05", () => {
    const taxonomy = createTaxonomy();
    expect(taxonomy.validation.ok).toBe(true);
    expect(taxonomy.shopCategoryId).toBe("cat-05");
    expect(taxonomy.get("vpe-cat-intake-valves")).toBeTruthy();
    expect(taxonomy.get("vpe-cat-piston-rings")).toBeTruthy();
    expect(taxonomy.get("vpe-cat-head-bolts")).toBeTruthy();
    expect(taxonomy.get("vpe-cat-brake-pads")).toBeTruthy();
    expect(taxonomy.get("vpe-cat-hv-cables")).toBeTruthy();
    expect(taxonomy.get("vpe-cat-air-brakes")).toBeTruthy();
    expect(taxonomy.get("vpe-cat-mc-engines")).toBeTruthy();
    expect(taxonomy.list().every((category) => category.id.startsWith("vpe-cat-"))).toBe(true);
    expect(taxonomy.list().some((category) => category.id.startsWith("ame-cat-"))).toBe(false);
  });

  it("extends without rewriting the engine", () => {
    const extra = {
      version: "1.0.1",
      shopCategoryId: "cat-05",
      categories: [
        ...createTaxonomy().document.categories,
        {
          id: "vpe-cat-hydrogen-tanks",
          parentId: "vpe-cat-ev-hybrid",
          slug: "hydrogen-tanks",
          names: { de: "Wasserstofftanks", en: "Hydrogen tanks" },
          synonyms: [],
          shopCategoryId: "cat-05",
        },
      ],
    };
    expect(validateTaxonomy(extra).ok).toBe(true);
    const engine = createVehiclePartsEngine({ taxonomy: createTaxonomy(extra) });
    expect(engine.taxonomy.get("vpe-cat-hydrogen-tanks")).toBeTruthy();
  });

  it("does not alter the shop tree", () => {
    const shop = JSON.parse(readFileSync(resolve("data/buzzard_categories.json"), "utf8"));
    const found = shop.categories.find((row) => row.id === "cat-05");
    expect(found.name).toMatch(/Automotive/);
  });
});

describe("domain isolation", () => {
  it("maps shop and engine ids to isolated domains", () => {
    expect(resolveMachineryDomain({ categoryId: "cat-05-21" })).toBe(DOMAINS.AUTOMOTIVE);
    expect(resolveMachineryDomain({ categoryId: "vpe-cat-brakes" })).toBe(DOMAINS.AUTOMOTIVE);
    expect(resolveMachineryDomain({ categoryId: "cat-54" })).toBe(DOMAINS.AUTOMOTIVE);
    expect(resolveMachineryDomain({ categoryId: "cat-20" })).toBe(DOMAINS.AGRICULTURAL);
    expect(resolveMachineryDomain({ categoryId: "cat-55" })).toBe(DOMAINS.CONSTRUCTION);
    expect(assertAutomotiveScope({ categoryId: "cat-20" }).ok).toBe(false);
    expect(assertAutomotiveScope({ categoryId: "cme-cat-excavators" }).ok).toBe(false);
    expect(assertAgriculturalScope({ categoryId: "cat-05" }).ok).toBe(false);
    expect(assertConstructionScope({ categoryId: "vpe-cat-brakes" }).ok).toBe(false);
  });

  it("refuses agricultural and construction compatibility queries", async () => {
    const engine = await loaded();
    const agri = engine.evaluate({
      categoryId: "ame-cat-tractors-utility",
      oemPartNumber: "1K0698151",
      manufacturer: "VW",
      model: "Golf",
    });
    expect(agri.rejectedDomain).toBe("agricultural");
    expect(agri.state).toBe(COMPATIBILITY_STATES.INSUFFICIENT_DATA);

    const construction = engine.evaluate({
      categoryId: "cme-cat-excavators",
      oemPartNumber: "1K0698151",
    });
    expect(construction.rejectedDomain).toBe("construction");
    expect(engine.search({ q: "1K0698151", categoryId: "ame-cat-pto-shafts" }).rejectedDomain).toBe("agricultural");
  });

  it("does not share catalog state with agri or construction engines", async () => {
    const vehicle = await loaded();
    const agri = createAgriculturalMachineryEngine();
    await agri.importFrom("mock-ag-local");
    const construction = createConstructionMachineryEngine();
    await construction.importFrom("mock-local");
    expect(vehicle.listParts().some((part) => String(part.oemPartNumber || "").includes("FLT-AIR"))).toBe(false);
    expect(agri.listParts().some((part) => String(part.oemPartNumber || "") === "1K0698151")).toBe(false);
    expect(construction.listParts().some((part) => String(part.oemPartNumber || "") === "1K0698151")).toBe(false);
    expect(vehicle.health().isolation.agriculturalEngineUsed).toBe(false);
    expect(vehicle.health().isolation.constructionEngineUsed).toBe(false);
  });

  it("routes passenger-car requests to automotive and keeps other domains out", async () => {
    const routed = resetEngineForTests();
    await routed.importFrom("mock-vpe-local");
    const auto = routeCompatibility({
      categoryId: "cat-05",
      oemPartNumber: "1K0698151",
      manufacturer: "VW",
      model: "Golf",
      generation: "VII",
      engineCode: "CZEA",
      year: 2016,
    });
    expect(auto.routedDomain).toBe("automotive");
    expect(auto.state).toBe(COMPATIBILITY_STATES.VERIFIED_COMPATIBLE);

    const agri = routeCompatibility({ categoryId: "cat-20", oemPartNumber: "1K0698151", manufacturer: "VW", model: "Golf" });
    expect(agri.routedDomain).toBe("agricultural");
    expect(agri.state).not.toBe(COMPATIBILITY_STATES.VERIFIED_COMPATIBLE);

    const construction = routeSearch({ q: "1K0698151", categoryId: "cat-55" });
    expect(construction.routedDomain).toBe("construction");
    expect(construction.items.every((row) => row.oemPartNumber !== "1K0698151")).toBe(true);

    const commercial = routeCompatibility({
      categoryId: "commercial",
      oemPartNumber: "MAN-AB-4400",
      manufacturer: "MAN",
      model: "TGS",
    });
    expect(commercial.routedDomain).toBe("automotive");
    expect(commercial.state).toBe(COMPATIBILITY_STATES.VERIFIED_COMPATIBLE);
  });
});

describe("vehicle identification", () => {
  it("stores configuration fields and rejects machinery category ids", () => {
    const engine = createVehiclePartsEngine();
    const vehicle = engine.upsertVehicle({
      manufacturer: "VW",
      model: "Golf",
      generation: "VII",
      engineCode: "CZEA",
      gearboxCode: "PGT",
      yearFrom: 2012,
      yearTo: 2020,
      vehicleClass: "passenger",
      sourceRecordId: "v1",
      providerId: "test",
    });
    expect(vehicle.ok).toBe(true);
    expect(vehicle.vehicle.engineCode).toBe("CZEA");
    expect(vehicle.vehicle.commercial).toBe(false);
    expect(engine.validateVehicleInput({ manufacturer: "X", model: "Y", categoryId: "ame-cat-tractors" }).ok).toBe(false);
    expect(engine.validateVehicleInput({ manufacturer: "X", model: "Y", categoryId: "cme-cat-excavators" }).ok).toBe(false);
    expect(engine.validateVehicleInput({ manufacturer: "X" }).ok).toBe(false);

    const truck = engine.upsertVehicle({
      manufacturer: "MAN",
      model: "TGS",
      vehicleClass: "truck",
      axleConfig: "6x2",
      cabVariant: "LX",
      sourceRecordId: "t1",
      providerId: "test",
    });
    expect(truck.vehicle.commercial).toBe(true);
    expect(truck.vehicle.axleConfig).toBe("6x2");
  });

  it("does not persist or echo a full VIN and does not treat the decoder as authority", () => {
    const engine = createVehiclePartsEngine();
    const vin = "WVWZZZ1KZAW123456";
    const vehicle = engine.upsertVehicle({
      manufacturer: "VW",
      model: "Golf",
      vin,
      sourceRecordId: "vin1",
      providerId: "test",
    });
    expect(vehicle.ok).toBe(true);
    expect(JSON.stringify(vehicle.vehicle)).not.toContain(vin);
    expect(vehicle.vehicle.vin.fullVinStored).toBeUndefined();
    expect(vehicle.vehicle.vin.wmi).toBe("WVW");
    expect(vehicle.vehicle.vin.last6).toBe("123456");
    const inspected = inspectVin(vin);
    expect(inspected.ok).toBe(true);
    expect(inspected.decoderAuthoritative).toBe(false);
    expect(inspected.derivedAttributes).toBe(null);
  });
});

describe("parts catalog and cross-reference", () => {
  it("represents OEM, aftermarket, small components and preserves OEM punctuation", async () => {
    const engine = await loaded();
    const valve = engine.findPartsByNumber("06A109601C", "VW")[0];
    expect(valve.quantityPerVehicle).toBe(8);
    expect(valve.assemblyId).toBe("vpe-cat-engine");
    const bolt = engine.findPartsByNumber("N  910 247 01", "VW")[0];
    expect(bolt.oemOriginalPreserved).toBe("N  910 247 01");
    expect(engine.findPartsByNumber("N91024700", "VW")[0].id).toBe(bolt.id);
    const hv = engine.findPartsByNumber("1EA971234", "VW")[0];
    expect(hv.hvWarning).toBe(true);
    expect(engine.upsertPart({ manufacturer: "VW", categoryId: "ame-cat-pto-shafts", oemPartNumber: "X" }).ok).toBe(false);
  });

  it("classifies OEM, aftermarket and supersession evidence", async () => {
    const engine = await loaded();
    expect(engine.classifyCrossReference({ partNumber: "1K0698151" }).state).toBe(CROSS_REF_STATES.EXACT_OEM_MATCH);
    const aftermarket = engine.classifyCrossReference({ partNumber: "1K0698151", manufacturer: "AfterAuto" });
    expect([CROSS_REF_STATES.EXACT_OEM_MATCH, CROSS_REF_STATES.VERIFIED_AFTERMARKET_EQUIVALENT, CROSS_REF_STATES.POSSIBLE_MATCH]).toContain(
      aftermarket.state
    );
    expect(engine.classifyCrossReference({ partNumber: "N91024700" }).state).toBe(
      CROSS_REF_STATES.VERIFIED_CROSS_REFERENCE
    );
    expect(engine.classifyCrossReference({ partNumber: "NO-SUCH-PART" }).state).toBe(CROSS_REF_STATES.NO_VERIFIED_MATCH);
    expect(
      engine.addPartRelation({ fromPartId: "a", toPartId: "b", kind: "APPROVED_ALTERNATIVE", similarNumbersOnly: true }).ok
    ).toBe(false);
  });
});

describe("compatibility", () => {
  it("requires engine configuration before verifying a Golf VII pad", async () => {
    const engine = await loaded();
    const verified = engine.evaluate({
      oemPartNumber: "1K0698151",
      manufacturer: "VW",
      model: "Golf",
      generation: "VII",
      engineCode: "CZEA",
      year: 2016,
      categoryId: "cat-05",
    });
    expect(verified.state).toBe(COMPATIBILITY_STATES.VERIFIED_COMPATIBLE);
    expect(verified.supportingEvidenceIds.length).toBeGreaterThan(0);
    expect(verified.aiSoleAuthority).toBe(false);

    const missingEngine = engine.evaluate({
      oemPartNumber: "1K0698151",
      manufacturer: "VW",
      model: "Golf",
      generation: "VII",
      year: 2016,
      categoryId: "cat-05",
    });
    expect(missingEngine.state).toBe(COMPATIBILITY_STATES.INSUFFICIENT_DATA);
    expect(missingEngine.missingInformation).toContain("engine_required");

    const excluded = engine.evaluate({
      oemPartNumber: "1K0698151",
      manufacturer: "VW",
      model: "Golf",
      generation: "VIII",
      engineCode: "CZEA",
      categoryId: "cat-05",
    });
    expect(excluded.state).toBe(COMPATIBILITY_STATES.VERIFIED_INCOMPATIBLE);

    const alt = engine.evaluate({
      oemPartNumber: "AA-PAD-G7",
      manufacturer: "VW",
      model: "Golf",
      generation: "VII",
      categoryId: "cat-05",
    });
    expect(alt.state).toBe(COMPATIBILITY_STATES.POSSIBLE_ALTERNATIVE);
  });

  it("marks unresolved generation as conditional and VIN as non-authoritative", async () => {
    const engine = await loaded();
    const conditional = engine.evaluate({
      oemPartNumber: "1K0698151",
      manufacturer: "VW",
      model: "Golf",
      engineCode: "CZEA",
      year: 2016,
      categoryId: "cat-05",
    });
    expect(conditional.state).toBe(COMPATIBILITY_STATES.CONDITIONALLY_COMPATIBLE);

    const withVin = engine.evaluate({
      oemPartNumber: "1K0698151",
      manufacturer: "VW",
      model: "Golf",
      generation: "VII",
      engineCode: "CZEA",
      year: 2016,
      vin: "WVWZZZ1KZAW123456",
      categoryId: "cat-05",
    });
    expect(withVin.vin.decoderAuthoritative).toBe(false);
    expect(withVin.vin.fullVinStored).toBe(false);
    expect(withVin.vin.fullVinLogged).toBe(false);
    expect(JSON.stringify(withVin)).not.toContain("WVWZZZ1KZAW123456");
  });

  it("records expert corrections", async () => {
    const engine = await loaded();
    const evidenceId = [...engine.store.evidence.keys()][0];
    const result = engine.correctEvidence({ evidenceId, actor: "expert@example.test", patch: { notes: "reviewed" } });
    expect(result.ok).toBe(true);
    expect(engine.store.audit.some((row) => row.action === "evidence.correct")).toBe(true);
  });
});

describe("search", () => {
  it("ranks exact OEM, expands synonyms and assembly filters", async () => {
    const engine = await loaded();
    const exact = engine.search({ q: "1K0698151", categoryId: "cat-05" });
    expect(exact.items[0].matchKind).toBe("exact_oem");
    const synonym = engine.search({ q: "ventil", categoryId: "cat-05" });
    expect(synonym.items.some((row) => row.oemPartNumber === "06A109601C")).toBe(true);
    expect(expand(["bremsbelag"])).toContain("brake pad");
    const assembly = engine.search({ q: "1K0698151", assemblyId: "vpe-cat-brakes", categoryId: "cat-05" });
    expect(assembly.items[0].assemblyId).toBe("vpe-cat-brakes");
    const thread = engine.search({ q: "zylinderkopfschraube", thread: "M10x1.5", categoryId: "cat-05" });
    expect(thread.items.some((row) => row.oemPartNumber === "N  910 247 01")).toBe(true);
    const alt = engine.search({
      q: "AA-PAD-G7",
      manufacturer: "VW",
      model: "Golf",
      generation: "VII",
      categoryId: "cat-05",
    });
    expect(alt.items[0].verifiedExactMatch).toBe(false);
  });
});

describe("import and sourcing", () => {
  it("imports idempotently and handles partial plus timeout", async () => {
    const engine = await loaded();
    const second = await engine.importFrom("mock-vpe-local");
    expect(second.job.imported).toBe(0);
    expect(second.job.didDeleteMissing).toBe(false);

    const { createRegistry } = require("../lib/vehiclePartsIntelligence/catalog/registry");
    const isolated = createVehiclePartsEngine({ registry: createRegistry({ registerDefaults: false }) });
    isolated.registry.register(createMockConnector({ failMode: "partial" }));
    const partial = await isolated.importFrom("mock-vpe-local");
    expect(partial.job.status).toBe("PARTIAL");

    const timeout = createVehiclePartsEngine({ registry: createRegistry({ registerDefaults: false }) });
    timeout.registry.register(createMockConnector());
    await timeout.importFrom("mock-vpe-local");
    timeout.registry.register(createMockConnector({ failMode: "timeout" }));
    const failed = await timeout.importFrom("mock-vpe-local");
    expect(failed.job.status).toBe("FAILED");
    expect(failed.job.errors[0].class).toBe("RETRYABLE");
  });

  it("rejects formula-like supplier text and keeps warehouse distinct", async () => {
    const engine = createVehiclePartsEngine();
    const bad = await engine.importFrom("mock-vpe-local", {
      records: {
        vehicles: [],
        parts: [{ sourceRecordId: "evil", manufacturer: "VW", oemPartNumber: "X1", description: "=cmd()" }],
        evidence: [],
        offers: [],
      },
    });
    expect(bad.job.status).toBe("PARTIAL");
    expect(bad.job.errors[0].error).toBe("formula_injection");
  });

  it("applies shared pricing plus EUR 0.50 floor and never purchases", async () => {
    const engine = await loaded();
    const part = engine.findPartsByNumber("1K0698151", "VW")[0];
    const ranked = engine.rankOffers({
      partId: part.id,
      manufacturer: "VW",
      model: "Golf",
      generation: "VII",
      engineCode: "CZEA",
      year: 2016,
    });
    expect(ranked.purchaseExecuted).toBe(false);
    expect(ranked.items.some((row) => row.inventory.trust === "STALE" && row.inventory.verifiedStock === false)).toBe(true);
    expect(ranked.items.some((row) => row.warehouse.location == null)).toBe(true);
    expect(ranked.items[0].warehouse.inferredFromSupplierCountry).toBe(false);
    const tiny = previewSalePrice({ supplierPrice: 1, markupPercent: 0, minimumMarginPercent: 0 });
    expect(tiny.netProfit).toBeGreaterThanOrEqual(MIN_NET_PROFIT_EUR);
    expect(pricing.calculateSalePrice({ supplierPrice: 100 }).amount).toBe(138);
  });
});

describe("authorization, fitment reuse and safety", () => {
  it("protects admin import, reuses fitment extras, and leaves sales flags off", () => {
    expect(PUBLIC_ROUTES.has("GET /api/vehicle-parts/search")).toBe(true);
    expect(resolveRoutePermission("POST", "/api/admin/vehicle-parts/import")).toEqual({
      permission: "products.write",
    });
    const fitment = normalizeFitmentEntry({
      brand: "VW",
      model: "Golf",
      generation: "VII",
      engineCode: "CZEA",
      gearboxCode: "PGT",
    });
    expect(fitment.generation).toBe("VII");
    expect(fitment.engineCode).toBe("CZEA");
    expect(fitment.gearboxCode).toBe("PGT");
    expect(process.env.BUZZARD_SALES_ENABLED === "1").toBe(false);
    expect(process.env.BUZZARD_PRODUCT_SOT_ACTIVE === "1").toBe(false);
    expect(process.env.BUZZARD_LIVE_PAYMENTS === "1").toBe(false);
    expect(require("../lib/salesMode").isSalesEnabled()).toBe(false);
    expect(isolation.assertAutomotiveScope({ categoryId: "cat-05" }).ok).toBe(true);
  });
});
