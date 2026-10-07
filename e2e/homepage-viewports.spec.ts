import { test, expect } from "@playwright/test";
import { VIEWPORTS } from "../playwright.config";

const LOCALES = ["de", "en", "tr", "fr", "ar"] as const;

async function setLocale(page: import("@playwright/test").Page, locale: string) {
  await page.addInitScript((code) => {
    localStorage.setItem("buzzard_locale", code);
  }, locale);
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
    const overlap = !(a.bottom <= b.top + 2 || a.top >= b.bottom - 2 || a.right <= b.left + 2 || a.left >= b.right - 2);
    return overlap;
  });
  expect(collision).toBe(false);
}

test.describe("homepage viewports", () => {
  test("portrait 390x844 German — phone shell, multicategory hero, 50 categories", async ({ page }) => {
    await setLocale(page, "de");
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
  });

  test("landscape 844x390 German — still phone layout", async ({ page }) => {
    await setLocale(page, "de");
    await page.setViewportSize({ width: 844, height: 390 });
    await page.goto("/");
    await expect(page.locator("body.buzzard-phone-storefront")).toBeVisible({ timeout: 20_000 });
    await expect(page.locator(".buzzard-mobile-hero h1")).toBeVisible();
    await expect(page.locator(".buzzard-mobile-category-card")).toHaveCount(50);
    await expect(page.locator(".home-hero-campaign")).toBeHidden();
    await assertNoHorizontalOverflow(page);
    await assertAiAboveBottomNav(page);
  });

  test("tablet 768x1024 is not the phone homepage", async ({ page }) => {
    await setLocale(page, "de");
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto("/");
    await expect(page.locator(".home-hero-campaign")).toBeVisible({ timeout: 20_000 });
    await expect(page.locator("body.buzzard-phone-storefront")).toHaveCount(0);
  });

  test("desktop 1440x900 German hero and 50 categories", async ({ page }) => {
    await setLocale(page, "de");
    await page.setViewportSize(VIEWPORTS.desktop1440);
    await page.goto("/");
    await expect(page.locator(".home-hero-campaign h1")).toContainText("Entdecken Sie unser Sortiment");
    await expect(page.locator(".home-category-tile")).toHaveCount(50);
    await assertNoHorizontalOverflow(page);
  });

  for (const locale of LOCALES) {
    test(`portrait ${locale} homepage loads without overflow`, async ({ page }) => {
      await setLocale(page, locale);
      await page.setViewportSize(VIEWPORTS.mobile390);
      await page.goto("/");
      await expect(page.locator(".buzzard-mobile-hero h1")).toBeVisible({ timeout: 20_000 });
      await expect(page.locator("html")).toHaveAttribute("lang", locale);
      if (locale === "ar") {
        await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
      } else {
        await expect(page.locator("html")).toHaveAttribute("dir", "ltr");
      }
      await assertNoHorizontalOverflow(page);
    });
  }
});
