import { createRequire } from "node:module";
import { existsSync } from "node:fs";
import { describe, expect, it } from "vitest";

const require = createRequire(import.meta.url);
const { load } = require("../lib/logistics/carrierMaster.js");
const { loadV2 } = require("../lib/logistics/carrierMasterV2.js");
const { loadV3 } = require("../lib/logistics/carrierMasterV3.js");
const { loadV4 } = require("../lib/logistics/carrierMasterV4.js");
const { loadV5, uniqueIdsV5, sourceVerified } = require("../lib/logistics/carrierMasterV5.js");
const { HR_HAKOM_UNIQUE, AT_PEV } = require("../lib/logistics/eu27SeedV5.js");
const { selectCarrier, mockShipmentLifecycle } = require("../lib/logistics/v5/selectionEngine.js");
const { lookupCoverage, isValidPostcodeShape } = require("../lib/logistics/v5/coverageEngine.js");
const { createAdapter, normalizeTracking, priorityCatalog } = require("../lib/logistics/v5/adapterFramework.js");
const { engineStatus, costModel } = require("../lib/logistics/v5/integrationEngine.js");
const { dedupe, isLikelyNaturalPerson } = require("../lib/logistics/v5/identityResolver.js");
const { resetAudit, listAudit } = require("../lib/logistics/v5/auditLog.js");
const { isSalesEnabled } = require("../lib/salesMode.js");

describe("EU27 carrier master v5", () => {
  it("preserves v1-v4 files and schemas", () => {
    expect(existsSync("data/logistics/eu27_carrier_master.v1.json")).toBe(true);
    expect(existsSync("data/logistics/eu27_carrier_master.v2.json")).toBe(true);
    expect(existsSync("data/logistics/eu27_carrier_master.v3.json")).toBe(true);
    expect(existsSync("data/logistics/eu27_carrier_master.v4.json")).toBe(true);
    expect(load().schema).toBe("buzzard.eu27-carrier-master.v1");
    expect(loadV2().schema).toBe("buzzard.eu27-carrier-master.v2");
    expect(loadV3().schema).toBe("buzzard.eu27-carrier-master.v3");
    expect(loadV4().schema).toBe("buzzard.eu27-carrier-master.v4");
    expect(loadV5().schema).toBe("buzzard.eu27-carrier-master.v5");
    expect(loadV5().countries).toHaveLength(27);
    expect(uniqueIdsV5().unique).toBe(true);
    expect(loadV5().completeVerifiedCountries).toBe(0);
  });

  it("does not treat Eurostat H53 or 197424 as parcel carriers", () => {
    const s = loadV5().naceStatistics;
    expect(s.doNotUseAsActiveParcelCarriers).toBe(true);
    expect(s.historical197424.reproducedInEurostatPull2026_09_30).toBe(false);
    expect(s.eurostatSbs.eu27["2024"]).toBe(224523);
    expect(s.eurostatSbs.eu27["2022"]).toBe(200000);
    expect(s.elaLabour2024.enterprisesApproximate).toBe(60000);
    expect(s.elaLabour2024.doNotMergeWithEurostatSbs).toBe(true);
    expect(s.eurostatSbs.notParcelCarrierCensus).toBe(true);
  });

  it("records HAKOM unique names and PEV 16, leaves HU/PT/LT incomplete", () => {
    expect(loadV5().counts.find((c) => c.iso === "HR").register.records).toBe(24);
    expect(loadV5().counts.find((c) => c.iso === "HR").register.uniqueLegal).toBe(HR_HAKOM_UNIQUE.length);
    expect(AT_PEV).toHaveLength(16);
    expect(loadV5().counts.find((c) => c.iso === "AT").register.uniqueLegal).toBe(16);
    expect(loadV5().austria138.status).toBe("NOT_FOUND_IN_FETCHED_RTR_2024_REPORT");
    expect(loadV5().counts.find((c) => c.iso === "HU").verification).toBe("DATA_INCOMPLETE");
    expect(loadV5().counts.find((c) => c.iso === "PT").verification).toBe("DATA_INCOMPLETE");
    expect(loadV5().counts.find((c) => c.iso === "LT").verification).toBe("DATA_INCOMPLETE");
  });

  it("separates lockers, suppliers, letter/parcel, and NL/EL misclassification", () => {
    expect(loadV5().lockers.length).toBeGreaterThan(0);
    expect(loadV5().derivedClassifications.nlPostNotRegionalCourier).toBe(true);
    expect(loadV5().derivedClassifications.elNotAllRegionalCarriers).toBe(true);
    expect(isLikelyNaturalPerson("ΜΑΛΑΒΕΤΣΗ ΜΑΡΙΕΤΑ")).toBe(true);
    expect(isLikelyNaturalPerson("DPD (Nederland) B.V.")).toBe(false);
    const d = dedupe(sourceVerified(loadV5().entities));
    expect(d.unique).toBe(loadV5().uniqueLegalByCompanyKey);
  });

  it("keeps API at docs-only and blocks live shipment lifecycle", () => {
    expect(priorityCatalog().every((c) => c.apiLevel === 2 && c.sandboxVerified === false)).toBe(true);
    expect(engineStatus().technicallyUsableLiveCarriers).toBe(0);
    const ad = createAdapter({ carrierId: "dhl-parcel-de", apiLevel: 2 });
    expect(ad.createShipment({}).blocked).toBe(true);
    expect(ad.createLabel().code).toBe("LIVE_SHIPMENT_DISABLED");
    expect(normalizeTracking([{ code: "X" }])[0].live).toBe(false);
    expect(costModel().baseRate).toBe("UNKNOWN");
    expect(isSalesEnabled()).toBe(false);
  });

  it("handles coverage, fallback, invalid postcode, unsupported dest, mock returns, audit", () => {
    resetAudit();
    expect(lookupCoverage({ country: "US", postalCode: "10001" }).reason).toBe("UNSUPPORTED_DESTINATION");
    expect(isValidPostcodeShape("DE", "10115")).toBe(true);
    expect(isValidPostcodeShape("DE", "ABC")).toBe(false);
    expect(lookupCoverage({ country: "DE", postalCode: "10115" }).delivery_available).toBe("UNKNOWN");
    const sel = selectCarrier({ origin: "DE", destination: "NL", postalCode: "1012 AB", preferCheapest: true });
    expect(sel.cheapestNotAutoSelected).toBe(true);
    expect(sel.ignoredPreferCheapest).toBe(true);
    expect(sel.cannotStartShipment).toBe(true);
    expect(sel.customerDeliveryDate).toBe("NOT_PROMISED");
    expect(sel.supplierIsNotCarrier).toBe(true);
    expect(sel.fallback).not.toBeNull();
    const life = mockShipmentLifecycle(sel);
    expect(life.createShipment.blocked).toBe(true);
    expect(life.track.mock).toBe(true);
    expect(life.returns.data.status).toBe("MOCK_RETURN_NOT_LIVE");
    expect(listAudit().length).toBeGreaterThan(0);
    expect(loadV5().coverage).toHaveLength(27);
    expect(loadV5().coverage.every((c) => c.coverageVerified === false)).toBe(true);
  });
});
