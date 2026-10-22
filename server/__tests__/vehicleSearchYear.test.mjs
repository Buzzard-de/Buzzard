import { describe, it, expect } from "vitest";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const {
  createVehiclePartsEngine,
  COMPATIBILITY_STATES,
  validateSearchYear,
  MIN_SEARCH_YEAR,
  maxSearchYear,
} = require("../lib/vehiclePartsIntelligence");
const { createAgriculturalMachineryEngine } = require("../lib/agriculturalMachinery");
const { createConstructionMachineryEngine } = require("../lib/constructionMachinery");

const ACCEPTED = [1960, 1970, 1990, 2009, 2010];

async function loaded() {
  const engine = createVehiclePartsEngine();
  const imported = await engine.importFrom("mock-vpe-local");
  expect(imported.ok).toBe(true);
  return engine;
}

describe("automotive search year acceptance", () => {
  it("accepts 1960, 1970, 1990, 2009 and 2010 without inventing compatibility", async () => {
    expect(MIN_SEARCH_YEAR).toBe(1960);
    for (const year of ACCEPTED) {
      expect(validateSearchYear(year).ok).toBe(true);
      expect(validateSearchYear(String(year)).ok).toBe(true);
    }
    const engine = await loaded();
    for (const year of ACCEPTED) {
      const result = engine.search({
        q: "1K0698151",
        year,
        categoryId: "cat-05",
      });
      expect(result.invalidYear).toBeFalsy();
      expect(result.items.some((row) => row.oemPartNumber === "1K0698151")).toBe(true);

      const decision = engine.evaluate({
        oemPartNumber: "1K0698151",
        manufacturer: "VW",
        model: "Golf",
        generation: "VII",
        engineCode: "CZEA",
        year,
        categoryId: "cat-05",
      });
      expect(decision.invalidYear).toBeFalsy();
      if (year < 2012) {
        expect(decision.state).not.toBe(COMPATIBILITY_STATES.VERIFIED_COMPATIBLE);
      }
    }
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
  });

  it("rejects invalid and impossible future years and does not fabricate matches", async () => {
    const engine = await loaded();
    const future = maxSearchYear() + 5;
    for (const value of ["abc", "19.5", 1959, 1899, future]) {
      expect(validateSearchYear(value).ok).toBe(false);
      const search = engine.search({ q: "1K0698151", year: value, categoryId: "cat-05" });
      expect(search.items).toEqual([]);
      expect(search.invalidYear).toBe(true);
      expect(search.catalogCoverageClaimed).toBe(false);
      const decision = engine.evaluate({
        oemPartNumber: "1K0698151",
        manufacturer: "VW",
        model: "Golf",
        year: value,
        categoryId: "cat-05",
      });
      expect(decision.state).toBe(COMPATIBILITY_STATES.INSUFFICIENT_DATA);
      expect(decision.compatibilityInferredFromYear).toBe(false);
    }
  });

  it("does not treat year acceptance as catalog coverage or change other domains", async () => {
    const engine = await loaded();
    const emptyEra = engine.search({
      q: "NO-SUCH-OEM-1960",
      year: 1960,
      manufacturer: "UnknownHistoric",
      model: "NoRecord",
      categoryId: "cat-05",
    });
    expect(emptyEra.items).toEqual([]);
    expect(emptyEra.invalidYear).toBeFalsy();

    const agri = createAgriculturalMachineryEngine();
    const cons = createConstructionMachineryEngine();
    expect(engine.search({ q: "1K0698151", year: 1960, categoryId: "ame-cat-tractors" }).rejectedDomain).toBe(
      "agricultural"
    );
    expect(agri.search({ q: "1K0698151", year: 1960, categoryId: "cat-05", requireScope: true }).items).toEqual([]);
    expect(cons.search({ q: "1K0698151", year: 1960, categoryId: "cat-05" }).items).toEqual([]);
    expect(engine.persistence.enabled).toBe(false);
  });
});
