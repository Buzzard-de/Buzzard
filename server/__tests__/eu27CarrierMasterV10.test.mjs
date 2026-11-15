import { createRequire } from "node:module";
import { existsSync } from "node:fs";
import { describe, expect, it } from "vitest";

const require = createRequire(import.meta.url);
const { loadV8 } = require("../lib/logistics/carrierMasterV8.js");
const { loadV9 } = require("../lib/logistics/carrierMasterV9.js");
const { loadV10, uniqueIdsV10 } = require("../lib/logistics/carrierMasterV10.js");
const { countryList, lookupCoverage } = require("../lib/logistics/v5/coverageEngine.js");
const { selectCarrier } = require("../lib/logistics/v5/selectionEngine.js");
const { documentationCatalog } = require("../lib/logistics/v5/adapterFramework.js");
const { classifyParty, linkSupplierCarrier } = require("../lib/logistics/v5/supplierCarrier.js");
const { legalKey } = require("../lib/logistics/v5/identityResolver.js");
const { isSalesEnabled } = require("../lib/salesMode.js");

describe("EU27 carrier master v10 (MC13)", () => {
  it("preserves v1–v9 and does not invent new legal names", () => {
    for (const v of [1, 2, 3, 4, 5, 6, 7, 8, 9]) {
      expect(existsSync(`data/logistics/eu27_carrier_master.v${v}.json`)).toBe(true);
    }
    expect(existsSync("docs/MASTER_COMMAND/2026-11-06-mc12/MC12_EXECUTIVE_REPORT.md")).toBe(true);
    expect(loadV8().schema).toBe("buzzard.eu27-carrier-master.v8");
    expect(loadV9().schema).toBe("buzzard.eu27-carrier-master.v9");
    expect(loadV10().schema).toBe("buzzard.eu27-carrier-master.v10");
    expect(uniqueIdsV10().unique).toBe(true);
    expect(loadV10().uniqueNamedLegalInDatabase).toBe(1602);
    expect(loadV10().uniqueLegalByCompanyKey).toBe(1465);
    expect(loadV10().newLegalEntitiesMc13).toBe(0);
    expect(loadV10().newLocalRegionalVerifiedMc13).toBe(0);
    expect(loadV10().independentCounts.parcel_service_true).toBe(0);
    expect(loadV10().independentCounts.last_mile_true).toBe(0);
    expect(loadV10().independentCounts.own_fleet_true).toBe(0);
    expect(isSalesEnabled()).toBe(false);
  });

  it("27 countries, brand≠legal key, independent UNKNOWN not false-as-proof", () => {
    expect(countryList()).toHaveLength(27);
    expect(loadV10().coverage.every((c) => c.coverageGranularity === "UNKNOWN")).toBe(true);
    expect(lookupCoverage({ country: "IT", postalCode: "00100" }).coverageGranularity).toBe("UNKNOWN");
    const usp = loadV10().entities.find((e) => e.class === "NATIONAL_POST_USP");
    expect(usp.legalName).not.toBe(usp.brand);
    expect(legalKey(usp)).toContain(usp.hqCountry);
    expect(usp.independentEvidence.parcel_service).toBe("UNKNOWN");
    expect(usp.independentEvidence.own_fleet).toBe("UNKNOWN");
    expect(loadV10().localRegionalClassRows.every((r) => r.newInMc13 === false)).toBe(true);
  });

  it("API functionality and sandbox classification stay below verified", () => {
    const docs = documentationCatalog();
    expect(docs.length).toBe(loadV10().apiFunctionality.length);
    expect(loadV10().sandboxReadiness.every((s) => s.SANDBOX_VERIFIED === false && s.LIVE_CONTRACT_READY === false)).toBe(true);
    expect(loadV10().sandboxReadiness.filter((s) => s.MOCK_TESTED)).toHaveLength(3);
    expect(loadV10().sandboxReadiness.filter((s) => s.SANDBOX_READY)).toHaveLength(0);
    expect(loadV10().qualityMetrics.adapterDesignReady).toBe(docs.length);
    const dpd = loadV10().sandboxReadiness.find((s) => s.carrierId === "dpd-baltic-rest");
    expect(dpd.sandboxUrlDocumented).toBe(true);
    expect(dpd.SANDBOX_VERIFIED).toBe(false);
  });

  it("selection: no autoselect, no invented price, fallback listed, local not auto-outranked", () => {
    const sel = selectCarrier({ origin: "SI-1000", destination: "SI", postalCode: "1000" });
    expect(sel.selected).toBeNull();
    expect(sel.fallback).toBeTruthy();
    expect(sel.autoselectAllowed).toBe(false);
    expect(sel.priceInvented).toBe(false);
    expect(sel.localNotAutomaticallyOutranked).toBe(true);
    expect(sel.missingInformation).toContain("POSTCODE_COVERAGE");
    expect(sel.confidence).toBe("LOW");
  });

  it("supplier-carrier many-to-many without merging unverified fleet", () => {
    expect(classifyParty({ suppliesGoods: true }).role).toBe("SUPPLIER");
    expect(linkSupplierCarrier({ supplierId: "sup-1", carrierId: "car-1" }).edge.type).toBe("SUPPLIER_USES_CARRIER");
    expect(linkSupplierCarrier({ supplierId: "same", carrierId: "same" }).error).toBe("SUPPLIER_IS_NOT_CARRIER_WITHOUT_OWN_FLEET");
    expect(loadV10().supplierCarrier.cardinality.supplierToCarriers).toBe("0..n");
    expect(loadV10().supplierCarrier.edges).toEqual([]);
  });
});
