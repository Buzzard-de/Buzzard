import { test, expect } from "@playwright/test";

import { seedAdminSession } from "./helpers/adminAuth";

async function adminLogin(page: import("@playwright/test").Page, request: import("@playwright/test").APIRequestContext) {
  await seedAdminSession(page, request);
}

test.describe("Admin PIM Core E2E (Part 6)", () => {
  test.skip(!process.env.NEXT_PUBLIC_BUZZARD_API_URL && !process.env.BUZZARD_API_URL, "API URL required for admin E2E");

  test("PIM Core page loads", async ({ page, request }) => {
    await adminLogin(page, request);
    await page.goto("/admin/pim-core/");
    await expect(page).not.toHaveURL(/\/admin\/login\//);
    await expect(page.locator("body")).toContainText(/Product Core|PIM/i);
  });

  test("Product list shows demo SKU", async ({ page, request }) => {
    await adminLogin(page, request);
    await page.goto("/admin/pim-core/");
    await expect(page.locator("body")).toContainText(/BZ-CORE-DEMO-001/i);
  });

  test("Validation tab workflow", async ({ page, request }) => {
    await adminLogin(page, request);
    await page.goto("/admin/pim-core/");
    await page.click('button:has-text("Validate")');
    await page.click('button:has-text("Validation")');
    await expect(page.locator("body")).toContainText(/Overall|PASS|WARNING|FAIL/i);
  });

  test("Import dry-run", async ({ page, request }) => {
    await adminLogin(page, request);
    await page.goto("/admin/pim-core/");
    await page.click('button:has-text("Import")');
    await page.click('button:has-text("dry-run")');
    await expect(page.locator("body")).toContainText(/Dry run/i);
  });

  test("Brands section", async ({ page, request }) => {
    await adminLogin(page, request);
    await page.goto("/admin/pim-core/");
    await page.click('button:has-text("Brands")');
    await expect(page.locator("body")).toContainText(/Buzzard Demo/i);
  });
});
