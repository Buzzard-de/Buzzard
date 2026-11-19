import { describe, expect, it } from "vitest";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { getIntegrationStatus } = require("../lib/commercialIntegrations.js");

describe("commercial integration status", () => {
  it("includes operational snapshot without enabling live", () => {
    process.env.BUZZARD_SALES_ENABLED = "0";
    const status = getIntegrationStatus();
    expect(status.operational.live).toBe(false);
    expect(status.operational.marketplace.channelCount).toBe(10);
    expect(status.operational.pusatAutomation.ok).toBe(true);
  });
});