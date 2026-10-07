import { test, expect } from "@playwright/test";
import { VIEWPORTS } from "../playwright.config";

const LOCALES = ["de", "en", "tr", "fr", "ar"] as const;

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
    const consent = page.locator(".consent-banner button").first();
    if (await consent.isVisible().catch(() => false)) await consent.click();
    await page.locator(".buzzard-mobile-header-btn").first().click();
    await expect(page.locator(".mega-menu-overlay")).toBeVisible();
    const select = page.locator(".mega-menu-overlay .language-selector select");
    await select.waitFor({ state: "attached" });
    await expect(select.locator("option")).toHaveCount(30);
    await select.selectOption(locale, { force: true });
    await page.keyboard.press("Escape");
    await expect(page.locator(".mega-menu-overlay")).toHaveCount(0);
  } else {
    const select = page.locator(".language-selector select");
    await expect(select).toBeVisible();
    await expect(select.locator("option")).toHaveCount(30);
    await select.selectOption(locale);
  }
}

const HERO_TITLE: Record<(typeof LOCALES)[number], string> = {
  de: "Entdecken Sie unser Sortiment",
  en: "Discover our range",
  tr: "Ürün yelpazemizi keşfedin",
  fr: "Découvrez notre assortiment",
  ar: "اكتشف مجموعتنا",
};

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
    const overlap = !(a.bottom <= b.top + 2 || a.top >= b.bottom - 2 || a.right <= b.left + 2 || a.left >= b.right - 2);
    return overlap;
  });
  expect(collision).toBe(false);
}

test.describe("homepage viewports", () => {
  test("portrait 390x844 German — phone shell, multicategory hero, 50 categories", async ({ page }) => {
    await dismissConsent(page);
    await page.setViewportSize(VIEWPORTS.mobile390);
    await page.goto("/");
    await expect(page.locator("body.buzzard-phone-storefront")).toBeVisible({ timeout: 20_000 });
    await expect(page.locator(".buzzard-mobile-hero h1")).toContainText("Entdecken Sie unser Sortiment");
    await expect(page.locator(".buzzard-mobile-hero h1")).not.toContainText("Die richtigen Teile");
    await expect(page.locator(".buzzard-mobile-category-card")).toHaveCount(50);
    await expect(page.locator(".buzzard-mobile-vehicle")).toBeVisible();
    await expect(page.locator(".home-hero-campaign")).toBeHidden();
    await assertNoHorizontalOverflow(page);
    await assertAiAboveBottomNav(page);
    await expect(page.locator(".buzzard-mobile-bottom-nav")).toBeVisible();
    await page.screenshot({ path: "test-results/homepage-de-portrait.png", fullPage: false });
  });

  test("landscape 844x390 German — still phone layout", async ({ page }) => {
    await dismissConsent(page);
    await page.setViewportSize({ width: 844, height: 390 });
    await page.goto("/");
    await expect(page.locator("body.buzzard-phone-storefront")).toBeVisible({ timeout: 20_000 });
    await expect(page.locator(".buzzard-mobile-hero h1")).toBeVisible();
    await expect(page.locator(".buzzard-mobile-category-card")).toHaveCount(50);
    await expect(page.locator(".home-hero-campaign")).toBeHidden();
    await assertNoHorizontalOverflow(page);
    await assertAiAboveBottomNav(page);
    await page.screenshot({ path: "test-results/homepage-de-landscape.png", fullPage: false });
  });

  test("tablet 768x1024 is not the phone homepage", async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto("/");
    await expect(page.locator(".home-hero-campaign")).toBeVisible({ timeout: 20_000 });
    await expect(page.locator("body.buzzard-phone-storefront")).toHaveCount(0);
  });

  test("desktop 1440x900 German hero and 50 categories", async ({ page }) => {
    await dismissConsent(page);
    await page.setViewportSize(VIEWPORTS.desktop1440);
    await page.goto("/");
    await expect(page.locator(".home-hero-campaign h1")).toContainText("Entdecken Sie unser Sortiment");
    await expect(page.locator(".home-category-tile")).toHaveCount(50);
    await assertNoHorizontalOverflow(page);
    await page.screenshot({ path: "test-results/homepage-de-desktop.png", fullPage: false });
  });

  test("arabic landscape 844x390 — RTL phone layout", async ({ page }) => {
    await page.setViewportSize({ width: 844, height: 390 });
    await applyLocale(page, "ar");
    await expect(page.locator(".buzzard-mobile-hero h1")).toHaveText(HERO_TITLE.ar, { timeout: 20_000 });
    await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
    await expect(page.locator("body.buzzard-phone-storefront")).toBeVisible();
    await assertNoHorizontalOverflow(page);
    await assertAiAboveBottomNav(page);
    await page.screenshot({ path: "test-results/homepage-ar-landscape.png", fullPage: false });
  });

  for (const locale of LOCALES) {
    test(`portrait ${locale} homepage loads without overflow`, async ({ page }) => {
      await page.setViewportSize(VIEWPORTS.mobile390);
      await applyLocale(page, locale);
      await expect(page.locator(".buzzard-mobile-hero h1")).toHaveText(HERO_TITLE[locale], { timeout: 20_000 });
      await expect(page.locator("html")).toHaveAttribute("lang", locale);
      if (locale === "ar") {
        await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
      } else {
        await expect(page.locator("html")).toHaveAttribute("dir", "ltr");
      }
      await assertNoHorizontalOverflow(page);
      if (locale === "tr" || locale === "fr" || locale === "ar") {
        await page.screenshot({ path: `test-results/homepage-${locale}-portrait.png`, fullPage: false });
      }
    });
  }
});
