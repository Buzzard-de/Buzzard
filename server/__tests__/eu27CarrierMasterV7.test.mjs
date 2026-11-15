import { createRequire } from "node:module";
import { existsSync } from "node:fs";
import { describe, expect, it } from "vitest";

const require = createRequire(import.meta.url);
const { load } = require("../lib/logistics/carrierMaster.js");
const { loadV6, uniqueIdsV6 } = require("../lib/logistics/carrierMasterV6.js");
const { loadV7, uniqueIdsV7 } = require("../lib/logistics/carrierMasterV7.js");
const { countryList, lookupCoverage, isValidPostcodeShape } = require("../lib/logistics/v5/coverageEngine.js");
const { selectCarrier } = require("../lib/logistics/v5/selectionEngine.js");
const { documentationCatalog, priorityCatalog } = require("../lib/logistics/v5/adapterFramework.js");
const { classifyParty } = require("../lib/logistics/v5/supplierCarrier.js");
const { legalKey, dedupe } = require("../lib/logistics/v5/identityResolver.js");
const { isSalesEnabled } = require("../lib/salesMode.js");

describe("EU27 carrier master v7 (MC11)", () => {
  it("preserves v1–v6 files and frozen v6 census", () => {
    for (const v of [1, 2, 3, 4, 5, 6]) {
      expect(existsSync(`data/logistics/eu27_carrier_master.v${v}.json`)).toBe(true);
    }
    expect(load().uniqueVerifiedLegal).toBe(43);
    expect(loadV6().schema).toBe("buzzard.eu27-carrier-master.v6");
    expect(uniqueIdsV6().unique).toBe(true);
    expect(loadV7().schema).toBe("buzzard.eu27-carrier-master.v7");
    expect(uniqueIdsV7().unique).toBe(true);
    expect(loadV7().uniqueNamedLegalInDatabase).toBe(1602);
    expect(loadV7().uniqueLegalByCompanyKey).toBe(1465);
    expect(loadV7().registerLayerSum).toBe(17453);
    expect(loadV7().v6BaselineFrozen.namedEntities).toBe(1602);
    expect(loadV7().completeVerifiedCountries).toBe(0);
    expect(loadV7().technicallyUsableLiveCarriers).toBe(0);
    expect(loadV7().sandboxVerifiedCarriers).toBe(0);
    expect(loadV7().qualityMetrics.liveUsableCarrierCount).toBe(0);
    expect(loadV7().qualityMetrics.sandboxTestSuccessCount).toBe(0);
    expect(loadV7().qualityMetrics.postcodeCoverageVerifiedCountryCount).toBe(0);
    expect(isSalesEnabled()).toBe(false);
  });

  it("maps 27 countries and GR→EL; postcode coverage stays UNKNOWN", () => {
    expect(countryList()).toHaveLength(27);
    expect(loadV7().coverage).toHaveLength(27);
    expect(loadV7().coverage.every((c) => c.nationalCoverageVerified === false && c.status === "UNKNOWN")).toBe(true);
    const cov = lookupCoverage({ country: "GR", postalCode: "10431" });
    expect(cov.country_code).toBe("EL");
    expect(cov.delivery_available).toBe("UNKNOWN");
    expect(isValidPostcodeShape("DE", "10115")).toBe(true);
    expect(isValidPostcodeShape("DE", "ABC")).toBe(false);
  });

  it("does not merge brand-country legal entities or licence with parcel proof", () => {
    const keys = loadV7().entities.map((e) => legalKey(e));
    const dhl = loadV7().entities.filter((e) => /DHL/i.test(String(e.brand || "") + String(e.legalName || "")));
    const countries = new Set(dhl.map((e) => e.hqCountry));
    expect(countries.size).toBeGreaterThan(1);
    expect(dedupe(loadV7().entities).unique).toBeGreaterThan(1000);
    expect(keys.length).toBe(loadV7().entities.length);
    expect(loadV7().entities.filter((e) => e.class === "ACM_POSTVERVOERDIENST").every((e) => e.parcel_service_verified !== "PARCEL_SERVICE_VERIFIED")).toBe(true);
    expect(loadV7().entities.every((e) => e.evidence && e.evidence.live_usable === false)).toBe(true);
    expect(loadV7().qualityMetrics.parcelServiceVerifiedCount).toBe(0);
    expect(loadV7().qualityMetrics.ownFleetVerifiedCount).toBe(0);
  });

  it("keeps DHL/GLS/UPS apiLevel 2; MC11 maturity 3 mock only; extra docs are not live", () => {
    expect(priorityCatalog().every((c) => c.apiLevel === 2 && c.sandboxVerified === false)).toBe(true);
    const docs = documentationCatalog();
    expect(docs.every((c) => c.sandboxVerified === false && c.mc11Maturity < 4)).toBe(true);
    expect(docs.filter((c) => c.mc11Maturity === 3).map((c) => c.carrierId).sort()).toEqual([
      "dhl-parcel-de",
      "gls-shipit",
      "ups-developer",
    ]);
    expect(loadV7().documentationCatalog.length).toBeGreaterThanOrEqual(7);
  });

  it("supplier is not carrier without own-fleet evidence; selection explains hold", () => {
    expect(classifyParty({ suppliesGoods: true, transports: true, ownFleetVerified: false }).mergeForbidden).toBe(true);
    expect(classifyParty({ suppliesGoods: true, transports: true, ownFleetVerified: true }).role).toBe("SUPPLIER_CARRIER");
    expect(loadV7().supplierCarrier.supplier.isCarrier).toBe(false);
    const sel = selectCarrier({ destination: "DE", postalCode: "10115", preferCheapest: true });
    expect(sel.cannotStartShipment).toBe(true);
    expect(sel.ignoredPreferCheapest).toBe(true);
    expect(sel.explanation.some((x) => x.code === "POSTCODE_COVERAGE_UNKNOWN" || x.code === "PREFER_CHEAPEST_DISABLED")).toBe(true);
    expect(sel.customerDeliveryDate).toBe("NOT_PROMISED");
    expect(sel.selected && sel.selected.liveVerified).not.toBe(true);
  });

  it("records blocked probes without insecure bypass", () => {
    const probes = loadV7().accessProbes;
    expect(probes.find((p) => p.iso === "RO").tls).toBe("CERTIFICATE_VERIFY_FAILED");
    expect(probes.find((p) => p.iso === "HU").result).toBe("BLOCKED");
    expect(probes.find((p) => p.iso === "PT" && p.http === 403).result).toBe("BLOCKED");
    expect(probes.filter((p) => p.iso === "HR")[0].result).toBe("CONFIRMED_UNCHANGED");
    expect(probes.filter((p) => p.iso === "AT")[0].result).toBe("CONFIRMED_UNCHANGED");
  });
});
