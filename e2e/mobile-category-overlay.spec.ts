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
  const railAll = page.locator(".mobile-home-category-rail-more");
  if (await railAll.isVisible()) {
    await railAll.click();
  } else {
    await page.locator(".buzzard-mobile-header-btn").first().click();
  }
  await expect(page.locator(".mega-menu-overlay")).toBeVisible({ timeout: 20_000 });
  await expect(page.locator(".mega-menu-shell.mobile")).toBeVisible();
}

async function assertPhoneOverlayLayout(page: import("@playwright/test").Page) {
  const overlay = page.locator(".mega-menu-overlay");
  await expect(overlay.locator(".mega-menu-shell-head")).toHaveCount(0);
  await expect(overlay.locator(".mega-menu-search")).toHaveCount(0);
  await expect(overlay.locator(".mega-menu-locale-market")).toHaveCount(0);
  await expect(overlay.locator(".home-sidebar-head")).toHaveCount(0);
  await expect(overlay.locator(".mega-menu-close")).toHaveCount(0);
  await expect(overlay.locator(".sidebar-close-btn")).toHaveCount(0);
  await expect(page.locator(".buzzard-mobile-header-btn").first()).toBeVisible();

  const allRow = overlay.locator(".home-sidebar.embedded .home-sidebar-all");
  const rows = overlay.locator(".home-sidebar.embedded .home-sidebar-item:not(.home-sidebar-all)");
  await expect(allRow).toHaveCount(1);
  await expect(rows).toHaveCount(50);
  for (let i = 0; i < 4; i += 1) {
    await expect(rows.nth(i)).toBeVisible();
  }

  const header = page.locator(".buzzard-mobile-header");
  const nav = page.locator(".buzzard-mobile-bottom-nav");
  const search = page.locator(".home-phone-controls .buzzard-mobile-search-form");
  const tekstil = page.locator('.mobile-home-category-rail [data-category-id="cat-01"]');
  const viewport = page.viewportSize()!;
  const headerBox = await boxOf(header);
  const navBox = await boxOf(nav);
  const first = await boxOf(allRow);
  expect(first.top).toBeGreaterThanOrEqual(headerBox.bottom - 2);
  expect(first.bottom).toBeLessThanOrEqual(navBox.top + 4);
  expect(overlaps(headerBox, first)).toBe(false);
  if (await search.isVisible()) {
    const searchBox = await boxOf(search);
    expect(first.top).toBeGreaterThanOrEqual(searchBox.bottom - 2);
  }
  if (await tekstil.isVisible()) {
    const tekstilBox = await boxOf(tekstil);
    expect(first.top).toBeGreaterThanOrEqual(tekstilBox.top - 2);
  }
  await expect(rows.first()).not.toHaveText(/^\d{2}\./);

  const gold = await overlay.locator(".home-sidebar.embedded .home-sidebar-item").first().evaluate((el) => {
    const style = window.getComputedStyle(el);
    const label = el.querySelector("span");
    const icon = el.querySelector("svg");
    return {
      text: style.color,
      icon: icon ? window.getComputedStyle(icon).color : "",
      chevron: Boolean(el.querySelector(".chevron")),
      fontSize: label ? window.getComputedStyle(label).fontSize : "",
    };
  });
  expect(gold.text).toBe("rgb(226, 185, 87)");
  expect(gold.icon).toBe("rgb(226, 185, 87)");
  expect(gold.chevron).toBe(true);
  expect(gold.fontSize).toBe("11px");

  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 2);
  expect(overflow).toBe(false);

  const shell = overlay.locator(".mega-menu-shell.mobile");
  const shellBox = await boxOf(shell);
  expect(shellBox.right - shellBox.left).toBeLessThanOrEqual(208);
  const dir = await shell.evaluate((el) => getComputedStyle(el).direction);
  if (dir === "rtl") {
    expect(shellBox.left).toBeGreaterThan(viewport.width * 0.2);
  } else {
    expect(shellBox.right).toBeLessThan(viewport.width * 0.8);
  }

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

  const homeVisible = await page.evaluate(() => {
    const search = document.querySelector(".home-phone-controls .buzzard-mobile-search-form");
    const boxes = document.querySelector(".home-page-canonical .home-category-tile-group");
    const bg = document.querySelector(".home-phone-germany-bg");
    const vis = (el: Element | null) => {
      if (!el) return false;
      const style = window.getComputedStyle(el);
      return style.display !== "none" && style.visibility !== "hidden";
    };
    return vis(search) || vis(boxes) || vis(bg);
  });
  expect(homeVisible).toBe(true);
  expect(viewport.width).toBeGreaterThan(0);
}

test.describe("mobile Alle Kategorien overlay", () => {
  test("portrait 390x844 — one header, no overlap on rows 1–4", async ({ page }) => {
    await dismissConsent(page);
    await page.setViewportSize(VIEWPORTS.mobile390);
    await page.goto("/");
    await expect(page.locator("body.buzzard-phone-storefront")).toBeVisible({ timeout: 20_000 });
    await openPhoneOverlay(page);
    await assertPhoneOverlayLayout(page);
    await expect(page.locator(".mega-menu-overlay .mega-menu-locale-market")).toHaveCount(0);
    await expect(page.locator(".mobile-home-locale-market .language-selector select option")).toHaveCount(30);
    await expect(page.locator(".mobile-home-locale-market .country-selector select option")).toHaveCount(35);
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
    const dir = await page.locator(".mega-menu-shell.mobile").evaluate((el) => getComputedStyle(el).direction);
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
