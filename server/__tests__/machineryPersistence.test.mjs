import { describe, it, expect } from "vitest";
import { createRequire } from "node:module";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";

const require = createRequire(import.meta.url);
const Database = require("better-sqlite3");
const {
  ensureMachineryTables,
  listMachineryTableNames,
  SCHEMA_VERSION,
  createMachineryRepository,
  shouldPersistSingleton,
  payloadHasFullVin,
} = require("../lib/machineryDomainKit/persistence");
const { createVehiclePartsEngine } = require("../lib/vehiclePartsIntelligence");
const { createAgriculturalMachineryEngine } = require("../lib/agriculturalMachinery");
const { createConstructionMachineryEngine } = require("../lib/constructionMachinery");
const { previewSalePrice, MIN_NET_PROFIT_EUR } = require("../lib/machineryDomainKit/pricingContract");
const pricing = require("../lib/pricing");
const sales = require("../lib/salesMode");

function tempDbPath() {
  const dir = mkdtempSync(join(tmpdir(), "machinery-persist-"));
  return join(dir, "test.db");
}

function openFresh() {
  const dbPath = tempDbPath();
  const db = new Database(dbPath);
  return { db, dbPath };
}

function samplePart(domain, overrides = {}) {
  const prefixes = {
    automotive: { id: "vpe-part-persist-1", categoryId: "vpe-cat-brake-pads", oem: "1K0698151" },
    agricultural: { id: "ame-part-persist-1", categoryId: "ame-cat-filters", oem: "AG-FILTER-1" },
    construction: { id: "cme-part-persist-1", categoryId: "cme-cat-filters", oem: "CME-FILTER-1" },
  };
  const spec = prefixes[domain];
  return {
    id: spec.id,
    domain,
    manufacturer: "TestCo",
    oemPartNumber: spec.oem,
    oemNormalized: spec.oem,
    categoryId: spec.categoryId,
    catalogSource: "manual",
    provenance: { providerId: "test-persist", sourceRecordId: spec.id, mock: false },
    ...overrides,
  };
}

describe("machinery persistence schema", () => {
  it("initializes specialist tables idempotently without touching shop tables", () => {
    const { db } = openFresh();
    db.exec("CREATE TABLE products (id INTEGER PRIMARY KEY, sku TEXT NOT NULL);");
    db.prepare("INSERT INTO products (sku) VALUES (?)").run("KEEP-SHOP-SKU");
    const first = ensureMachineryTables(db);
    const second = ensureMachineryTables(db);
    expect(first.ok).toBe(true);
    expect(second.ok).toBe(true);
    expect(first.schemaVersion).toBe(SCHEMA_VERSION);
    const names = listMachineryTableNames(db);
    expect(names).toEqual(expect.arrayContaining([
      "machinery_meta",
      "vpe_vehicles",
      "vpe_parts",
      "vpe_evidence",
      "vpe_offers",
      "ame_machines",
      "ame_parts",
      "ame_evidence",
      "ame_offers",
      "cme_machines",
      "cme_parts",
      "cme_evidence",
      "cme_offers",
    ]));
    expect(db.prepare("SELECT sku FROM products WHERE sku = ?").get("KEEP-SHOP-SKU").sku).toBe("KEEP-SHOP-SKU");
    expect(db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='products'").get()).toBeTruthy();
    const shopVehicles = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='vehicles'").get();
    expect(shopVehicles).toBeUndefined();
    db.close();
  });
});

describe("P0-ISO repository isolation", () => {
  it("reads and writes only the bound domain tables", () => {
    const { db } = openFresh();
    ensureMachineryTables(db);
    const vpe = createMachineryRepository({ domain: "automotive", db });
    const ame = createMachineryRepository({ domain: "agricultural", db });
    const cme = createMachineryRepository({ domain: "construction", db });

    expect(vpe.upsertPart(samplePart("automotive")).ok).toBe(true);
    expect(ame.upsertPart(samplePart("agricultural")).ok).toBe(true);
    expect(cme.upsertPart(samplePart("construction")).ok).toBe(true);

    expect(vpe.listParts()).toHaveLength(1);
    expect(ame.listParts()).toHaveLength(1);
    expect(cme.listParts()).toHaveLength(1);
    expect(vpe.listParts()[0].id).toBe("vpe-part-persist-1");
    expect(ame.listParts()[0].id).toBe("ame-part-persist-1");
    expect(cme.listParts()[0].id).toBe("cme-part-persist-1");
    db.close();
  });

  it("rejects cross-domain records and foreign table access", () => {
    const { db } = openFresh();
    ensureMachineryTables(db);
    const vpe = createMachineryRepository({ domain: "automotive", db });
    const ame = createMachineryRepository({ domain: "agricultural", db });

    const domainMismatch = vpe.upsertPart(samplePart("agricultural"));
    expect(domainMismatch.ok).toBe(false);
    expect(domainMismatch.error).toBe("domain_mismatch");

    const categoryMismatch = vpe.upsertPart(samplePart("automotive", { categoryId: "cme-cat-excavators" }));
    expect(categoryMismatch.ok).toBe(false);
    expect(categoryMismatch.error).toBe("category_domain_mismatch");

    expect(vpe.readTable("cme_parts").ok).toBe(false);
    expect(vpe.readTable("cme_parts").error).toBe("cross_domain_forbidden");
    expect(vpe.readTable("cme_parts").items).toEqual([]);
    expect(vpe.writeTable("ame_parts", samplePart("agricultural")).ok).toBe(false);
    expect(ame.getPart("vpe-part-persist-1")).toBeNull();
    expect(vpe.listParts()).toHaveLength(0);
    db.close();
  });
});

describe("P1-STORE engine persistence", () => {
  it("reloads records after engine reinitialization on a temp database", async () => {
    const dbPath = tempDbPath();
    const first = createVehiclePartsEngine({ persist: true, dbPath });
    expect(first.persistence.enabled).toBe(true);
    const imported = await first.importFrom("mock-vpe-local");
    expect(imported.ok).toBe(true);
    const partCount = first.listParts().length;
    expect(partCount).toBeGreaterThan(0);
    const vehicleCount = first.listVehicles().length;
    const evidenceCount = first.store.evidence.size;

    const second = createVehiclePartsEngine({ persist: true, dbPath });
    expect(second.listParts()).toHaveLength(partCount);
    expect(second.listVehicles()).toHaveLength(vehicleCount);
    expect(second.store.evidence.size).toBe(evidenceCount);
    expect(second.listParts().every((part) => part.catalogSource === "mock")).toBe(true);
  });

  it("lets a second process read a record written by the first", () => {
    const dbPath = tempDbPath();
    const db = new Database(dbPath);
    const repo = createMachineryRepository({ domain: "automotive", db });
    expect(repo.upsertPart(samplePart("automotive")).ok).toBe(true);
    db.close();

    const probe = resolve("server/scripts/machinery-persist-probe.cjs");
    const child = spawnSync(process.execPath, [probe, dbPath, "automotive"], {
      encoding: "utf8",
    });
    expect(child.status, child.stderr).toBe(0);
    const payload = JSON.parse(child.stdout);
    expect(payload.count).toBe(1);
    expect(payload.id).toBe("vpe-part-persist-1");
  });

  it("keeps mock seeds idempotent and does not overwrite genuine records", async () => {
    const dbPath = tempDbPath();
    const engine = createVehiclePartsEngine({ persist: true, dbPath });
    const genuine = engine.upsertPart({
      id: "vpe-part-genuine-1",
      manufacturer: "VW",
      oemPartNumber: "GENUINE001",
      categoryId: "vpe-cat-brake-pads",
      providerId: "licensed-test",
      sourceRecordId: "genuine-1",
      catalogSource: "manual",
    });
    expect(genuine.ok).toBe(true);
    expect(engine.listParts()).toHaveLength(1);

    const seeded = await engine.importFrom("mock-vpe-local");
    expect(seeded.ok).toBe(true);
    const genuineAfter = engine.getPart("vpe-part-genuine-1");
    expect(genuineAfter).toBeTruthy();
    expect(genuineAfter.oemPartNumber).toBe("GENUINE001");

    const repo = createMachineryRepository({
      domain: "automotive",
      db: new Database(dbPath),
    });
    expect(repo.getPart("vpe-part-genuine-1").catalogSource).toBe("manual");
    const blocked = repo.upsertPart({
      id: "vpe-part-genuine-1",
      domain: "automotive",
      manufacturer: "VW",
      oemPartNumber: "MOCK-OVERWRITE",
      catalogSource: "mock",
      provenance: { mock: true, providerId: "mock-vpe-local", sourceRecordId: "genuine-1" },
    });
    expect(blocked.ok).toBe(false);
    expect(blocked.error).toBe("mock_overwrite_blocked");
    expect(repo.getPart("vpe-part-genuine-1").oemPartNumber).toBe("GENUINE001");
    repo.db?.close?.();
  });

  it("preserves in-memory options.store and default create*Engine behavior", () => {
    const kit = require("../lib/machineryDomainKit");
    const store = kit.createStore();
    const engine = createVehiclePartsEngine({ store });
    expect(engine.persistence.enabled).toBe(false);
    expect(engine.store).toBe(store);
    const memory = createAgriculturalMachineryEngine();
    expect(memory.persistence.enabled).toBe(false);
    expect(shouldPersistSingleton()).toBe(false);
  });

  it("reloads evidence used by compatibility after a restart", async () => {
    const dbPath = tempDbPath();
    const first = createVehiclePartsEngine({ persist: true, dbPath });
    await first.importFrom("mock-vpe-local");
    const before = first.evaluate({
      oemPartNumber: "1K0698151",
      manufacturer: "VW",
      model: "Golf",
      generation: "VII",
      engineCode: "CZEA",
      year: 2016,
      categoryId: "cat-05",
    });
    const second = createVehiclePartsEngine({ persist: true, dbPath });
    const after = second.evaluate({
      oemPartNumber: "1K0698151",
      manufacturer: "VW",
      model: "Golf",
      generation: "VII",
      engineCode: "CZEA",
      year: 2016,
      categoryId: "cat-05",
    });
    expect(after.state).toBe(before.state);
    expect(after.state).not.toBe("INSUFFICIENT_DATA");
  });

  it("persists agricultural and construction hosts independently", async () => {
    const dbPath = tempDbPath();
    const agri = createAgriculturalMachineryEngine({ persist: true, dbPath });
    const cons = createConstructionMachineryEngine({ persist: true, dbPath });
    await agri.importFrom("mock-ag-local");
    await cons.importFrom("mock-local");
    expect(agri.listParts().length).toBeGreaterThan(0);
    expect(cons.listParts().length).toBeGreaterThan(0);

    const agri2 = createAgriculturalMachineryEngine({ persist: true, dbPath });
    const cons2 = createConstructionMachineryEngine({ persist: true, dbPath });
    expect(agri2.listParts().map((row) => row.id).sort()).toEqual(agri.listParts().map((row) => row.id).sort());
    expect(cons2.listParts().map((row) => row.id).sort()).toEqual(cons.listParts().map((row) => row.id).sort());
    expect(agri2.listParts().some((row) => String(row.id).startsWith("cme-"))).toBe(false);
    expect(cons2.listParts().some((row) => String(row.id).startsWith("ame-"))).toBe(false);
  });
});

describe("persistence data safety", () => {
  it("disables persistence when BUZZARD_MACHINERY_PERSIST=0", () => {
    const persist = require("../lib/machineryDomainKit/persistence");
    const previous = process.env.BUZZARD_MACHINERY_PERSIST;
    process.env.BUZZARD_MACHINERY_PERSIST = "0";
    expect(persist.shouldPersistSingleton()).toBe(false);
    if (previous == null) delete process.env.BUZZARD_MACHINERY_PERSIST;
    else process.env.BUZZARD_MACHINERY_PERSIST = previous;
  });

  it("reverts memory when a persist write throws and skips unreadable rows", () => {
    const { createStore } = require("../lib/machineryDomainKit");
    const persist = require("../lib/machineryDomainKit/persistence");
    const store = createStore();
    persist.attachPersistence(store, {
      domain: "automotive",
      upsertHost: () => {
        throw new Error("sqlite unavailable");
      },
      upsertPart: () => ({ ok: false, error: "rejected" }),
      upsertEvidence: () => ({ ok: true }),
      upsertOffer: () => ({ ok: true }),
    });
    store.machines.set("vpe-throw-1", { id: "vpe-throw-1", domain: "automotive" });
    expect(store.machines.has("vpe-throw-1")).toBe(false);
    store.parts.set("vpe-reject-1", { id: "vpe-reject-1", domain: "automotive" });
    expect(store.parts.has("vpe-reject-1")).toBe(false);

    const { db, dbPath } = openFresh();
    persist.ensureMachineryTables(db);
    db.prepare(
      `INSERT INTO vpe_parts (id, domain, catalog_source, provider_id, source_record_id, category_id, oem_normalized, payload_json, updated_at)
       VALUES (?, 'automotive', 'manual', 't', 'bad', null, null, ?, ?)`
    ).run("vpe-bad-json", "{not-json", new Date().toISOString());
    db.prepare(
      `INSERT INTO vpe_parts (id, domain, catalog_source, provider_id, source_record_id, category_id, oem_normalized, payload_json, updated_at)
       VALUES (?, 'automotive', 'manual', 't', 'ok', null, null, ?, ?)`
    ).run("vpe-ok-json", JSON.stringify({ id: "vpe-ok-json", domain: "automotive" }), new Date().toISOString());
    const repo = persist.createMachineryRepository({ domain: "automotive", db });
    const loaded = repo.listParts();
    expect(loaded.some((row) => row?.id === "vpe-ok-json")).toBe(true);
    expect(loaded.some((row) => row?.id === "vpe-bad-json")).toBe(false);
    expect(db.prepare("SELECT COUNT(*) n FROM vpe_parts").get().n).toBe(2);
    db.close();
    expect(dbPath).toBeTruthy();
  });
});

describe("safety locks remain intact", () => {
  it("keeps the EUR 0.50 floor, no 0.10 undercut, sales disabled, and no full VIN in sqlite", () => {
    const tiny = previewSalePrice({ supplierPrice: 1, markupPercent: 0, minimumMarginPercent: 0 });
    expect(tiny.netProfit).toBeGreaterThanOrEqual(MIN_NET_PROFIT_EUR);
    expect(tiny.netProfit).toBeGreaterThanOrEqual(0.5);
    expect(pricing.calculateSalePrice({ supplierPrice: 100 }).amount).toBe(138);
    expect(sales.isSalesEnabled()).toBe(false);
    expect(process.env.BUZZARD_SALES_ENABLED === "1").toBe(false);
    expect(process.env.BUZZARD_PRODUCT_SOT_ACTIVE === "1").toBe(false);
    expect(process.env.BUZZARD_LIVE_PAYMENTS === "1").toBe(false);

    const dbPath = tempDbPath();
    const engine = createVehiclePartsEngine({ persist: true, dbPath });
    const sampleVin = "WVWZZZ1KZAW123456";
    const inserted = engine.upsertVehicle({
      manufacturer: "VW",
      model: "Golf",
      vin: sampleVin,
      sourceRecordId: "vin-persist-1",
      providerId: "test",
    });
    expect(inserted.ok).toBe(true);
    expect(inserted.vehicle.vin.present).toBe(true);
    expect(JSON.stringify(inserted.vehicle)).not.toContain(sampleVin);

    const db = new Database(dbPath);
    const row = db.prepare("SELECT payload_json FROM vpe_vehicles").get();
    expect(row).toBeTruthy();
    expect(payloadHasFullVin(row.payload_json)).toBe(false);
    expect(row.payload_json).not.toContain(sampleVin);
    db.close();
  });
});
