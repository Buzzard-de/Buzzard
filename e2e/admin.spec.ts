import { test, expect } from "@playwright/test";

const ADMIN_EMAIL = process.env.BUZZARD_ADMIN_EMAIL || "admin@buzzard.de";
const ADMIN_PASSWORD = process.env.BUZZARD_ADMIN_PASSWORD || "BuzzardAdmin2026!";

test.describe("Admin E2E (Part 5 foundation)", () => {
  test.skip(!process.env.NEXT_PUBLIC_BUZZARD_API_URL, "API URL required for admin E2E");

  test("Admin login page loads", async ({ page }) => {
    await page.goto("/admin/login/");
    await expect(page.locator("body")).toContainText(/Admin|Login|Anmelden/i);
  });

  test("Admin login → dashboard", async ({ page }) => {
    await page.goto("/admin/login/");
    await page.fill('input[type="email"], input[name="email"], #email', ADMIN_EMAIL);
    await page.fill('input[type="password"], input[name="password"], #password', ADMIN_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/admin\/?/, { timeout: 15_000 });
    await expect(page.locator("body")).toContainText(/BUZZARD|Admin|Dashboard/i);
  });

  test("Control Center loads", async ({ page }) => {
    await page.goto("/admin/login/");
    await page.fill('input[type="email"], input[name="email"], #email', ADMIN_EMAIL);
    await page.fill('input[type="password"], input[name="password"], #password', ADMIN_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/admin/, { timeout: 15_000 });
    await page.goto("/admin/control-center/");
    await expect(page.locator("body")).toContainText(/Control Center/i);
  });

  test("Sessions page loads", async ({ page }) => {
    await page.goto("/admin/login/");
    await page.fill('input[type="email"], input[name="email"], #email', ADMIN_EMAIL);
    await page.fill('input[type="password"], input[name="password"], #password', ADMIN_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/admin/, { timeout: 15_000 });
    await page.goto("/admin/sessions/");
    await expect(page.locator("body")).toContainText(/Session/i);
  });
});
