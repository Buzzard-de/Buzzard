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

  test("Admin login form stores a session token", async ({ page }) => {
    await page.goto("/admin/login/");
    const acceptCookies = page.getByRole("button", { name: /accept|akzept/i });
    if (await acceptCookies.isVisible().catch(() => false)) {
      await acceptCookies.click();
    }
    const form = page.locator("form.admin-login-card");
    await expect(form.locator("#email")).toBeVisible();
    await form.locator("#email").fill(ADMIN_EMAIL);
    await expect(form.locator("#email")).toHaveValue(ADMIN_EMAIL);
    await form.locator("#password").fill(ADMIN_PASSWORD);
    await expect(form.locator("#password")).toHaveValue(ADMIN_PASSWORD);
    await form.locator('button[type="submit"]').click();
    await expect
      .poll(async () => page.evaluate(() => sessionStorage.getItem("buzzard_admin_token")), { timeout: 20_000 })
      .toBeTruthy();
  });

  test("authenticated dashboard loads", async ({ page, request }) => {
    await seedAdminSession(page, request);
    await page.goto("/admin/");
    await expect(page).not.toHaveURL(/\/admin\/login\//);
    await expect(page.locator("body")).toContainText(/BUZZARD|Admin|Dashboard/i);
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
