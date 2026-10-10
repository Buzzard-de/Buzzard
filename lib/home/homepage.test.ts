import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { APPROVED_CUSTOMER_FACING_L1_COUNT, INTERNAL_ONLY_L1_IDS } from "@/lib/categories/customerFacing";
import { getVisibleMainCategories } from "@/lib/categories";
import { getHomeCategoryIds, getHomeCategoryList, HOME_CATALOG_HREF } from "@/lib/home/homepageContent";
import { getHomeFeaturedCategoryIds } from "@/lib/navigation/home-config";
import { isPhoneViewport, PHONE_MEDIA_QUERY } from "@/lib/mobile/phoneViewport";
import { translate } from "@/lib/i18n/translations";
import { getDeliverableMarketCountries } from "@/lib/market/countries";
import { SUPPORTED_LOCALES } from "@/lib/i18n/types";

describe("homepage canonical content", () => {
  it("uses the same 50 customer-facing L1 categories for every viewport", () => {
    const home = getHomeCategoryIds();
    const nav = getVisibleMainCategories().map((c) => c.id);
    expect(home).toEqual(nav);
    expect(home).toHaveLength(APPROVED_CUSTOMER_FACING_L1_COUNT);
    expect(getHomeFeaturedCategoryIds()).toEqual(home);
    for (const hidden of INTERNAL_ONLY_L1_IDS) {
      expect(home).not.toContain(hidden);
    }
  });

  it("does not mount a second mobile homepage with its own hero or trust strip", () => {
    const page = readFileSync(resolve("components/HomePageContent.tsx"), "utf8");
    expect(page).toContain("HomeHeroCampaign");
    expect(page).toContain("HomeCategoryDiscovery");
    expect(page).toContain("HomePhoneGermanyBackground");
    expect(page).toContain("MobileHomeCategoryRail");
    expect(page).not.toContain("MobileVehicleSelector");
    expect(page).not.toMatch(/import\s+MobileHome\s+from/);
    expect(page).not.toMatch(/<MobileHome[\s/>]/);
    expect(page).not.toContain("MobileHero");
    expect(page).not.toContain("MobileTrustStrip");
    expect(page).not.toContain("useIsMobileNav");
  });

  it("places the phone AI assistant between cart and account in the bottom nav", () => {
    const nav = readFileSync(resolve("components/mobile/MobileBottomNav.tsx"), "utf8");
    const cart = nav.indexOf('href="/warenkorb/"');
    const ai = nav.indexOf("buzzard-mobile-bottom-nav-ai");
    const account = nav.indexOf('href="/konto/"');
    expect(cart).toBeGreaterThan(-1);
    expect(ai).toBeGreaterThan(cart);
    expect(account).toBeGreaterThan(ai);
    expect(nav).toContain("buzzard-mobile-bottom-nav-gold");
    expect((nav.match(/buzzard-mobile-bottom-nav-gold/g) || []).length).toBe(4);
    const css = readFileSync(resolve("styles/buzzard-mobile.css"), "utf8");
    expect(css).toContain(".buzzard-mobile-bottom-nav-ai-label");
    expect(css).toContain("background: #1b8f3a");
    expect(css).toContain("color: #e2b957");
    expect(css).toContain(".buzzard-mobile-bottom-nav-gold");
  });

  it("keeps the mobile category rail on the canonical homepage category source", () => {
    const rail = readFileSync(resolve("components/mobile/MobileHomeCategoryRail.tsx"), "utf8");
    expect(rail).toContain("getHomeCategoryList");
    expect(rail).toContain("categoryHref");
    expect(rail).not.toContain("const categories = [");
    expect(rail).not.toContain("RAIL_CATEGORY_COUNT");
    expect(rail).not.toContain(".slice(");
    expect(rail.indexOf("mobile-home-category-rail-more")).toBeLessThan(rail.indexOf("categories.map"));
    expect((rail.match(/mobile-home-category-rail-more/g) || []).length).toBe(1);
    const css = readFileSync(resolve("styles/buzzard-mobile.css"), "utf8");
    const railBlock = css.slice(css.indexOf(".mobile-home-category-rail {"), css.indexOf(".mobile-home-category-rail-link {"));
    expect(railBlock).toContain("height: auto");
    expect(railBlock).toContain("overflow: visible");
    expect(railBlock).toContain("border-inline-end: 0");
    expect(railBlock).not.toContain("position: sticky");
    expect(railBlock).not.toContain("overflow-y: auto");
    expect(css).toContain("border-inline-end: 0");
    expect(css).toMatch(/\.home-page-canonical \.home-hero-campaign \{[\s\S]*?border: 0;[\s\S]*?box-shadow: none;/);
    expect(css).toMatch(/\.home-page-canonical \.home-hero-campaign \{\s*display: none !important;/);
    expect(css).toMatch(/\.home-page-canonical \.home-section-head \{\s*display: none !important;/);
    expect(css).toMatch(/\.home-page-canonical \.home-category-grid \{[\s\S]*?grid-template-columns: repeat\(2, minmax\(0, 1fr\)\);/);
    expect(css).toMatch(/\.home-page-canonical \.home-category-tile-icon,\s*\.home-page-canonical \.home-category-tile-label \{\s*display: none;/);
    expect(css).toMatch(/\.home-page-canonical \.home-category-tile \+ \.home-category-tile \{\s*border-top: 0;/);
    expect(css).toMatch(/\.mobile-home-category-rail-link \{[\s\S]*?color: #e2b957;/);
    const discovery = readFileSync(resolve("components/home/HomeCategoryDiscovery.tsx"), "utf8");
    expect(discovery).toContain("home-category-tile-group");
    expect(discovery).toContain("groupCategories(categories, 3)");
    expect(discovery).toContain("alignBoxesWithAutomotive");
    expect(discovery).toContain("fillBoxesToLastCategory");
    expect(discovery).toContain("home-category-tile-group--fill");
    expect(discovery).toContain("cat-07");
    expect(readFileSync(resolve("components/HomePageContent.tsx"), "utf8")).toContain("HomePhoneGermanyBackground");
    expect(css).toContain(".home-phone-germany-bg");
    expect(css).toContain("buzzard-germany-phone-band.jpg");
    expect(css).toMatch(/@media \(min-width: 390px\) \{[\s\S]*?\.home-page-canonical \.home-category-grid \{[\s\S]*?gap: 0 8px;/);
    const search = readFileSync(resolve("components/mobile/MobileSearch.tsx"), "utf8");
    expect(search).not.toContain("alignSearchWithAutomotive");
    expect(search).not.toContain("cat-05");
  });

  it("does not render a second overlay header when CategorySidebar is embedded", () => {
    const sidebar = readFileSync(resolve("components/CategorySidebar.tsx"), "utf8");
    expect(sidebar).toContain("{!embedded && (");
    expect(sidebar).toContain("home-sidebar-head");
    const overlay = readFileSync(resolve("components/MegaMenuOverlay.tsx"), "utf8");
    expect(overlay).toContain("home.allCategoriesCount");
    expect(overlay).toContain("isTablet && !isMobile");
  });

  it("does not render unverified delivery/return/payment claims on the homepage USP row", () => {
    const usp = readFileSync(resolve("components/storefront/USPBar.tsx"), "utf8");
    expect(usp).toContain("home.trustChoice");
    expect(usp).not.toContain("home.uspShipping");
    expect(usp).not.toContain("home.uspPayment");
    expect(usp).not.toContain("mobile.trustFast");
    const trust = readFileSync(resolve("components/mobile/MobileTrustStrip.tsx"), "utf8");
    expect(trust).not.toContain("mobile.trustFast");
    expect(trust).not.toContain("mobile.trustReturn");
    expect(trust).not.toContain("mobile.trustPay");
  });

  it("canonical hero keys are multicategory, not automotive-only", () => {
    const desktop = readFileSync(resolve("components/home/HomeHeroCampaign.tsx"), "utf8");
    expect(desktop).toContain('t("hero.title")');
    expect(desktop).toContain('t("hero.text")');
    expect(desktop).not.toContain("mobile.heroTitle");
    expect(translate("de", "hero.title")).toBe("Entdecken Sie unser Sortiment");
    expect(translate("en", "hero.title")).toBe("Discover our range");
    expect(translate("tr", "hero.title")).toBe("Ürün yelpazemizi keşfedin");
    expect(translate("fr", "hero.title")).toBe("Découvrez notre assortiment");
    expect(translate("ar", "hero.title")).toBe("اكتشف مجموعتنا");
    for (const locale of ["de", "en", "tr", "ar", "fr"] as const) {
      expect(translate(locale, "hero.title").toLowerCase()).not.toMatch(
        /aracınız|right parts for your vehicle|richtigen teile für ihr fahrzeug|pièces pour votre véhicule/,
      );
    }
  });

  it("keeps automotive as a category, not the homepage definition", () => {
    expect(getHomeCategoryList().some((c) => c.id === "cat-05")).toBe(true);
    expect(HOME_CATALOG_HREF).toBe("/products/");
  });

  it("exposes 30 locales and 35 markets", () => {
    expect(SUPPORTED_LOCALES).toHaveLength(30);
    expect(getDeliverableMarketCountries()).toHaveLength(35);
  });
});

describe("phone viewport (landscape stays mobile)", () => {
  it("treats portrait phones as phone layout", () => {
    expect(isPhoneViewport(390, 844)).toBe(true);
    expect(isPhoneViewport(393, 852)).toBe(true);
  });

  it("treats landscape phones as phone layout", () => {
    expect(isPhoneViewport(844, 390)).toBe(true);
  });

  it("does not treat tablet or desktop as phone layout", () => {
    expect(isPhoneViewport(768, 1024)).toBe(false);
    expect(isPhoneViewport(1440, 900)).toBe(false);
  });

  it("uses the shared media query in JS hooks and boot script", () => {
    const hook = readFileSync(resolve("lib/use-media-query.ts"), "utf8");
    const layout = readFileSync(resolve("app/layout.tsx"), "utf8");
    expect(hook).toContain("PHONE_MEDIA_QUERY");
    expect(layout).toContain(PHONE_MEDIA_QUERY);
    expect(PHONE_MEDIA_QUERY).toContain("max-height: 500px");
  });
});
