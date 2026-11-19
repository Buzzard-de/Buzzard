import { describe, expect, it } from "vitest";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { buildIntegrationSnapshots } = require("../lib/operations/integrationSnapshots.js");

describe("integration snapshots", () => {
  it("aggregates marketplace, payment, tecdoc and suppliers dry-run", () => {
    process.env.BUZZARD_SALES_ENABLED = "0";
    const snap = buildIntegrationSnapshots();
    expect(snap.live).toBe(false);
    expect(snap.marketplace.channelCount).toBe(10);
    expect(snap.hubSeo.ok).toBe(true);
    expect(snap.syntheticJourney.ok).toBe(true);
    expect(snap.shipping.liveShipment).toBe(false);
    expect(snap.pusatAutomation.ok).toBe(true);
    expect(snap.financeOps.taxConnect.filingLive).toBe(false);
  });
});