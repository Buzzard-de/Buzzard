import { test, expect } from "@playwright/test";
import {
  API_URL,
  TOKEN_KEY,
  adminCredentials,
  bearer,
  loginThroughApi,
  loginThroughUi,
  submitLogin,
} from "./support/admin";

const admin = adminCredentials("administrator");
const readOnly = adminCredentials("read_only");

test.describe("Admin login, session and authorization UI", () => {
  test.skip(!process.env.NEXT_PUBLIC_BUZZARD_API_URL, "API URL required for admin E2E");
  test.skip(!admin, "administrator credentials required (BUZZARD_ADMIN_EMAIL / BUZZARD_ADMIN_PASSWORD)");

  test("anonymous visit to an admin page ends on the login form", async ({ page }) => {
    await page.goto("/admin/control-center/");
    await page.waitForURL(/\/admin\/login\/?$/);
    await expect(page.locator("form.admin-login-card")).toBeVisible();
  });

  test("anonymous admin API request is answered with 401", async ({ request }) => {
    for (const path of ["/api/admin/me", "/api/admin/sessions", "/api/admin/pim-core/products"]) {
      const res = await request.get(`${API_URL}${path}`);
      expect(res.status(), path).toBe(401);
      expect(await res.json()).toEqual({ success: false, errorKey: "admin.auth.required" });
    }
  });

  test("login with valid credentials opens the dashboard", async ({ page, request }) => {
    const token = await loginThroughUi(page, admin!);
    await expect(page.locator(".admin-sidebar")).toBeVisible();
    const me = await request.get(`${API_URL}/api/admin/me`, { headers: bearer(token) });
    expect(me.status()).toBe(200);
    expect((await me.json()).user).toMatchObject({ email: admin!.email, role: "administrator" });
  });

  test("wrong password shows a generic error and stores no token", async ({ page }) => {
    await submitLogin(page, { email: admin!.email, password: `${admin!.password}-wrong` });
    const alert = page.locator("form.admin-login-card [role=alert]");
    await expect(alert).toHaveText("Anmeldung fehlgeschlagen. E-Mail oder Passwort ungültig.");
    await expect(page).toHaveURL(/\/admin\/login\/?$/);
    expect(await page.evaluate((key) => sessionStorage.getItem(key), TOKEN_KEY)).toBeNull();
  });

  test("unknown account gets the same message as a wrong password", async ({ page }) => {
    await submitLogin(page, { email: "nobody@isolated.buzzard.test", password: "not-a-real-password" });
    await expect(page.locator("form.admin-login-card [role=alert]")).toHaveText(
      "Anmeldung fehlgeschlagen. E-Mail oder Passwort ungültig."
    );
  });

  test("unreachable admin service is reported as unreachable, not as wrong credentials", async ({ page }) => {
    await page.route("**/api/admin/login", (route) => route.abort("connectionrefused"));
    await submitLogin(page, admin!);
    await expect(page.locator("form.admin-login-card [role=alert]")).toHaveText(
      "Admin-Service derzeit nicht erreichbar. Bitte später erneut versuchen."
    );
  });

  test("session survives a reload and navigation", async ({ page }) => {
    const token = await loginThroughUi(page, admin!);
    await page.goto("/admin/control-center/");
    await expect(page.locator("body")).toContainText(/Control Center/i);
    await page.reload();
    await expect(page.locator("body")).toContainText(/Control Center/i);
    await expect(page).toHaveURL(/\/admin\/control-center\/?$/);
    expect(await page.evaluate((key) => sessionStorage.getItem(key), TOKEN_KEY)).toBe(token);
  });

  test("logout returns to the login form and invalidates the token", async ({ page, request }) => {
    const token = await loginThroughUi(page, admin!);
    await page.getByRole("button", { name: "Abmelden" }).click();
    await page.waitForURL(/\/admin\/login\/?$/);
    expect(await page.evaluate((key) => sessionStorage.getItem(key), TOKEN_KEY)).toBeNull();

    const me = await request.get(`${API_URL}/api/admin/me`, { headers: bearer(token) });
    expect(me.status()).toBe(401);

    await page.goto("/admin/");
    await page.waitForURL(/\/admin\/login\/?$/);
  });

  test("a session that ended on the server sends the open page back to login", async ({ page, request }) => {
    const token = await loginThroughUi(page, admin!);
    await page.goto("/admin/control-center/");
    await expect(page.locator("body")).toContainText(/Control Center/i);

    // End this browser's session from a second login, as expiry or a revocation would.
    const other = await loginThroughApi(request, admin!);
    const sessions = await request.get(`${API_URL}/api/admin/sessions`, { headers: bearer(token) });
    expect(sessions.status()).toBe(200);
    const own = (await sessions.json()).sessions.find(
      (entry: { tokenPreview?: string }) => entry.tokenPreview === `${token.slice(0, 8)}…`
    );
    expect(own, "current session in the session list").toBeTruthy();
    const revoked = await request.delete(`${API_URL}/api/admin/sessions/${own.sessionId}`, { headers: bearer(other) });
    expect(revoked.status()).toBe(200);

    await page.evaluate(() => window.dispatchEvent(new Event("focus")));
    await page.waitForURL(/\/admin\/login\/?$/);
    expect(await page.evaluate((key) => sessionStorage.getItem(key), TOKEN_KEY)).toBeNull();
    await request.post(`${API_URL}/api/admin/logout`, { headers: bearer(other), data: {} });
  });

  test("an invalid stored token is discarded on load", async ({ page }) => {
    await page.goto("/admin/login/");
    await page.evaluate((key) => sessionStorage.setItem(key, "0".repeat(64)), TOKEN_KEY);
    await page.goto("/admin/control-center/");
    await page.waitForURL(/\/admin\/login\/?$/);
    expect(await page.evaluate((key) => sessionStorage.getItem(key), TOKEN_KEY)).toBeNull();
  });

  test("read-only administrator can open PIM but is refused the import dry run", async ({ page, request }) => {
    test.skip(!readOnly, "read_only credentials need the isolated stack (BUZZARD_E2E_CREDENTIALS_FILE)");
    const token = await loginThroughUi(page, readOnly!);

    const sessions = await request.delete(`${API_URL}/api/admin/sessions/sess-does-not-exist`, { headers: bearer(token) });
    expect(sessions.status()).toBe(403);
    const importAttempt = await request.post(`${API_URL}/api/admin/pim-core/import`, {
      headers: bearer(token),
      data: { raw: { sku: "BZ-IMPORT-DRY-001" }, dryRun: true },
    });
    expect(importAttempt.status()).toBe(403);

    await page.goto("/admin/pim-core/");
    await expect(page.locator("body")).toContainText(/Product Core|PIM/i);
    await page.click('button:has-text("Import")');
    await page.click('button:has-text("dry-run")');
    await expect(page.getByTestId("pim-import-error")).toContainText("Dry run request failed");
    await expect(page.getByTestId("pim-import-pending")).toHaveCount(0);
    await expect(page.getByTestId("pim-import-result")).toHaveCount(0);
  });
});
