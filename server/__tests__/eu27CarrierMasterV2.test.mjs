import { createRequire } from "node:module";
import { describe, expect, it } from "vitest";

const require = createRequire(import.meta.url);
const { load } = require("../lib/logistics/carrierMaster.js");
const { loadV2, uniqueIdsV2, sourceVerified, brandCompanySplit } = require("../lib/logistics/carrierMasterV2.js");
const { FI_LETTER, FR_ARCEP, BE_LICENCES, AT_PEV } = require("../lib/logistics/eu27SeedV2.js");
const { recommend } = require("../lib/logistics/selectCarrier.js");
const { requestQuoteTask } = require("../lib/logistics/pusatLogistics.js");
const { isSalesEnabled } = require("../lib/salesMode.js");

describe("EU27 carrier master v2", () => {
  it("keeps v1 snapshot and does not treat 43 as EU-27 population", () => {
    const v1 = load();
    const v2 = loadV2();
    expect(v1.uniqueVerifiedLegal).toBe(43);
    expect(v2.previousVerifiedLegalCount).toBe(43);
    expect(v2.schema).toBe("buzzard.eu27-carrier-master.v2");
    expect(v2.countries).toHaveLength(27);
    expect(v2.entities.filter((e) => e.class === "NATIONAL_POST_USP")).toHaveLength(27);
    expect(uniqueIdsV2().unique).toBe(true);
  });

  it("does not treat DE 7183 Stammnummer rows as active companies", () => {
    const de = loadV2().counts.find((c) => c.iso === "DE");
    expect(de.register.records).toBe(7183);
    expect(de.register.status).toBe("PARTIAL_REGISTER_FETCH");
    expect(de.register.uniqueLegal).toBeNull();
    expect(de.verification).not.toBe("COMPLETE_VERIFIED");
  });

  it("keeps DK 18 as permits and names dao as letter/parcel licensed not parcel-only", () => {
    const dk = loadV2().counts.find((c) => c.iso === "DK");
    expect(dk.register.records).toBe(18);
    expect(String(dk.register.note)).toMatch(/letter/i);
  });

  it("records Traficom FI letter notifications without claiming parcel market", () => {
    const fi = loadV2().counts.find((c) => c.iso === "FI");
    expect(fi.register.records).toBe(FI_LETTER.length);
    expect(fi.register.status).toBe("PARTIALLY_VERIFIED");
    expect(String(fi.register.note)).toMatch(/Letter/);
    expect(loadV2().entities.some((e) => e.legalName === "Jakeluyhtiö Suomi Oy")).toBe(true);
  });

  it("records ARCEP FR correspondence operators separately from parcel last-mile", () => {
    const fr = loadV2().counts.find((c) => c.iso === "FR");
    expect(fr.register.records).toBe(FR_ARCEP.length);
    expect(String(fr.register.note)).toMatch(/Correspondence/);
  });

  it("records BE licences with inactive EasyPost and SE 19 permits from statistics", () => {
    expect(BE_LICENCES.filter((r) => !r.active)).toHaveLength(1);
    expect(loadV2().counts.find((c) => c.iso === "SE").register.records).toBe(19);
    expect(loadV2().counts.find((c) => c.iso === "BE").register.records).toBe(7);
  });

  it("uses CNMC 2025 section counts for ES and MIMIT sequential 3722 for IT", () => {
    const es = loadV2().counts.find((c) => c.iso === "ES");
    const it = loadV2().counts.find((c) => c.iso === "IT");
    expect(es.register.records).toBe(4734);
    expect(es.register.uniqueLegal).toBeNull();
    expect(it.register.records).toBe(3722);
    expect(it.register.uniqueLegal).toBeNull();
  });

  it("does not invent remaining-country register totals", () => {
    const open = loadV2().counts.filter((c) =>
      ["HU", "CZ", "SK", "BG", "EL", "EE", "LV", "LT", "LU", "MT", "CY", "SI", "HR"].includes(c.iso)
    );
    expect(open.every((c) => c.register.records === null)).toBe(true);
    expect(open.every((c) => c.register.status === "OFFICIAL_REGISTER_UNAVAILABLE")).toBe(true);
    expect(loadV2().counts.every((c) => c.verification !== "COMPLETE_VERIFIED")).toBe(true);
  });

  it("keeps API docs classified without sandbox or live verification", () => {
    for (const row of loadV2().apiDocs) {
      expect(row.apiStatus).toBe("OFFICIAL_API_DOCUMENTED");
      expect(row.contractRequired).toBe(true);
      expect(row.sandboxVerified).toBe(false);
      expect(row.liveVerified).toBe(false);
    }
    expect(loadV2().counts.every((c) => c.apiDirectVerified === 0)).toBe(true);
  });

  it("separates locker class from carriers and flags brand collisions", () => {
    expect(loadV2().entities.some((e) => e.class === "PUDO_LOCKER")).toBe(true);
    expect(AT_PEV).toHaveLength(16);
    expect(brandCompanySplit(loadV2().entities).length).toBeGreaterThan(0);
    expect(sourceVerified(loadV2().entities).length).toBe(loadV2().uniqueSourceVerified);
  });

  it("does not treat estimates as prices or start shipments", () => {
    const rec = recommend({ destination: "ES", postalCode: "28001", origin: "DE" });
    expect(rec.liveRate).toBe(false);
    expect(rec.estimateIsNotPrice).toBe(true);
    expect(rec.cannotStartShipment).toBe(true);
    expect(rec.postalCode).toBe("28001");
    expect(isSalesEnabled()).toBe(false);
    expect(requestQuoteTask({ destination: "IT" }).liveShipment).toBe(false);
  });
});
