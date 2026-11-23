import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { describe, expect, it } from "vitest";

const root = path.resolve(__dirname, "../..");
const require = createRequire(import.meta.url);
const { publishCampaign } = require("../lib/marketing/influencerIdentities");
const { validateMarketplaceListing } = require("../lib/storefront/merchantFeedService");
const { getAdapter, snapshot } = require("../lib/logistics/carrierContract");
const { send } = require("../lib/comms/whatsappSandbox");
const { startReturn } = require("../lib/logistics/v5/returnsEngine");
const { PRODUCTION_SAFETY_LOCK } = require("../lib/commerce/goLiveApproval");
const { isSalesEnabled } = require("../lib/salesMode");
const { getOrderHistoryReadiness } = require("../lib/customer/customerOrderBridge");

function text(rel) {
  return readFileSync(path.join(root, rel), "utf8");
}

describe("items 131-167 storefront and carrier locks", () => {
  it("keeps language and country on separate controls", () => {
    const market = text("lib/market/context.tsx");
    expect(market).not.toContain("setLocale");
    expect(text("components/CountrySelector.tsx")).toContain("setCountryCode");
    expect(text("components/CountrySelector.tsx")).not.toContain("setLocale");
    expect(text("components/LanguageSelector.tsx")).toContain("setLocale");
    expect(text("components/LanguageSelector.tsx")).not.toContain("setCountryCode");
    expect(text("lib/market/storage.ts")).toContain("buzzard_market_country");
    expect(text("lib/i18n/detect.ts")).toContain("buzzard_locale");
    const countries = JSON.parse(text("data/buzzard_europe_countries.json"));
    expect(countries.find((row) => row.code === "DE").currency).toBe("EUR");
    expect(countries.every((row) => typeof row.currency === "string" && row.currency.length === 3)).toBe(true);
  });

  it("has the storefront pages and keeps publish and feeds dry", () => {
    for (const rel of [
      "app/page.tsx",
      "components/MegaMenu.tsx",
      "app/products/[id]/page.tsx",
      "components/MegaMenuSearch.tsx",
      "components/Header.tsx",
      "app/impressum/page.tsx",
      "app/admin/control-center/page.tsx",
      "app/admin/pim-core/page.tsx",
      "app/admin/sessions/page.tsx",
      "app/warenkorb/page.tsx",
    ]) {
      expect(existsSync(path.join(root, rel)), rel).toBe(true);
    }
    expect(text("app/products/[id]/page.tsx")).toContain("notFound");
    expect(text("components/Header.tsx")).toContain('href="/warenkorb/"');
    expect(text("styles/rtl.css")).toContain('html[dir="rtl"]');
    expect(text("components/Footer.tsx")).toContain("/impressum/");
    const listing = validateMarketplaceListing({ sku: "REG-1", title: "Regal", price: "12.50 EUR" });
    expect(listing.publishAllowed).toBe(false);
    expect(listing.live).toBe(false);
    expect(publishCampaign({ publishAllowed: true }).code).toBe("PUBLISH_BLOCKED");
    expect(isSalesEnabled()).toBe(false);
    expect(PRODUCTION_SAFETY_LOCK).toBe(true);
  });

  it("stubs carriers, blocks send, and does not claim GPS", () => {
    for (const id of ["DHL", "DPD", "GLS", "Hermes", "UPS"]) {
      const label = getAdapter(id).createLabel();
      expect(label.code).toBe("HUMAN_GATE_REQUIRED");
      expect(label.liveShipment).toBe(false);
      const track = getAdapter(id).trackShipment({ status: "IN_TRANSIT" });
      expect(track.live).toBe(false);
      expect(JSON.stringify(track).toLowerCase()).not.toContain("gps");
    }
    expect(snapshot().live).toBe(false);
    expect(send().code).toBe("WHATSAPP_SEND_DENIED");
    const claim = startReturn({ shipmentId: "DRY-157" });
    expect(claim.customerRefundIssued).toBe(false);
    expect(claim.supplierRefundReceived).toBe(false);
    expect(existsSync(path.join(root, "server/lib/communications.js"))).toBe(false);
    expect(text("server/lib/customerAuth.js")).toContain('keyPrefix: "customer-login:"');
    const history = getOrderHistoryReadiness();
    expect(history.realOrdersEnabled).toBe(false);
    expect(history.bridgeEnabled).toBe(true);
  });
});
