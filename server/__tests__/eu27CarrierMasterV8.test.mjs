import { createRequire } from "node:module";
import { existsSync } from "node:fs";
import { describe, expect, it } from "vitest";

const require = createRequire(import.meta.url);
const { loadV7 } = require("../lib/logistics/carrierMasterV7.js");
const { loadV8, uniqueIdsV8 } = require("../lib/logistics/carrierMasterV8.js");
const { countryList, lookupCoverage, classifyCoverageGranularity } = require("../lib/logistics/v5/coverageEngine.js");
const { selectCarrier } = require("../lib/logistics/v5/selectionEngine.js");
const { documentationCatalog, priorityCatalog } = require("../lib/logistics/v5/adapterFramework.js");
const { classifyParty } = require("../lib/logistics/v5/supplierCarrier.js");
const { legalKey } = require("../lib/logistics/v5/identityResolver.js");
const { SERVICE_STATUS } = require("../lib/logistics/v5/serviceVerification.js");
const { isSalesEnabled } = require("../lib/salesMode.js");

describe("EU27 carrier master v8 (MC12)", () => {
  it("preserves v1–v7 files and MC11 frozen census", () => {
    for (const v of [1, 2, 3, 4, 5, 6, 7]) {
      expect(existsSync(`data/logistics/eu27_carrier_master.v${v}.json`)).toBe(true);
    }
    expect(existsSync("docs/MASTER_COMMAND/2026-11-06-mc11/MC11_EXECUTIVE_REPORT.md")).toBe(true);
    expect(loadV7().uniqueNamedLegalInDatabase).toBe(1602);
    expect(loadV8().schema).toBe("buzzard.eu27-carrier-master.v8");
    expect(uniqueIdsV8().unique).toBe(true);
    expect(loadV8().uniqueNamedLegalInDatabase).toBe(1602);
    expect(loadV8().uniqueLegalByCompanyKey).toBe(1465);
    expect(loadV8().registerLayerSum).toBe(17453);
    expect(loadV8().mc11Baseline.apiDocumentationEntries).toBe(7);
    expect(loadV8().qualityMetrics.apiDocumentationCount).toBeGreaterThanOrEqual(7);
    expect(loadV8().completeVerifiedCountries).toBe(0);
    expect(loadV8().sandboxVerifiedCarriers).toBe(0);
    expect(loadV8().technicallyUsableLiveCarriers).toBe(0);
    expect(isSalesEnabled()).toBe(false);
  });

  it("keeps 27-country integrity and postcode UNKNOWN granularity", () => {
    expect(countryList()).toHaveLength(27);
    expect(loadV8().coverage).toHaveLength(27);
    expect(loadV8().coverage.every((c) => c.coverageGranularity === "UNKNOWN")).toBe(true);
    expect(classifyCoverageGranularity({})).toBe("UNKNOWN");
    expect(lookupCoverage({ country: "FR", postalCode: "75001" }).coverageGranularity).toBe("UNKNOWN");
    expect(lookupCoverage({ country: "XX" }).supported).toBe(false);
  });

  it("separates legal name from brand; licence is not parcel or last-mile proof", () => {
    const e = loadV8().entities.find((x) => x.class === "NATIONAL_POST_USP");
    expect(e.legalName).toBeTruthy();
    expect(e.brand).toBeTruthy();
    expect(legalKey(e)).toContain(e.hqCountry);
    expect(e.serviceVerification.last_mile_verified).toBe(false);
    expect(e.serviceVerification.own_fleet_verified).toBe(false);
    expect(e.serviceVerification.live_contract_ready).toBe(false);
    expect(SERVICE_STATUS).toContain(e.serviceVerification.status);
    expect(loadV8().entities.filter((x) => x.class === "ACM_POSTVERVOERDIENST").every((x) => x.serviceVerification.status !== "PARCEL_SERVICE_VERIFIED")).toBe(true);
    expect(loadV8().qualityMetrics.parcelServiceVerifiedCount).toBe(0);
    expect(loadV8().qualityMetrics.lastMileVerifiedCount).toBe(0);
  });

  it("API maturity: extra docs are level 1; sandbox cannot become live", () => {
    expect(priorityCatalog().every((c) => c.apiLevel === 2 && c.sandboxVerified === false)).toBe(true);
    const docs = documentationCatalog();
    expect(docs.length).toBeGreaterThan(7);
    expect(docs.every((c) => c.sandboxVerified === false && c.mc11Maturity < 4)).toBe(true);
    expect(docs.filter((c) => c.mc11Maturity === 3)).toHaveLength(3);
    expect(docs.some((c) => c.carrierId === "inpost-group-developers")).toBe(true);
  });

  it("selection does not invent price/ETA, does not autoselect UNKNOWN coverage, records fallback", () => {
    const sel = selectCarrier({
      origin: "DE-10115",
      destination: "DE",
      postalCode: "10115",
      preferCheapest: true,
    });
    expect(sel.autoselectAllowed).toBe(false);
    expect(sel.priceInvented).toBe(false);
    expect(sel.etaInvented).toBe(false);
    expect(sel.internationalBrandNotAutoPreferred).toBe(true);
    expect(sel.cannotStartShipment).toBe(true);
    expect(sel.fallback).toBeTruthy();
    expect(sel.customerDeliveryDate).toBe("NOT_PROMISED");
    expect(sel.explanation.some((x) => x.code === "COVERAGE_GRANULARITY_NOT_POSTCODE_LEVEL")).toBe(true);
  });

  it("supplier/carrier split and blocked probes remain honest", () => {
    expect(classifyParty({ suppliesGoods: true, transports: true, ownFleetVerified: false }).mergeForbidden).toBe(true);
    expect(loadV8().supplierCarrier.verifiedCarrierUsesSubcontractor).toEqual([]);
    expect(loadV8().accessProbes.find((p) => p.iso === "RO").tls).toBe("CERTIFICATE_VERIFY_FAILED");
    expect(loadV8().accessProbes.find((p) => p.iso === "HU").result).toBe("BLOCKED");
    expect(loadV8().countryCompletion.filter((c) => c.completion === "BLOCKED").map((c) => c.iso).sort()).toEqual(["HU", "LT", "PT", "RO"]);
    expect(loadV8().countryCompletion.every((c) => c.completeVerified === false)).toBe(true);
  });
});
