import { test, expect } from "@playwright/test";
import { ADMIN_EMAIL, ADMIN_PASSWORD, seedAdminSession } from "./helpers/adminAuth";

test.describe("Admin E2E (Part 5 foundation)", () => {
  test.skip(!process.env.NEXT_PUBLIC_BUZZARD_API_URL && !process.env.BUZZARD_API_URL, "API URL required for admin E2E");

  test("Admin login page loads", async ({ page }) => {
    await page.goto("/admin/login/");
    await expect(page.locator("body")).toContainText(/Admin|Login|Anmelden/i);
  });

  test("unauthenticated Control Center stays on login", async ({ page }) => {
    await page.goto("/admin/control-center/");
    await expect(page).toHaveURL(/\/admin\/login\//);
    await expect(page.locator("body")).toContainText(/Admin|Login|Anmelden/i);
  });

  test("Admin login → dashboard", async ({ page }) => {
    await page.goto("/admin/login/");
    await page.fill('input[type="email"], input[name="email"], #email', ADMIN_EMAIL);
    await page.fill('input[type="password"], input[name="password"], #password', ADMIN_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/admin\/?$/, { timeout: 20_000 });
    await expect(page.locator("body")).toContainText(/BUZZARD|Admin|Dashboard/i);
    await expect(page).not.toHaveURL(/\/admin\/login\//);
  });

  test("Control Center loads", async ({ page, request }) => {
    await seedAdminSession(page, request);
    await page.goto("/admin/control-center/");
    await expect(page).not.toHaveURL(/\/admin\/login\//);
    await expect(page.locator("body")).toContainText(/Control Center/i);
  });

  test("Sessions page loads", async ({ page, request }) => {
    await seedAdminSession(page, request);
    await page.goto("/admin/sessions/");
    await expect(page).not.toHaveURL(/\/admin\/login\//);
    await expect(page.locator("body")).toContainText(/Session/i);
  });
});
