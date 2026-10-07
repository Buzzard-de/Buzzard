import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { APPROVED_CUSTOMER_FACING_L1_COUNT, INTERNAL_ONLY_L1_IDS } from "@/lib/categories/customerFacing";
import { getVisibleMainCategories } from "@/lib/categories";
import { getHomeCategoryIds, getHomeCategoryList, HOME_CATALOG_HREF } from "@/lib/home/homepageContent";
import { getHomeFeaturedCategoryIds } from "@/lib/navigation/home-config";
import { isPhoneViewport, PHONE_MEDIA_QUERY } from "@/lib/mobile/phoneViewport";
import { translate } from "@/lib/i18n/translations";

describe("homepage canonical content", () => {
  it("uses the same 50 customer-facing L1 categories for desktop and mobile", () => {
    const home = getHomeCategoryIds();
    const nav = getVisibleMainCategories().map((c) => c.id);
    expect(home).toEqual(nav);
    expect(home).toHaveLength(APPROVED_CUSTOMER_FACING_L1_COUNT);
    expect(getHomeFeaturedCategoryIds()).toEqual(home);
    for (const hidden of INTERNAL_ONLY_L1_IDS) {
      expect(home).not.toContain(hidden);
    }
  });

  it("does not keep a separate homepage category array in home-config", () => {
    const source = readFileSync(resolve("lib/navigation/home-config.ts"), "utf8");
    expect(source).toContain("getHomeCategoryIds");
    expect(source).not.toContain("Automotive-Katalog entdecken");
    expect(source).not.toContain("homeCampaigns");
  });

  it("mobile and desktop heroes read the shared hero i18n keys", () => {
    const mobile = readFileSync(resolve("components/mobile/MobileHero.tsx"), "utf8");
    const desktop = readFileSync(resolve("components/home/HomeHeroCampaign.tsx"), "utf8");
    expect(mobile).toContain('t("hero.title")');
    expect(mobile).toContain('t("hero.text")');
    expect(mobile).not.toContain("mobile.heroTitle");
    expect(desktop).toContain('t("hero.title")');
    expect(desktop).toContain('t("hero.text")');
  });

  it("does not use automotive-only hero copy in de/en/tr/ar", () => {
    expect(translate("de", "hero.title")).toBe("Entdecken Sie unser Sortiment");
    expect(translate("en", "hero.title")).toBe("Discover our range");
    expect(translate("tr", "hero.title")).toBe("Ürün yelpazemizi keşfedin");
    expect(translate("fr", "hero.title")).toBe("Découvrez notre assortiment");
    expect(translate("ar", "hero.title")).toBe("اكتشف مجموعتنا");
    for (const locale of ["de", "en", "tr", "ar", "fr"] as const) {
      expect(translate(locale, "hero.title").toLowerCase()).not.toMatch(/aracınız|right parts for your vehicle|richtigen teile für ihr fahrzeug|pièces pour votre véhicule/);
      expect(translate(locale, "mobile.heroTitle").toLowerCase()).not.toMatch(/aracınız|right parts for your vehicle|richtigen teile für ihr fahrzeug/);
    }
  });

  it("keeps the vehicle selector as a homepage feature, not the hero definition", () => {
    const home = readFileSync(resolve("components/mobile/MobileHome.tsx"), "utf8");
    expect(home).toContain("MobileVehicleSelector");
    expect(home.indexOf("<MobileVehicleSelector")).toBeLessThan(home.indexOf("<MobileHero"));
    expect(getHomeCategoryList().some((c) => c.id === "cat-05")).toBe(true);
  });

  it("catalog CTA is the shared products href, not a hardcoded automotive campaign", () => {
    expect(HOME_CATALOG_HREF).toBe("/products/");
    const promo = readFileSync(resolve("components/mobile/MobilePromoBanner.tsx"), "utf8");
    expect(promo).toContain("HOME_CATALOG_HREF");
    expect(promo).not.toContain("/kategorie/automotive");
  });
});

describe("phone viewport (landscape stays mobile)", () => {
  it("treats portrait phones as phone layout", () => {
    expect(isPhoneViewport(390, 844)).toBe(true);
    expect(isPhoneViewport(320, 568)).toBe(true);
  });

  it("treats landscape phones as phone layout", () => {
    expect(isPhoneViewport(844, 390)).toBe(true);
    expect(isPhoneViewport(812, 375)).toBe(true);
  });

  it("does not treat tablet or desktop as phone layout", () => {
    expect(isPhoneViewport(768, 1024)).toBe(false);
    expect(isPhoneViewport(1024, 768)).toBe(false);
    expect(isPhoneViewport(1440, 900)).toBe(false);
  });

  it("uses the shared media query in JS hooks and boot script", () => {
    const hook = readFileSync(resolve("lib/use-media-query.ts"), "utf8");
    const layout = readFileSync(resolve("app/layout.tsx"), "utf8");
    const chrome = readFileSync(resolve("components/mobile/MobileStorefrontChrome.tsx"), "utf8");
    expect(hook).toContain("PHONE_MEDIA_QUERY");
    expect(layout).toContain(PHONE_MEDIA_QUERY);
    expect(chrome).toContain("PHONE_MEDIA_QUERY");
  });
});
