import { test, expect } from "@playwright/test";
import { VIEWPORTS } from "../playwright.config";

const LOCALES = ["de", "en", "tr", "fr", "ar"] as const;
const FORBIDDEN_DE = [
  "Die richtigen Teile für Ihr Fahrzeug",
  "Breites Sortiment, zuverlässige Lieferanten, schnelle Lieferung.",
  "Schnelle Lieferung",
  "Einfache Rückgabe",
  "Sichere Zahlung",
];
const FORBIDDEN_TR = ["Aracınız için doğru parçalar"];

const HERO_TITLE: Record<(typeof LOCALES)[number], string> = {
  de: "Entdecken Sie unser Sortiment",
  en: "Discover our range",
  tr: "Ürün yelpazemizi keşfedin",
  fr: "Découvrez notre assortiment",
  ar: "اكتشف مجموعتنا",
};

async function dismissConsent(page: import("@playwright/test").Page) {
  await page.addInitScript(() => {
    localStorage.setItem(
      "buzzard_consent_v1",
      JSON.stringify({ necessary: true, analytics: false, marketing: false, updatedAt: new Date().toISOString() }),
    );
  });
}

async function applyLocale(page: import("@playwright/test").Page, locale: string) {
  await dismissConsent(page);
  await page.goto("/");
  const isPhone = await page.evaluate(() => document.body.classList.contains("buzzard-phone-storefront"));
  if (isPhone) {
    await page.locator(".buzzard-mobile-header-btn").first().click();
    await expect(page.locator(".mega-menu-overlay")).toBeVisible();
    const lang = page.locator(".mega-menu-overlay .language-selector select");
    const market = page.locator(".mega-menu-overlay .country-selector select");
    await lang.waitFor({ state: "attached" });
    await expect(lang.locator("option")).toHaveCount(30);
    await expect(market.locator("option")).toHaveCount(35);
    await lang.selectOption(locale, { force: true });
    await page.keyboard.press("Escape");
    await expect(page.locator(".mega-menu-overlay")).toHaveCount(0);
  } else {
    const lang = page.locator(".language-selector select");
    const market = page.locator(".country-selector select");
    await expect(lang).toBeVisible();
    await expect(lang.locator("option")).toHaveCount(30);
    await expect(market.locator("option")).toHaveCount(35);
    await lang.selectOption(locale);
  }
}

async function assertNoHorizontalOverflow(page: import("@playwright/test").Page) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 2);
  expect(overflow).toBe(false);
}

async function assertAiAboveBottomNav(page: import("@playwright/test").Page) {
  const collision = await page.evaluate(() => {
    const fab = document.querySelector(".ai-chat-fab");
    const nav = document.querySelector(".buzzard-mobile-bottom-nav");
    if (!fab || !nav) return false;
    const a = fab.getBoundingClientRect();
    const b = nav.getBoundingClientRect();
    return !(a.bottom <= b.top + 2 || a.top >= b.bottom - 2 || a.right <= b.left + 2 || a.left >= b.right - 2);
  });
  expect(collision).toBe(false);
}

async function assertCanonicalGermanHome(page: import("@playwright/test").Page) {
  const hero = page.locator(".home-hero-campaign");
  await expect(hero.locator("h1")).toBeVisible();
  await expect(hero.locator("h1")).toHaveText(HERO_TITLE.de);
  const heroText = await hero.innerText();
  expect(heroText).not.toContain("Die richtigen Teile für Ihr Fahrzeug");
  expect(heroText).not.toContain("Breites Sortiment, zuverlässige Lieferanten");
  await expect(page.locator(".buzzard-mobile-trust")).toHaveCount(0);
  await expect(page.locator(".home-category-tile")).toHaveCount(50);
}

test.describe("homepage viewports", () => {
  test("portrait 390x844 German — one canonical hero, 50 categories", async ({ page }) => {
    await dismissConsent(page);
    await page.setViewportSize(VIEWPORTS.mobile390);
    await page.goto("/");
    await expect(page.locator("body.buzzard-phone-storefront")).toBeVisible({ timeout: 20_000 });
    await assertCanonicalGermanHome(page);
    await expect(page.locator(".buzzard-mobile-vehicle")).toBeVisible();
    await expect(page.locator(".buzzard-mobile-hero")).toHaveCount(0);
    await expect(page.locator(".buzzard-mobile-trust")).toHaveCount(0);
    await assertNoHorizontalOverflow(page);
    await assertAiAboveBottomNav(page);
    await expect(page.locator(".buzzard-mobile-bottom-nav")).toBeVisible();
    await page.screenshot({ path: "test-results/homepage-de-portrait.png", fullPage: false });
  });

  test("portrait 393x852 German — same canonical content", async ({ page }) => {
    await dismissConsent(page);
    await page.setViewportSize(VIEWPORTS.mobile393);
    await page.goto("/");
    await expect(page.locator("body.buzzard-phone-storefront")).toBeVisible({ timeout: 20_000 });
    await assertCanonicalGermanHome(page);
    await assertNoHorizontalOverflow(page);
  });

  test("landscape 844x390 German — phone layout, same hero", async ({ page }) => {
    await dismissConsent(page);
    await page.setViewportSize({ width: 844, height: 390 });
    await page.goto("/");
    await expect(page.locator("body.buzzard-phone-storefront")).toBeVisible({ timeout: 20_000 });
    await assertCanonicalGermanHome(page);
    await expect(page.locator(".home-fullscreen")).toBeHidden();
    await assertNoHorizontalOverflow(page);
    await assertAiAboveBottomNav(page);
    await page.screenshot({ path: "test-results/homepage-de-landscape.png", fullPage: false });
  });

  test("tablet 768x1024 is not the phone chrome", async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto("/");
    await expect(page.locator(".home-hero-campaign")).toBeVisible({ timeout: 20_000 });
    await expect(page.locator("body.buzzard-phone-storefront")).toHaveCount(0);
    await expect(page.locator(".home-hero-campaign h1")).toHaveText(HERO_TITLE.de);
  });

  test("desktop 1440x900 shares the same hero and 50 categories", async ({ page }) => {
    await dismissConsent(page);
    await page.setViewportSize(VIEWPORTS.desktop1440);
    await page.goto("/");
    await assertCanonicalGermanHome(page);
    const lang = page.locator(".language-selector select");
    const market = page.locator(".country-selector select");
    await expect(lang.locator("option")).toHaveCount(30);
    await expect(market.locator("option")).toHaveCount(35);
    await assertNoHorizontalOverflow(page);
    await page.screenshot({ path: "test-results/homepage-de-desktop.png", fullPage: false });
  });

  test("arabic landscape 844x390 — RTL phone layout", async ({ page }) => {
    await page.setViewportSize({ width: 844, height: 390 });
    await applyLocale(page, "ar");
    await expect(page.locator(".home-hero-campaign h1")).toHaveText(HERO_TITLE.ar, { timeout: 20_000 });
    await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
    await expect(page.locator("body.buzzard-phone-storefront")).toBeVisible();
    await assertNoHorizontalOverflow(page);
    await assertAiAboveBottomNav(page);
    await page.screenshot({ path: "test-results/homepage-ar-landscape.png", fullPage: false });
  });

  for (const locale of LOCALES) {
    test(`portrait ${locale} homepage loads without overflow or legacy automotive hero`, async ({ page }) => {
      await page.setViewportSize(VIEWPORTS.mobile390);
      await applyLocale(page, locale);
      await expect(page.locator(".home-hero-campaign h1")).toHaveText(HERO_TITLE[locale], { timeout: 20_000 });
      const heroText = await page.locator(".home-hero-campaign").innerText();
      for (const phrase of FORBIDDEN_TR) expect(heroText).not.toContain(phrase);
      expect(heroText).not.toContain("Die richtigen Teile für Ihr Fahrzeug");
      await expect(page.locator("html")).toHaveAttribute("lang", locale);
      await expect(page.locator("html")).toHaveAttribute("dir", locale === "ar" ? "rtl" : "ltr");
      await expect(page.locator(".home-category-tile")).toHaveCount(50);
      await assertNoHorizontalOverflow(page);
      if (locale === "tr" || locale === "fr" || locale === "ar") {
        await page.screenshot({ path: `test-results/homepage-${locale}-portrait.png`, fullPage: false });
      }
    });
  }
});
