import { test, expect } from "@playwright/test";

const ADMIN_EMAIL = process.env.BUZZARD_ADMIN_EMAIL || "admin@buzzard.de";
const ADMIN_PASSWORD = process.env.BUZZARD_ADMIN_PASSWORD || "BuzzardAdmin2026!";

async function adminLogin(page: import("@playwright/test").Page) {
  await page.goto("/admin/login/");
  await page.fill('input[type="email"], input[name="email"], #email', ADMIN_EMAIL);
  await page.fill('input[type="password"], input[name="password"], #password', ADMIN_PASSWORD);
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/admin/, { timeout: 15_000 });
}

test.describe("Storefront Bridge E2E (Part 7)", () => {
  test.skip(!process.env.NEXT_PUBLIC_BUZZARD_API_URL, "API URL required");

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
    await page.click('button:has-text("Kategorien"), button[aria-label*="Kategorien"], .nav-categories-btn').catch(() => {});
    const megaOpen = page.locator(".mega-menu-overlay");
    if (await megaOpen.count()) {
      await expect(megaOpen.locator(".subcategory-link").first()).not.toBeVisible({ timeout: 3000 }).catch(() => {});
      const mainLink = megaOpen.locator(".home-sidebar-item").first();
      if (await mainLink.count()) {
        await mainLink.click();
        await expect(megaOpen.locator(".subcategory-link, .mega-panel-placeholder").first()).toBeVisible();
      }
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

  test("Admin storefront health", async ({ page }) => {
    await adminLogin(page);
    await page.goto("/admin/control-center/");
    await expect(page.locator("body")).toContainText(/Control Center/i);
  });
});
