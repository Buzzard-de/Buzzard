import { createRequire } from "node:module";
import { existsSync } from "node:fs";
import { describe, expect, it } from "vitest";

const require = createRequire(import.meta.url);
const { load } = require("../lib/logistics/carrierMaster.js");
const { loadV2 } = require("../lib/logistics/carrierMasterV2.js");
const { loadV3 } = require("../lib/logistics/carrierMasterV3.js");
const { loadV4, uniqueIdsV4, sourceVerified } = require("../lib/logistics/carrierMasterV4.js");
const { EE_COURIER_ACTIVE_2025 } = require("../lib/logistics/eu27SeedV4.js");
const { recommend } = require("../lib/logistics/selectCarrier.js");
const { requestQuoteTask } = require("../lib/logistics/pusatLogistics.js");
const { isSalesEnabled } = require("../lib/salesMode.js");

describe("EU27 carrier master v4", () => {
  it("preserves v1 v2 v3 files and 27 USP countries", () => {
    expect(existsSync("data/logistics/eu27_carrier_master.v1.json")).toBe(true);
    expect(existsSync("data/logistics/eu27_carrier_master.v2.json")).toBe(true);
    expect(existsSync("data/logistics/eu27_carrier_master.v3.json")).toBe(true);
    expect(load().uniqueVerifiedLegal).toBe(43);
    expect(loadV2().schema).toBe("buzzard.eu27-carrier-master.v2");
    expect(loadV3().schema).toBe("buzzard.eu27-carrier-master.v3");
    expect(loadV4().schema).toBe("buzzard.eu27-carrier-master.v4");
    expect(loadV4().countries).toHaveLength(27);
    expect(loadV4().entities.filter((e) => e.class === "NATIONAL_POST_USP")).toHaveLength(27);
    expect(uniqueIdsV4().unique).toBe(true);
    expect(loadV4().completeVerifiedCountries).toBe(0);
    expect(loadV4().counts.every((c) => c.verification !== "COMPLETE_VERIFIED")).toBe(true);
  });

  it("records NL 105 unique KVK and does not use mixed 2622 as companies", () => {
    const nl = loadV4().counts.find((c) => c.iso === "NL");
    expect(nl.register.records).toBe(105);
    expect(nl.register.uniqueLegal).toBe(105);
    expect(nl.register.pakket).toBe(19);
    expect(nl.register.postvervoer).toBe(93);
    expect(nl.register.mixedCsvRows).toBe(2622);
  });

  it("records PL 234 UKE B-numbers and EL 804/795 EETT postal split", () => {
    const pl = loadV4().counts.find((c) => c.iso === "PL");
    const el = loadV4().counts.find((c) => c.iso === "EL");
    expect(pl.register.records).toBe(234);
    expect(pl.register.uniqueLegal).toBe(234);
    expect(el.register.records).toBe(804);
    expect(el.register.uniqueLegal).toBe(795);
    expect(loadV4().entities.filter((e) => String(e.id).startsWith("el-eett-"))).toHaveLength(795);
  });

  it("records EE 51/19, LV 61, and leaves HU PT LT incomplete for operator census", () => {
    expect(loadV4().counts.find((c) => c.iso === "EE").register.records).toBe(51);
    expect(EE_COURIER_ACTIVE_2025).toHaveLength(19);
    expect(loadV4().counts.find((c) => c.iso === "LV").register.records).toBe(61);
    expect(loadV4().counts.find((c) => c.iso === "HU").verification).toBe("DATA_INCOMPLETE");
    expect(loadV4().counts.find((c) => c.iso === "PT").verification).toBe("DATA_INCOMPLETE");
    expect(loadV4().counts.find((c) => c.iso === "LT").verification).toBe("DATA_INCOMPLETE");
  });

  it("keeps locker/PUDO separate and does not invent postcode coverage", () => {
    expect(loadV4().lockers.some((n) => n.pointCount === 1869)).toBe(true);
    expect(loadV4().lockers.some((n) => n.operator === "Magyar Posta Zrt." && n.pointCount === 698)).toBe(true);
    expect(loadV4().pudo.some((n) => n.country === "HU")).toBe(true);
    expect(loadV4().entities.every((e) => e.postalCodeCoverage === "UNKNOWN" || e.coverageVerified === false)).toBe(true);
    expect(loadV4().apiDocs.every((r) => r.sandboxVerified === false && r.liveVerified === false)).toBe(true);
    expect(sourceVerified(loadV4().entities).length).toBe(loadV4().uniqueSourceVerified);
  });

  it("does not start live shipments and keeps sales closed", () => {
    const rec = recommend({ destination: "NL", origin: "DE", postalCode: "1012" });
    expect(rec.liveRate).toBe(false);
    expect(rec.cannotStartShipment).toBe(true);
    expect(rec.estimateIsNotPrice).toBe(true);
    expect(isSalesEnabled()).toBe(false);
    expect(requestQuoteTask({ destination: "PL" }).liveShipment).toBe(false);
    expect(loadV4().salesEnabled).toBe(false);
    expect(loadV4().liveShipment).toBe(false);
  });
});
