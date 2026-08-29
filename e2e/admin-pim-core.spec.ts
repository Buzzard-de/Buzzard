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

test.describe("Admin PIM Core E2E (Part 6)", () => {
  test.skip(!process.env.NEXT_PUBLIC_BUZZARD_API_URL, "API URL required for admin E2E");

  test("PIM Core page loads", async ({ page }) => {
    await adminLogin(page);
    await page.goto("/admin/pim-core/");
    await expect(page.locator("body")).toContainText(/Product Core|PIM/i);
  });

  test("Product list shows demo SKU", async ({ page }) => {
    await adminLogin(page);
    await page.goto("/admin/pim-core/");
    await expect(page.locator("body")).toContainText(/BZ-CORE-DEMO-001/i);
  });

  test("Validation tab workflow", async ({ page }) => {
    await adminLogin(page);
    await page.goto("/admin/pim-core/");
    await page.click('button:has-text("Validate")');
    await page.click('button:has-text("Validation")');
    await expect(page.locator("body")).toContainText(/Overall|PASS|WARNING|FAIL/i);
  });

  test("Import dry-run", async ({ page }) => {
    await adminLogin(page);
    await page.goto("/admin/pim-core/");
    await page.click('button:has-text("Import")');
    await page.click('button:has-text("dry-run")');
    await expect(page.locator("body")).toContainText(/Dry run/i);
  });

  test("Brands section", async ({ page }) => {
    await adminLogin(page);
    await page.goto("/admin/pim-core/");
    await page.click('button:has-text("Brands")');
    await expect(page.locator("body")).toContainText(/Buzzard Demo/i);
  });
});
