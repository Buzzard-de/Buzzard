import { createRequire } from "node:module";
import { describe, expect, it } from "vitest";

const require = createRequire(import.meta.url);
const { load, listCountries, uniqueIds, verifiedUniques, getEntity } = require("../lib/logistics/carrierMaster.js");
const { recommend } = require("../lib/logistics/selectCarrier.js");
const { requestQuoteTask } = require("../lib/logistics/pusatLogistics.js");
const { isSalesEnabled } = require("../lib/salesMode.js");
const { paySupplier, buyStockBeforeOrder } = require("../lib/commerce/commerceRiskGates.js");

describe("EU27 carrier master", () => {
  it("covers 27 countries with one USP each and unique ids", () => {
    const master = load();
    expect(listCountries()).toHaveLength(27);
    expect(master.entities.filter((e) => e.class === "NATIONAL_POST_USP")).toHaveLength(27);
    expect(uniqueIds().unique).toBe(true);
    expect(master.counts).toHaveLength(27);
    expect(master.counts.every((c) => c.nationalPost === 1)).toBe(true);
    expect(master.counts.every((c) => c.apiDirectVerified === 0)).toBe(true);
    expect(master.liveShipment).toBe(false);
  });

  it("does not treat DE register rows as all active nationwide carriers", () => {
    const de = load().counts.find((c) => c.iso === "DE");
    expect(de.officialRegisterCount.value).toBe(7183);
    expect(de.officialRegisterCount.status).toBe("PARTIAL_REGISTER_FETCH");
    expect(de.activeVerifiedLegalEntities).toBeLessThan(de.officialRegisterCount.value);
    expect(de.verification).not.toBe("TAM_VE_DOGRULANMIS");
  });

  it("uses the Danish NRA table without inventing extra licenses", () => {
    const dk = load().counts.find((c) => c.iso === "DK");
    expect(dk.officialRegisterCount.value).toBe(18);
    expect(dk.officialRegisterCount.status).toBe("REGISTER_TABLE_PUBLISHED");
    expect(getEntity("dk-dao").reliability).toBe("VERIFIED_DK_NRA_LICENSE_TABLE");
  });

  it("marks other countries as official register not accessed", () => {
    const blocked = load().counts.filter((c) => !["DE", "DK"].includes(c.iso));
    expect(blocked).toHaveLength(25);
    expect(blocked.every((c) => c.officialRegisterCount.status === "OFFICIAL_REGISTER_NOT_ACCESSED")).toBe(true);
  });

  it("keeps unknown fields tagged and sales closed", () => {
    const usp = getEntity("usp-de");
    expect(usp.vat).toBe("NOT_PUBLISHED");
    expect(usp.sandbox).toBe("BLOCKED");
    expect(recommend({ destination: "FR" }).liveRate).toBe(false);
    expect(recommend({ destination: "FR" }).salesEnabled).toBe(false);
    expect(isSalesEnabled()).toBe(false);
    expect(paySupplier({}).paid).toBe(false);
    expect(buyStockBeforeOrder({}).purchased).toBe(false);
    expect(requestQuoteTask({ destination: "NL" }).liveShipment).toBe(false);
  });

  it("counts verified uniques separately from research candidates", () => {
    const verified = verifiedUniques();
    expect(verified.length).toBe(load().uniqueVerifiedLegal);
    expect(load().entities.some((e) => e.reliability === "RESEARCH_CANDIDATE")).toBe(true);
    expect(load().entities.every((e) => e.id && e.legalName && e.brand)).toBe(true);
  });
});
