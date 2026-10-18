import { describe, it, expect } from "vitest";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

describe("storefront leftover runway — established fail-closed", () => {
  it("keeps a multicategory home, mega menu, and PDP routes without live OpenSearch", () => {
    const { storefrontRunwayIntegrity } = require("../lib/software");
    const inspect = storefrontRunwayIntegrity.inspect();
    expect(inspect.salesEnabled).toBe(false);
    expect(inspect.catalogMode).toBe(true);
    expect(inspect.liveOpenSearch).toBe(false);
    expect(inspect.wcagAudit).toBe(false);
    expect(inspect.automotiveOnlyHome).toBe(false);
    expect(inspect.customerFacingL1).toBe(50);

    const home = storefrontRunwayIntegrity.homepage();
    expect(home.ok).toBe(true);
    expect(home.usesHeroKeys).toBe(true);
    expect(home.catalogHref).toBe(true);
    expect(home.pageIsHome).toBe(true);
    expect(home.automotiveOnly).toBe(false);

    const menu = storefrontRunwayIntegrity.megaMenu();
    expect(menu.ok).toBe(true);
    expect(menu.overlayPortal).toBe(true);
    expect(menu.hasSearch).toBe(true);

    const pdp = storefrontRunwayIntegrity.productPages();
    expect(pdp.ok).toBe(true);
    expect(pdp.listing).toBe(true);
    expect(pdp.unknownDoesNotInvent).toBe(true);

    const search = storefrontRunwayIntegrity.searchUi();
    expect(search.ok).toBe(true);
    expect(search.liveOpenSearch).toBe(false);
    expect(search.matchCount).toBe(1);
    expect(search.emptyDoesNotInvent).toBe(true);
  });

  it("covers phone layout, landmarks without WCAG claim, drawers, admin, cart chrome", () => {
    const { storefrontRunwayIntegrity } = require("../lib/software");
    const responsive = storefrontRunwayIntegrity.responsive();
    expect(responsive.ok).toBe(true);
    expect(responsive.css).toBe(true);
    expect(responsive.landscapePhoneKept).toBe(true);

    const a11y = storefrontRunwayIntegrity.accessibilityLandmarks();
    expect(a11y.skipHrefBound).toBe(true);
    expect(a11y.mainLandmark).toBe(true);
    expect(a11y.skipFocus).toBe(true);
    expect(a11y.htmlLang).toBe(true);
    expect(a11y.wcagAudit).toBe(false);
    expect(a11y.axeRun).toBe(false);

    const mobile = storefrontRunwayIntegrity.mobileHomeAndDrawers();
    expect(mobile.homeRail).toBe(true);
    expect(mobile.categoryGrid).toBe(true);
    expect(mobile.drawerMeasure).toBe(true);

    const admin = storefrontRunwayIntegrity.adminPages();
    expect(admin.controlCenter).toBe(true);
    expect(admin.pim).toBe(true);
    expect(admin.sessions).toBe(true);
    expect(admin.productionCookieProbed).toBe(false);

    const chrome = storefrontRunwayIntegrity.cartAccountChrome();
    expect(chrome.cartPage).toBe(true);
    expect(chrome.accountPage).toBe(true);
    expect(chrome.salesEnabled).toBe(false);
    expect(chrome.liveCheckout).toBe(false);
  });
});

describe("80-item software-line table (not live-capped 68.2%)", () => {
  it("maps 80 items and stays fail-closed", () => {
    const { buzzard80SoftwareLine } = require("../lib/software");
    const table = buzzard80SoftwareLine.inspect();
    expect(table.itemCount).toBe(80);
    expect(table.live).toBe(false);
    expect(table.liveVerified).toBe(false);
    expect(table.method).toBe("software-line-established-scope");
    expect(table.sections).toHaveLength(9);
    expect(table.humanSoftwareComplete).toEqual([67, 73, 115, 129, 155, 165, 182]);
    expect(table.externalSoftwareComplete).toEqual([87, 88]);
    expect(table.item202).toBe(90);
    const counts = table.sections.map((s) => s.count);
    expect(counts.reduce((a, b) => a + b, 0)).toBe(80);
  });
});
