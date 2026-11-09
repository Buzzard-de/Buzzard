import { createRequire } from "node:module";
import { describe, expect, it } from "vitest";

const require = createRequire(import.meta.url);
const { runDryRun } = require("../lib/logistics/v5/operationsPlane.js");
const { statusSnapshot } = require("../lib/logistics/v5/statusSnapshot.js");
const { countryProfiles } = require("../lib/logistics/v5/countryProfiles.js");
const { recommend } = require("../lib/logistics/selectCarrier.js");
const { planLogisticsDryRun } = require("../lib/commerce/orderService.js");
const { compareCarriers } = require("../lib/commerce/ab27Logistics.js");
const { notifyCustomer } = require("../lib/logistics/v5/notifyStub.js");
const { isSalesEnabled } = require("../lib/salesMode.js");

describe("EU27 logistics operations plane (MC14 continuation)", () => {
  it("dry-run pipeline never starts a shipment or sends notify", () => {
    const run = runDryRun({ destination: "DE", postalCode: "10115", originCountry: "DE" });
    expect(run.live).toBe(false);
    expect(run.cannotStartShipment).toBe(true);
    expect(run.boundToRealOrders).toBe(false);
    expect(run.notify.sent).toBe(false);
    expect(run.logistics.selection.selected).toBeNull();
    expect(run.cost.total).toBe("UNKNOWN");
    expect(run.fallback.autoTransfer).toBe(false);
    expect(run.customs.liveDeclaration).toBe(false);
    expect(isSalesEnabled()).toBe(false);
  });

  it("status snapshot and 27 country profiles stay non-live", () => {
    const snap = statusSnapshot();
    expect(snap.liveUsableCarriers).toBe(0);
    expect(snap.quality.apiDocs).toBe(17);
    expect(snap.quality.named).toBe(1602);
    expect(countryProfiles()).toHaveLength(27);
    expect(countryProfiles().every((c) => c.liveShipment === false)).toBe(true);
    expect(countryProfiles().find((c) => c.iso === "DE").enabled).toBe(true);
  });

  it("legacy AB27 numeric quote is marked invented; recommend uses v5 selected=null", () => {
    expect(compareCarriers({ destination: "DE" }).priceInvented).toBe(true);
    const rec = recommend({ destination: "DE", origin: "DE", postalCode: "10115" });
    expect(rec.selected).toBeNull();
    expect(rec.legacyMockQuote.notForAutoselect).toBe(true);
    expect(rec.cannotStartShipment).toBe(true);
    expect(planLogisticsDryRun({ destination: "FR" }).live).toBe(false);
    expect(notifyCustomer({ verified: true }).sent).toBe(false);
  });
});
