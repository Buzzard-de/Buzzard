import { createRequire } from "node:module";
import { describe, expect, it } from "vitest";

const require = createRequire(import.meta.url);
const { load } = require("../lib/logistics/carrierMaster.js");
const { loadV2 } = require("../lib/logistics/carrierMasterV2.js");
const { loadV3, uniqueIdsV3, sourceVerified } = require("../lib/logistics/carrierMasterV3.js");
const { CZ_CTU, LU_ILR, MT_MCA, CY_OCECPR } = require("../lib/logistics/eu27SeedV3.js");
const { recommend } = require("../lib/logistics/selectCarrier.js");
const { requestQuoteTask } = require("../lib/logistics/pusatLogistics.js");
const { isSalesEnabled } = require("../lib/salesMode.js");

describe("EU27 carrier master v3", () => {
  it("preserves v1 and v2 and covers 27 USP countries", () => {
    expect(load().uniqueVerifiedLegal).toBe(43);
    expect(loadV2().previousVerifiedLegalCount).toBe(43);
    expect(loadV3().schema).toBe("buzzard.eu27-carrier-master.v3");
    expect(loadV3().countries).toHaveLength(27);
    expect(loadV3().entities.filter((e) => e.class === "NATIONAL_POST_USP")).toHaveLength(27);
    expect(uniqueIdsV3().unique).toBe(true);
  });

  it("does not promote Austria 138 or DE 7183 to unique companies", () => {
    expect(loadV3().austria138.status).toBe("NOT_FOUND_IN_FETCHED_RTR_2024_REPORT");
    const de = loadV3().counts.find((c) => c.iso === "DE");
    const at = loadV3().counts.find((c) => c.iso === "AT");
    expect(de.register.records).toBe(7183);
    expect(de.register.uniqueLegal).toBeNull();
    expect(at.register.records).toBe(16);
    expect(loadV3().counts.every((c) => c.verification !== "COMPLETE_VERIFIED")).toBe(true);
  });

  it("records ČTÚ three operators including interrupted Česká distribuční", () => {
    const cz = loadV3().counts.find((c) => c.iso === "CZ");
    expect(cz.register.records).toBe(3);
    expect(CZ_CTU.filter((r) => !r.active)).toHaveLength(1);
    expect(String(cz.register.note)).toMatch(/PPL/);
  });

  it("records BG 218/87 split and LU 43 / MT MCA / CY extract / SI 29 / HR 23", () => {
    expect(loadV3().counts.find((c) => c.iso === "BG").register.records).toBe(218);
    expect(loadV3().counts.find((c) => c.iso === "LU").register.records).toBe(LU_ILR.length);
    expect(loadV3().counts.find((c) => c.iso === "MT").register.records).toBe(MT_MCA.length);
    expect(loadV3().counts.find((c) => c.iso === "CY").register.records).toBe(CY_OCECPR.length);
    expect(loadV3().counts.find((c) => c.iso === "SI").register.records).toBe(29);
    expect(loadV3().counts.find((c) => c.iso === "HR").register.records).toBe(23);
    expect(loadV3().counts.find((c) => c.iso === "HR").register.uniqueLegal).toBeNull();
  });

  it("keeps locker class out of implicit carrier totals and API unverified", () => {
    expect(loadV3().entities.some((e) => e.class === "PUDO_LOCKER")).toBe(true);
    expect(loadV3().apiDocs.every((r) => r.sandboxVerified === false && r.liveVerified === false)).toBe(true);
    expect(sourceVerified(loadV3().entities).length).toBe(loadV3().uniqueSourceVerified);
  });

  it("does not start live shipments and keeps sales closed", () => {
    const rec = recommend({ destination: "MT", origin: "DE", postalCode: "VLT" });
    expect(rec.liveRate).toBe(false);
    expect(rec.cannotStartShipment).toBe(true);
    expect(rec.estimateIsNotPrice).toBe(true);
    expect(isSalesEnabled()).toBe(false);
    expect(requestQuoteTask({ destination: "LU" }).liveShipment).toBe(false);
  });
});
