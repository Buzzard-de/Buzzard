import { test, expect, type Page } from "@playwright/test";
import { ADMIN_EMAIL, ADMIN_PASSWORD, API, seedAdminSession, waitForAdminReady } from "./helpers/adminAuth";

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

  async function dismissCookieBanner(page: Page) {
    const acceptCookies = page.getByRole("button", { name: /accept all|alle akzept|accept|akzept/i });
    if (await acceptCookies.isVisible().catch(() => false)) {
      await acceptCookies.click();
    }
  }

  test("Admin login form stores a session token", async ({ page }) => {
    await page.goto("/admin/login/");
    await dismissCookieBanner(page);
    const form = page.locator("form.admin-login-card");
    await expect(form.locator("#email")).toBeVisible();
    await form.locator("#email").fill(ADMIN_EMAIL);
    await expect(form.locator("#email")).toHaveValue(ADMIN_EMAIL);
    await form.locator("#password").fill(ADMIN_PASSWORD);
    await expect(form.locator("#password")).toHaveValue(ADMIN_PASSWORD);
    await form.locator('button[type="submit"]').click();
    await expect(form.locator(".shop-modal-error")).toHaveCount(0);
    await expect
      .poll(async () => page.evaluate(() => sessionStorage.getItem("buzzard_admin_session")), { timeout: 20_000 })
      .toBe("1");
    expect(await page.evaluate(() => sessionStorage.getItem("buzzard_admin_token"))).toBeNull();
  });

  test("invalid admin password does not store a session token", async ({ page }) => {
    await page.goto("/admin/login/");
    await dismissCookieBanner(page);
    const form = page.locator("form.admin-login-card");
    // Use a unique unknown identity so this failure does not consume the
    // real administrator's login rate-limit bucket (ip + email, 8 / 15 min).
    await form.locator("#email").fill(`invalid-${Date.now()}@example.invalid`);
    await form.locator("#password").fill("definitely-not-the-admin-password");
    await form.locator('button[type="submit"]').click();
    await expect(form.locator(".shop-modal-error")).toBeVisible({ timeout: 15_000 });
    await expect(form.locator(".shop-modal-error")).toContainText(/fehlgeschlagen|ungültig|gesperrt|viele Versuche/i);
    expect(await page.evaluate(() => sessionStorage.getItem("buzzard_admin_token"))).toBeNull();
  });

  test("authenticated dashboard loads", async ({ page, request }) => {
    await seedAdminSession(page, request);
    await page.goto("/admin/");
    await waitForAdminReady(page);
    await expect(page).not.toHaveURL(/\/admin\/login\//);
    await expect(page.locator("body")).toContainText(/BUZZARD|Admin|Dashboard/i);
  });

  test("Control Center loads", async ({ page, request }) => {
    await seedAdminSession(page, request);
    await page.goto("/admin/control-center/");
    await waitForAdminReady(page);
    await expect(page).not.toHaveURL(/\/admin\/login\//);
    await expect(page.locator("h1")).toContainText(/Control Center/i);
  });

  test("Sessions page loads", async ({ page, request }) => {
    await seedAdminSession(page, request);
    await page.goto("/admin/sessions/");
    await waitForAdminReady(page);
    await expect(page).not.toHaveURL(/\/admin\/login\//);
    await expect(page.locator("body")).toContainText(/Session/i);
  });

  test("Control Center tabs expose approvals, commerce, workers, and blocked integrations", async ({ page, request }) => {
    await seedAdminSession(page, request);
    await page.goto("/admin/control-center/");
    await waitForAdminReady(page);
    await expect(page).not.toHaveURL(/\/admin\/login\//);
    const tabs = page.locator("nav.cc-tabs");
    await expect(tabs).toBeVisible();

    await tabs.getByRole("button", { name: "Onaylar" }).click();
    await expect(page.locator("body")).toContainText(/Human Approval Center|Bekleyen onay/i);

    await tabs.getByRole("button", { name: "Commerce" }).click();
    await expect(page.locator("body")).toContainText(/Commerce Readiness|Katalogmodus|BUZZARD_SALES_ENABLED=0/i);

    await tabs.getByRole("button", { name: "Workers" }).click();
    await expect(page.locator("body")).toContainText(/Workers/i);

    await tabs.getByRole("button", { name: "Entegrasyonlar" }).click();
    await expect(page.locator("body")).toContainText(/Integration Center|BLOCKED|NOT_CONFIGURED|CONNECTED|OFFLINE/i);
  });

  test("unauthenticated admin software APIs return 401", async ({ request }) => {
    const health = await request.get(`${API}/api/admin/software/health`);
    expect([401, 429]).toContain(health.status());
    const report = await request.get(`${API}/api/admin/software/report`);
    expect([401, 429]).toContain(report.status());
    const preview = await request.post(`${API}/api/admin/software/supplier-feeds/preview`, {
      data: { format: "csv", payload: "sku,price\nX,1" },
    });
    expect([401, 429]).toContain(preview.status());
    const checklist = await request.get(`${API}/api/admin/software/external-checklist`);
    expect([401, 429]).toContain(checklist.status());
    const workflow = await request.post(`${API}/api/admin/software/safe-workflow`, { data: {} });
    expect([401, 429]).toContain(workflow.status());
    const diagnostics = await request.get(`${API}/api/admin/software/provider-diagnostics`);
    expect([401, 429]).toContain(diagnostics.status());
  });
});
