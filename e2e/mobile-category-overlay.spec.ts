import { test, expect } from "@playwright/test";
import { VIEWPORTS } from "../playwright.config";

type Box = { top: number; right: number; bottom: number; left: number };

function overlaps(a: Box, b: Box, slop = 2) {
  return !(a.bottom <= b.top + slop || a.top >= b.bottom - slop || a.right <= b.left + slop || a.left >= b.right - slop);
}

async function dismissConsent(page: import("@playwright/test").Page, locale = "de") {
  await page.addInitScript(
    ({ locale: code }) => {
      localStorage.setItem(
        "buzzard_consent_v1",
        JSON.stringify({ necessary: true, analytics: false, marketing: false, updatedAt: new Date().toISOString() }),
      );
      localStorage.setItem("buzzard_locale", code);
      localStorage.setItem("buzzard_locale_manual", "1");
      localStorage.setItem("buzzard_market_country", "DE");
      localStorage.setItem("buzzard_market_country_manual", "1");
    },
    { locale },
  );
}

async function boxOf(locator: import("@playwright/test").Locator): Promise<Box> {
  const box = await locator.boundingBox();
  expect(box).toBeTruthy();
  const b = box!;
  return { top: b.y, left: b.x, right: b.x + b.width, bottom: b.y + b.height };
}

async function openPhoneOverlay(page: import("@playwright/test").Page) {
  await page.locator(".buzzard-mobile-header-btn").first().click();
  await expect(page.locator(".mega-menu-overlay")).toBeVisible({ timeout: 20_000 });
  await expect(page.locator(".mega-menu-shell.mobile")).toBeVisible();
}

async function assertPhoneOverlayLayout(page: import("@playwright/test").Page) {
  const overlay = page.locator(".mega-menu-overlay");
  await expect(overlay.locator(".mega-menu-shell-head strong")).toHaveCount(1);
  await expect(overlay.locator(".home-sidebar-head")).toHaveCount(0);
  await expect(overlay.locator(".mega-menu-close")).toHaveCount(1);
  await expect(overlay.locator(".sidebar-close-btn")).toHaveCount(0);

  const title = overlay.locator(".mega-menu-shell-head strong");
  await expect(title).toBeVisible();
  await expect(title).toContainText("50");

  const search = overlay.locator(".mega-menu-search");
  const lang = overlay.locator(".mega-menu-locale-market .language-selector");
  const market = overlay.locator(".mega-menu-locale-market .country-selector");
  const rows = overlay.locator(".home-sidebar.embedded .home-sidebar-item");
  await expect(rows).toHaveCount(50);
  for (let i = 0; i < 4; i += 1) {
    await expect(rows.nth(i)).toBeVisible();
  }

  const searchBox = await boxOf(search);
  const langBox = await boxOf(lang);
  const marketBox = await boxOf(market);
  const closeBox = await boxOf(overlay.locator(".mega-menu-close"));
  const chromeBottom = Math.max(searchBox.bottom, langBox.bottom, marketBox.bottom);
  const viewport = page.viewportSize()!;

  const first = await boxOf(rows.nth(0));
  expect(first.top).toBeGreaterThanOrEqual(chromeBottom - 2);
  expect(overlaps(searchBox, first)).toBe(false);
  expect(overlaps(langBox, first)).toBe(false);
  expect(overlaps(marketBox, first)).toBe(false);
  expect(overlaps(closeBox, first)).toBe(false);
  expect(first.bottom).toBeLessThanOrEqual(viewport.height + 2);

  for (let i = 0; i < 4; i += 1) {
    const rowBox = await rows.nth(i).boundingBox();
    if (!rowBox || rowBox.y >= viewport.height - 8) continue;
    const row = { top: rowBox.y, left: rowBox.x, right: rowBox.x + rowBox.width, bottom: rowBox.y + rowBox.height };
    expect(overlaps(searchBox, row)).toBe(false);
    expect(overlaps(langBox, row)).toBe(false);
    expect(overlaps(marketBox, row)).toBe(false);
    expect(overlaps(closeBox, row)).toBe(false);
  }

  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 2);
  expect(overflow).toBe(false);

  const sidebar = overlay.locator(".home-sidebar.embedded");
  const overflowY = await sidebar.evaluate((el) => getComputedStyle(el).overflowY);
  expect(["auto", "scroll", "overlay"]).toContain(overflowY);
  const scrolled = await sidebar.evaluate((el) => {
    const before = el.scrollTop;
    el.scrollTop = Math.min(el.scrollHeight, before + 80);
    const after = el.scrollTop;
    el.scrollTop = before;
    return after >= before;
  });
  expect(scrolled).toBe(true);

  const stacking = await page.evaluate(() => {
    const overlayEl = document.querySelector(".mega-menu-overlay") as HTMLElement | null;
    const fab = document.querySelector(".ai-chat-fab") as HTMLElement | null;
    const nav = document.querySelector(".buzzard-mobile-bottom-nav") as HTMLElement | null;
    const oz = overlayEl ? Number(getComputedStyle(overlayEl).zIndex) || 0 : 0;
    const fz = fab ? Number(getComputedStyle(fab).zIndex) || 0 : 0;
    const nz = nav ? Number(getComputedStyle(nav).zIndex) || 0 : 0;
    return { oz, fz, nz };
  });
  expect(stacking.oz).toBeGreaterThan(stacking.fz);
  expect(stacking.oz).toBeGreaterThan(stacking.nz);
}

test.describe("mobile Alle Kategorien overlay", () => {
  test("portrait 390x844 — one header, no overlap on rows 1–4", async ({ page }) => {
    await dismissConsent(page);
    await page.setViewportSize(VIEWPORTS.mobile390);
    await page.goto("/");
    await expect(page.locator("body.buzzard-phone-storefront")).toBeVisible({ timeout: 20_000 });
    await openPhoneOverlay(page);
    await assertPhoneOverlayLayout(page);
    await expect(page.locator(".mega-menu-locale-market .language-selector select option")).toHaveCount(30);
    await expect(page.locator(".mega-menu-locale-market .country-selector select option")).toHaveCount(35);
    await page.screenshot({ path: "test-results/overlay-de-portrait.png", fullPage: false });
  });

  test("portrait 393x852 — same overlay layout", async ({ page }) => {
    await dismissConsent(page);
    await page.setViewportSize(VIEWPORTS.mobile393);
    await page.goto("/");
    await openPhoneOverlay(page);
    await assertPhoneOverlayLayout(page);
  });

  test("landscape 844x390 — phone overlay, not desktop mega-menu", async ({ page }) => {
    await dismissConsent(page);
    await page.setViewportSize({ width: 844, height: 390 });
    await page.goto("/");
    await expect(page.locator("body.buzzard-phone-storefront")).toBeVisible({ timeout: 20_000 });
    await openPhoneOverlay(page);
    await expect(page.locator(".mega-menu-shell.mobile")).toBeVisible();
    await expect(page.locator(".mega-menu-panels")).toHaveCount(0);
    await assertPhoneOverlayLayout(page);
    await page.screenshot({ path: "test-results/overlay-de-landscape.png", fullPage: false });
  });

  test("arabic portrait 390x844 — RTL overlay", async ({ page }) => {
    await dismissConsent(page, "ar");
    await page.setViewportSize(VIEWPORTS.mobile390);
    await page.goto("/");
    await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
    await openPhoneOverlay(page);
    await assertPhoneOverlayLayout(page);
    const dir = await page.locator(".mega-menu-shell-head").evaluate((el) => getComputedStyle(el).direction);
    expect(dir).toBe("rtl");
    await page.screenshot({ path: "test-results/overlay-ar-portrait.png", fullPage: false });
  });

  test("arabic landscape 844x390 — RTL phone overlay", async ({ page }) => {
    await dismissConsent(page, "ar");
    await page.setViewportSize({ width: 844, height: 390 });
    await page.goto("/");
    await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
    await openPhoneOverlay(page);
    await expect(page.locator(".mega-menu-panels")).toHaveCount(0);
    await assertPhoneOverlayLayout(page);
  });

  test("desktop 1440x900 mega menu is unchanged", async ({ page }) => {
    await dismissConsent(page);
    await page.setViewportSize(VIEWPORTS.desktop1440);
    await page.goto("/");
    const opener = page.locator(".all-categories-btn");
    await expect(opener).toBeVisible();
    await opener.click();
    await expect(page.locator(".mega-menu-overlay")).toBeVisible();
    await expect(page.locator(".mega-menu-shell.mobile")).toHaveCount(0);
    await expect(page.locator(".mega-menu-panels")).toBeVisible();
    await expect(page.locator(".mega-menu-shell-head strong")).toHaveText(/ALLE KATEGORIEN|ALL CATEGORIES/i);
    await expect(page.locator(".mega-menu-panels .home-sidebar.embedded")).toBeVisible();
  });
});
