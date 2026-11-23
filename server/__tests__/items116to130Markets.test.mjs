import { readFileSync } from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { describe, expect, it } from "vitest";

const require = createRequire(import.meta.url);
const { AB27, getStandardVat } = require("../lib/commerce/ab27Tax");
const { POOL_COUNTRIES, snapshot: poolSnapshot } = require("../lib/commerce/taxPools");
const { dryRun } = require("../lib/commerce/carrierAdapters");
const { snapshot } = require("../lib/marketplace/marketplaceConnectorRegistry");
const locales = require("../../lib/i18n/supported-locales.json");

describe("items 116-130 markets and publish locks", () => {
  it("lists AB27 VAT and keeps pools without payment authority", () => {
    expect(AB27).toHaveLength(27);
    expect(getStandardVat("DE")).toBe(19);
    expect(getStandardVat("GR")).toBe(24);
    expect(getStandardVat("US")).toBeNull();
    expect(POOL_COUNTRIES).toHaveLength(26);
    expect(POOL_COUNTRIES).not.toContain("DE");
    expect(poolSnapshot("FR").paymentAuthority).toBe(false);
    expect(locales).toContain("ar");
    expect(locales.length).toBeGreaterThanOrEqual(30);
  });

  it("blocks live shipment and live marketplace publish", () => {
    expect(dryRun({ destination: "DE", action: "label" }).code).toBe("LIVE_SHIPMENT_BLOCKED");
    expect(dryRun({ destination: "DE", action: "quote" }).live).toBe(false);
    expect(snapshot().anyLive).toBe(false);
    expect(snapshot().allBlocked).toBe(true);
    const rtl = readFileSync(path.join(__dirname, "../../styles/rtl.css"), "utf8");
    expect(rtl).toContain('html[dir="rtl"]');
  });
});
