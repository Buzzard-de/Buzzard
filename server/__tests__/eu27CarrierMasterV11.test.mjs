import { createRequire } from "node:module";
import { existsSync } from "node:fs";
import { describe, expect, it } from "vitest";

const require = createRequire(import.meta.url);
const { loadV10 } = require("../lib/logistics/carrierMasterV10.js");
const { loadV11, uniqueIdsV11 } = require("../lib/logistics/carrierMasterV11.js");
const { documentationCatalog, createAdapter } = require("../lib/logistics/v5/adapterFramework.js");
const { germanyPilot } = require("../lib/logistics/v5/germanyPilot.js");
const { countryConfigs, isCountryEnabled } = require("../lib/logistics/v5/countryConfig.js");
const { selectCarrier } = require("../lib/logistics/v5/selectionEngine.js");
const { proposeFallback } = require("../lib/logistics/v5/fallbackEngine.js");
const { simulateOrderLogistics } = require("../lib/logistics/v5/orderLogisticsSim.js");
const { assessCustoms } = require("../lib/logistics/v5/customsTaxBridge.js");
const { councilStatus, mayShare } = require("../lib/logistics/v5/aiLogisticsCouncil.js");
const { quoteCost } = require("../lib/logistics/v5/costEngine.js");
const { connectMode } = require("../lib/logistics/v5/localConnectModes.js");
const { normalizeCarrierEvent } = require("../lib/logistics/v5/trackingNormalize.js");
const { startReturn } = require("../lib/logistics/v5/returnsEngine.js");
const { isSalesEnabled } = require("../lib/salesMode.js");

describe("EU27 carrier master v11 (MC14)", () => {
  it("preserves v1–v10 census and adds Hermes docs without live/sandbox", () => {
    for (const v of [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]) {
      expect(existsSync(`data/logistics/eu27_carrier_master.v${v}.json`)).toBe(true);
    }
    expect(existsSync("docs/MASTER_COMMAND/2026-11-07-mc13/MC13_EXECUTIVE_REPORT.md")).toBe(true);
    expect(loadV10().schema).toBe("buzzard.eu27-carrier-master.v10");
    expect(loadV11().schema).toBe("buzzard.eu27-carrier-master.v11");
    expect(uniqueIdsV11().unique).toBe(true);
    expect(loadV11().uniqueNamedLegalInDatabase).toBe(1602);
    expect(loadV11().uniqueLegalByCompanyKey).toBe(1465);
    expect(loadV11().v10Baseline.apiDocumentationEntries).toBe(16);
    expect(loadV11().documentationCatalog).toHaveLength(17);
    expect(loadV11().documentationCatalog.some((c) => c.carrierId === "hermes-germany-hsi")).toBe(true);
    expect(loadV11().independentCounts.parcel_service_true).toBe(0);
    expect(loadV11().sandboxVerifiedCarriers).toBe(0);
    expect(loadV11().technicallyUsableLiveCarriers).toBe(0);
    expect(isSalesEnabled()).toBe(false);
  });

  it("Germany pilot is MOCK/CODE_READY only; first sandbox candidate is DHL after contract", () => {
    const p = germanyPilot();
    expect(p.liveAuthorized).toBe(false);
    expect(p.recommendedFirstSandboxAfterContract).toBe("dhl-parcel-de");
    expect(p.carriers.every((c) => c.SANDBOX_VERIFIED === false && c.LIVE_AUTHORIZED === false)).toBe(true);
    expect(p.carriers.filter((c) => c.MOCK_TESTED)).toHaveLength(3);
    expect(p.functions.createShipment).toBe("CODE_READY_MOCK");
    expect(p.functions.label).toBe("CODE_READY_MOCK");
    expect(countryConfigs()).toHaveLength(27);
    expect(isCountryEnabled("DE")).toBe(true);
    expect(isCountryEnabled("FR")).toBe(false);
    expect(countryConfigs().every((c) => c.liveShipment === false && c.salesEnabled === false)).toBe(true);
  });

  it("shared adapter aliases stay mock/blocked; generateLabel never live", () => {
    const a = createAdapter({ carrierId: "dhl-parcel-de", apiLevel: 2 });
    expect(a.createShipment().live).toBe(false);
    expect(a.generateLabel().live).toBe(false);
    const tracking = a.getTracking("X");
    expect(tracking.ok).toBe(false);
    expect(tracking.mock).toBe(false);
    expect(tracking.live).toBe(false);
    expect(tracking.status).toBe("BLOCKED_EXTERNAL");
    expect(a.circuitBreaker).toBe("CLOSED_UNKNOWN_HEALTH");
    const down = createAdapter({ outage: true });
    expect(down.circuitBreaker).toBe("OPEN");
    expect(documentationCatalog().every((c) => c.sandboxVerified === false)).toBe(true);
  });

  it("selection, fallback, order sim, customs hold, costs UNKNOWN, AI cannot commit", () => {
    const sel = selectCarrier({ origin: "DE-10115", destination: "DE", postalCode: "10115" });
    expect(sel.selected).toBeNull();
    expect(sel.autoselectAllowed).toBe(false);
    expect(proposeFallback({ reason: "CARRIER_OUTAGE" }).autoTransfer).toBe(false);
    expect(simulateOrderLogistics({ destination: "DE", postalCode: "10115" }).boundToRealOrders).toBe(false);
    expect(assessCustoms({ originCountry: "TR", destCountry: "DE" }).hold).toBe(true);
    expect(assessCustoms({ originCountry: "DE", destCountry: "FR", productClass: "x", partyKnown: true }).liveDeclaration).toBe(false);
    expect(quoteCost({ country: "DE" }).total).toBe("UNKNOWN");
    expect(quoteCost({ country: "DE" }).estimateIsNotPrice).toBe(true);
    expect(councilStatus().commercialCommitForbidden).toBe(true);
    expect(mayShare({ fromId: "logistics_ai", classification: "restricted" })).toBe(false);
    expect(connectMode("MANUAL_ASSISTED").pretendsToBeApi).toBe(false);
    expect(normalizeCarrierEvent({ code: "mystery" }).customerVisible).toBe("NO_VERIFIED_TRACKING");
    expect(startReturn({}).supplierRefundReceived).toBe(false);
  });

  it("MC14 reports folder exists after write", () => {
    expect(existsSync("docs/MASTER_COMMAND/2026-11-07-mc14/MC14_EXECUTIVE_REPORT.md")).toBe(true);
    expect(existsSync("docs/MASTER_COMMAND/2026-11-07-mc14/NEXT_CHECKPOINT.md")).toBe(true);
    expect(existsSync("docs/MASTER_COMMAND/2026-11-07-continuation/NEXT_CHECKPOINT.md")).toBe(true);
  });
});
