import { createRequire } from "node:module";
import { existsSync } from "node:fs";
import { describe, expect, it } from "vitest";

const require = createRequire(import.meta.url);
const { loadV8 } = require("../lib/logistics/carrierMasterV8.js");
const { loadV9, uniqueIdsV9 } = require("../lib/logistics/carrierMasterV9.js");
const { documentationCatalog, priorityCatalog } = require("../lib/logistics/v5/adapterFramework.js");
const { postcodePortalRegistry, classifyCoverageGranularity } = require("../lib/logistics/v5/coverageEngine.js");
const { selectCarrier } = require("../lib/logistics/v5/selectionEngine.js");
const { isSalesEnabled } = require("../lib/salesMode.js");

describe("EU27 carrier master v9 (2026-11-07 continuation)", () => {
  it("preserves v1–v8 files and MC12 frozen census", () => {
    for (const v of [1, 2, 3, 4, 5, 6, 7, 8]) {
      expect(existsSync(`data/logistics/eu27_carrier_master.v${v}.json`)).toBe(true);
    }
    expect(loadV8().uniqueNamedLegalInDatabase).toBe(1602);
    expect(loadV9().schema).toBe("buzzard.eu27-carrier-master.v9");
    expect(uniqueIdsV9().unique).toBe(true);
    expect(loadV9().uniqueNamedLegalInDatabase).toBe(1602);
    expect(loadV9().uniqueLegalByCompanyKey).toBe(1465);
    expect(loadV9().registerLayerSum).toBe(17453);
    expect(loadV9().mc12Baseline.apiDocumentationEntries).toBe(12);
    expect(loadV9().qualityMetrics.parcelServiceVerifiedCount).toBe(0);
    expect(loadV9().namedFirmReview.parcelServiceVerified).toBe(0);
    expect(loadV9().sandboxVerifiedCarriers).toBe(0);
    expect(loadV9().technicallyUsableLiveCarriers).toBe(0);
    expect(isSalesEnabled()).toBe(false);
  });

  it("documents postcode portals without claiming carrier coverage or ingest", () => {
    const portals = postcodePortalRegistry();
    expect(portals.eu.licenseFromPublicPage).toBe("CC-BY-SA-4.0");
    expect(portals.eu.fileIngested).toBe(false);
    expect(portals.eu.carrierCoverageVerified).toBe(false);
    expect(portals.countries).toHaveLength(27);
    expect(portals.countries.find((c) => c.iso === "AT").fileIngested).toBe(false);
    expect(classifyCoverageGranularity({})).toBe("UNKNOWN");
    expect(loadV9().coverage.every((c) => c.coverageGranularity === "UNKNOWN")).toBe(true);
  });

  it("adds official API docs at maturity 1; documented sandbox host is not a passed test", () => {
    expect(priorityCatalog().every((c) => c.sandboxVerified === false)).toBe(true);
    const docs = documentationCatalog();
    expect(docs.length).toBeGreaterThan(12);
    expect(docs.every((c) => c.sandboxVerified === false && c.mc11Maturity < 4)).toBe(true);
    const baltic = docs.find((c) => c.carrierId === "dpd-baltic-rest");
    expect(baltic.sandboxHostDocumented).toContain("sandbox-esiunta.dpd.lt");
    expect(baltic.sandboxVerified).toBe(false);
    expect(docs.some((c) => c.carrierId === "austrian-post-group-developer")).toBe(true);
    expect(docs.some((c) => c.carrierId === "fan-courier-selfawb")).toBe(true);
  });

  it("still will not autoselect or invent rates", () => {
    const sel = selectCarrier({ origin: "AT-1010", destination: "AT", postalCode: "1010" });
    expect(sel.autoselectAllowed).toBe(false);
    expect(sel.priceInvented).toBe(false);
    expect(sel.cannotStartShipment).toBe(true);
  });
});
