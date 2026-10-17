import { test, expect } from "@playwright/test";
import { seedAdminSession, waitForAdminReady } from "./helpers/adminAuth";

test.describe("Storefront Bridge E2E (Part 7)", () => {
  test.skip(!process.env.NEXT_PUBLIC_BUZZARD_API_URL && !process.env.BUZZARD_API_URL, "API URL required");

  test("Homepage loads without horizontal overflow", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto("/");
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
    expect(overflow).toBe(false);
  });

  test("Category page product grid at mobile 320px", async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 568 });
    await page.goto("/kategorie/automotive/");
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
    expect(overflow).toBe(false);
  });

  test("Mega menu: subcategories hidden until main category click", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("/");
    const opener = page
      .locator("nav")
      .getByRole("button", { name: /all categories|alle kategorien|kategorien/i })
      .first();
    if (!(await opener.isVisible().catch(() => false))) {
      test.info().annotations.push({ type: "note", description: "desktop mega-menu opener not present on this shell" });
      return;
    }
    await opener.click({ timeout: 8_000 });
    const megaOpen = page.locator(".mega-menu-overlay");
    await expect(megaOpen).toBeVisible({ timeout: 8_000 });
    const sub = megaOpen.locator(".subcategory-link").first();
    if (await sub.count()) {
      await expect(sub).toBeHidden();
    }
    const mainLink = megaOpen.locator(".home-sidebar-item").first();
    if (await mainLink.count()) {
      await mainLink.click();
      await expect(megaOpen.locator(".subcategory-link, .mega-panel-placeholder").first()).toBeVisible();
    }
  });

  test("Product listing via category", async ({ page }) => {
    await page.goto("/kategorie/automotive/");
    await expect(page.locator("body")).toContainText(/Produkt|Kategorie|Automotive/i);
  });

  test("Search page loads", async ({ page }) => {
    await page.goto("/products/?q=demo");
    await expect(page.locator("body")).toContainText(/Produkt|gefunden|Demo/i);
  });

  test("Admin storefront health", async ({ page, request }) => {
    await seedAdminSession(page, request);
    await page.goto("/admin/control-center/");
    await waitForAdminReady(page);
    await expect(page).not.toHaveURL(/\/admin\/login\//);
    await expect(page.locator("h1")).toContainText(/Control Center/i);
  });
});
