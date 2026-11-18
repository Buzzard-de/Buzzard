import { test, expect, type Page, type Request, type Response } from "@playwright/test";
import { ADMIN_NAV_GROUPS, adminHref } from "../lib/admin/nav.config.mjs";
import { canAccessNavSlug, filterNavGroupsForRole, firstAccessibleSlug } from "../lib/admin/navPermissions.mjs";
import {
  ALL_ROLES,
  API_URL,
  TOKEN_KEY,
  adminCredentials,
  bearer,
  expireIsolatedSession,
  loginAs,
  loginThroughApi,
  submitLogin,
  withDevServer,
  type AdminRole,
} from "./support/admin";

/**
 * What each role is shown in the admin pages, and that the pages offer nothing
 * the API refuses. Needs the synthetic role accounts of the isolated stack
 * (scripts/isolated/e2e.sh).
 */

const haveRoles = ALL_ROLES.every((role) => adminCredentials(role));

function slugsFor(role: AdminRole): string[] {
  return filterNavGroupsForRole(ADMIN_NAV_GROUPS, role).flatMap((group: { items: Array<{ slug: string }> }) =>
    group.items.map((item) => item.slug)
  );
}

const allSlugs: string[] = ADMIN_NAV_GROUPS.flatMap((group: { items: Array<{ slug: string }> }) =>
  group.items.map((item) => item.slug)
);

/**
 * Records what goes wrong while a page loads: API answers that mean "not signed
 * in" or "not allowed", other failing API answers, and errors the page itself
 * throws (a page that throws is left blank or reloaded by the browser).
 */
function watchRefusals(page: Page): { refused: string[]; otherFailures: string[]; crashes: string[]; stop: () => void } {
  const refused: string[] = [];
  const otherFailures: string[] = [];
  const crashes: string[] = [];
  const listener = (response: Response) => {
    if (!response.url().startsWith(API_URL)) return;
    const line = `${response.status()} ${response.request().method()} ${new URL(response.url()).pathname}`;
    if (response.status() === 401 || response.status() === 403) refused.push(line);
    else if (response.status() >= 400) otherFailures.push(line);
  };
  const crashed = (error: Error) => crashes.push(error.message.split("\n")[0].slice(0, 200));
  page.on("response", listener);
  page.on("pageerror", crashed);
  return {
    refused,
    otherFailures,
    crashes,
    stop: () => {
      page.off("response", listener);
      page.off("pageerror", crashed);
    },
  };
}

/**
 * Opens an admin page and waits until its requests to the API have been
 * answered: no request in flight for 700 ms (pages that refresh themselves
 * never become idle for long, so a fixed quiet time is used instead of
 * Playwright's "networkidle").
 *
 * The Next.js development server of the isolated stack restarts itself when it
 * runs low on memory; a navigation that falls into such a restart is repeated.
 */
async function openAdminPage(page: Page, slug: string): Promise<void> {
  let inFlight = 0;
  let lastChange = Date.now();
  const started = (request: Request) => {
    if (!request.url().startsWith(API_URL)) return;
    inFlight += 1;
    lastChange = Date.now();
  };
  const ended = (request: Request) => {
    if (!request.url().startsWith(API_URL)) return;
    inFlight = Math.max(0, inFlight - 1);
    lastChange = Date.now();
  };
  // "Answered" means the response arrived; a page that does not read the body of a refusal still counts.
  const answered = (response: Response) => ended(response.request());
  page.on("request", started);
  page.on("response", answered);
  page.on("requestfailed", ended);
  try {
    await withDevServer(`open ${adminHref(slug)}`, async () => {
      await page.goto(adminHref(slug), { timeout: 45_000 });
      await expect(page.locator(".admin-nav")).toBeVisible({ timeout: 30_000 });
    });
    const deadline = Date.now() + 20_000;
    while (Date.now() < deadline && !(inFlight === 0 && Date.now() - lastChange >= 700)) {
      await page.waitForTimeout(100);
    }
    expect(inFlight, `requests of ${adminHref(slug)} still unanswered`).toBe(0);
  } finally {
    page.off("request", started);
    page.off("response", answered);
    page.off("requestfailed", ended);
  }
}

test.describe("Admin pages by role", () => {
  test.skip(!haveRoles, "synthetic role accounts required (run through scripts/isolated/e2e.sh)");

  for (const role of ALL_ROLES) {
    test(`${role}: is shown exactly the pages of the role and lands on one of them`, async ({ page }) => {
      await loginAs(page, role);
      const expected = slugsFor(role);
      expect(expected.length, "pages for the role").toBeGreaterThan(0);

      const shown = await page.locator(".admin-nav a").evaluateAll((links) =>
        links.map((link) => (link as HTMLAnchorElement).getAttribute("href") || "")
      );
      expect(shown.map((href) => href.replace(/\/$/, "")).sort()).toEqual(
        expected.map((slug) => adminHref(slug).replace(/\/$/, "")).sort()
      );

      // The dashboard for roles that may read the system state, otherwise the first page of the role.
      const landing = canAccessNavSlug(role, "") ? "" : firstAccessibleSlug(ADMIN_NAV_GROUPS, role);
      await expect(page).toHaveURL(new RegExp(`${adminHref(landing).replace(/\/$/, "")}/?$`), { timeout: 15_000 });
      await expect(page.getByTestId("admin-forbidden")).toHaveCount(0);
    });

    test(`${role}: no page that is offered sends a request the API refuses or throws an error`, async ({ page }) => {
      test.setTimeout(15 * 60_000);
      await loginAs(page, role);
      const problems: string[] = [];
      const notOffered: string[] = [];
      for (const slug of slugsFor(role)) {
        const watch = watchRefusals(page);
        await openAdminPage(page, slug);
        watch.stop();
        if (await page.getByTestId("admin-forbidden").count()) problems.push(`${adminHref(slug)}: forbidden notice`);
        if (await page.getByTestId("admin-action-refused").count()) problems.push(`${adminHref(slug)}: refusal notice on load`);
        for (const refusal of new Set(watch.refused)) problems.push(`${adminHref(slug)}: ${refusal}`);
        for (const crash of new Set(watch.crashes)) problems.push(`${adminHref(slug)}: page error: ${crash}`);
        for (const failure of new Set(watch.otherFailures)) notOffered.push(`${adminHref(slug)}: ${failure}`);
        // Still signed in: a refusal must not have ended the session.
        expect(await page.evaluate((key) => sessionStorage.getItem(key), TOKEN_KEY), adminHref(slug)).not.toBeNull();
      }
      // Answers such as 404 are no refusal; they are listed for the report (pages whose API route does not exist).
      test.info().annotations.push({ type: "other failing API answers", description: notOffered.join("; ") || "none" });
      console.log(`[admin-pages] ${role}: other failing API answers: ${notOffered.join("; ") || "none"}`);
      expect(problems, `refused requests and page errors for ${role}`).toEqual([]);
    });

    test(`${role}: a page of another role shows a notice and loads nothing`, async ({ page }) => {
      const hidden = allSlugs.filter((slug) => !canAccessNavSlug(role, slug) && slug !== "");
      test.skip(hidden.length === 0, `${role} may open every page`);
      test.setTimeout(10 * 60_000);
      await loginAs(page, role);
      const problems: string[] = [];
      for (const slug of hidden) {
        const watch = watchRefusals(page);
        await openAdminPage(page, slug);
        watch.stop();
        if ((await page.getByTestId("admin-forbidden").count()) !== 1) problems.push(`${adminHref(slug)}: page was rendered`);
        for (const refusal of new Set(watch.refused)) problems.push(`${adminHref(slug)}: ${refusal}`);
        for (const crash of new Set(watch.crashes)) problems.push(`${adminHref(slug)}: page error: ${crash}`);
      }
      expect(problems, `pages hidden from ${role}`).toEqual([]);
      // The notice names the role and leads back to a page of the role.
      await expect(page.getByTestId("admin-forbidden")).toContainText(role);
      await page.getByTestId("admin-forbidden").getByRole("link").click();
      await expect(page.getByTestId("admin-forbidden")).toHaveCount(0);
    });
  }
});

test.describe("Admin actions by permission", () => {
  test.skip(!haveRoles, "synthetic role accounts required (run through scripts/isolated/e2e.sh)");

  const importButton = (page: Page) => page.locator('button:has-text("dry-run")');

  test("PIM import dry run is offered only with products.write and imports.run", async ({ page, context }) => {
    for (const [role, offered] of [
      ["catalog_manager", true],
      ["administrator", true],
      ["admin", false], // products.write without imports.run
      ["read_only", false],
      ["staff", false],
    ] as Array<[AdminRole, boolean]>) {
      await context.clearCookies();
      await loginAs(page, role);
      await openAdminPage(page, "pim-core");
      await page.click('button:has-text("Import")');
      if (offered) {
        await expect(importButton(page), role).toBeEnabled();
        await expect(page.getByTestId("pim-import-no-permission"), role).toHaveCount(0);
      } else {
        await expect(importButton(page), role).toBeDisabled();
        await expect(page.getByTestId("pim-import-no-permission"), role).toBeVisible();
      }
      await page.evaluate((key) => sessionStorage.removeItem(key), TOKEN_KEY);
    }
  });

  test("catalog manager submits a dry run: held for approval, shown as pending, nothing imported", async ({ page, request }) => {
    const token = await loginAs(page, "catalog_manager");
    const before = await request.get(`${API_URL}/api/admin/pim-core/products`, { headers: bearer(token) });
    expect(before.status()).toBe(200);
    const productsBefore = JSON.stringify(await before.json());

    await openAdminPage(page, "pim-core");
    await page.click('button:has-text("Import")');
    const [response] = await Promise.all([
      page.waitForResponse((res) => res.url().endsWith("/api/admin/pim-core/import") && res.request().method() === "POST"),
      importButton(page).click(),
    ]);
    expect(response.status()).toBe(202);
    const body = await response.json();
    expect(body).toMatchObject({ success: true, pendingApproval: true, executed: false, dryRun: true, job: null });
    expect(body.approvalId).toBe(body.approval.id);
    expect(body.importJobId).toBe(body.approval.metadata.jobId);

    await expect(page.getByTestId("pim-import-state")).toHaveText("pendingApproval");
    await expect(page.getByTestId("pim-import-approval-id")).toHaveText(body.approvalId);
    await expect(page.getByTestId("pim-import-approval-status")).toHaveText("PENDING");
    await expect(page.getByTestId("pim-import-job-id")).toContainText(body.importJobId);
    await expect(page.getByTestId("pim-import-validation")).toContainText("not run");
    await expect(page.getByTestId("pim-import-result")).toHaveCount(0);

    // The requester cannot decide the approval, neither through the API nor in the pages.
    const decide = await request.post(`${API_URL}/api/admin/approvals/${body.approvalId}/decide`, {
      headers: bearer(token),
      data: { decision: "approve" },
    });
    expect(decide.status()).toBe(403);
    await page.getByTestId("pim-import-pending").getByRole("link", { name: "Control Center" }).click();
    await expect(page.getByTestId("admin-forbidden")).toBeVisible();

    const after = await request.get(`${API_URL}/api/admin/pim-core/products`, { headers: bearer(token) });
    expect(JSON.stringify(await after.json())).toBe(productsBefore);

    // The approval is still waiting for a human decision.
    const adminToken = await loginThroughApi(request, adminCredentials("administrator")!);
    const approvals = await request.get(`${API_URL}/api/admin/approvals?status=PENDING`, { headers: bearer(adminToken) });
    expect(approvals.status()).toBe(200);
    const list = (await approvals.json()).approvals as Array<{ id: string; status: string }>;
    expect(list.find((entry) => entry.id === body.approvalId)).toMatchObject({ status: "PENDING" });
  });

  test("Control Center: read-only roles see the page, sections without permission are named, decisions are not offered", async ({
    page,
    request,
  }) => {
    // A pending approval to look at.
    const managerToken = await loginThroughApi(request, adminCredentials("catalog_manager")!);
    const submitted = await request.post(`${API_URL}/api/admin/pim-core/import`, {
      headers: bearer(managerToken),
      data: { raw: { sku: "BZ-E2E-ROLE-VIEW-001" }, dryRun: true },
    });
    expect(submitted.status()).toBe(202);
    const approvalId = (await submitted.json()).approval.id as string;

    for (const role of ["read_only", "staff"] as AdminRole[]) {
      const token = await loginAs(page, role);
      const watch = watchRefusals(page);
      await openAdminPage(page, "control-center");
      await expect(page.locator(".cc-error"), role).toHaveCount(0);
      await expect(page.locator("body")).toContainText("Sistem Durumu");

      await page.click('button:has-text("Entegrasyonlar")');
      await expect(page.getByTestId("cc-no-permission"), role).toContainText("integrations.read");

      await page.click('button:has-text("Onaylar")');
      const item = page.locator(`.cc-approval-item[data-approval-id="${approvalId}"]`);
      await expect(item, role).toBeVisible();
      await expect(item.locator("button"), role).toHaveCount(2);
      for (const button of await item.locator("button").all()) await expect(button, role).toBeDisabled();
      await expect(page.getByTestId("cc-approvals-read-only"), role).toBeVisible();

      await page.click('button:has-text("Görevler")');
      await expect(page.locator('button:has-text("Oluştur")'), role).toBeDisabled();
      await page.click('button:has-text("Workers")');
      for (const button of await page.locator(".cc-actions button").all()) await expect(button, role).toBeDisabled();
      watch.stop();
      expect(watch.refused, `refused requests for ${role}`).toEqual([]);

      // The API refuses the same decision.
      const decide = await request.post(`${API_URL}/api/admin/approvals/${approvalId}/decide`, {
        headers: bearer(token),
        data: { decision: "approve" },
      });
      expect(decide.status(), role).toBe(403);
      await page.evaluate((key) => sessionStorage.removeItem(key), TOKEN_KEY);
    }

    // An administrator is offered the decision; rejecting it ends the request without an import.
    await loginAs(page, "administrator");
    await openAdminPage(page, "control-center");
    await page.click('button:has-text("Onaylar")');
    const item = page.locator(`.cc-approval-item[data-approval-id="${approvalId}"]`);
    await expect(item.locator('button:has-text("Reddet")')).toBeEnabled();
    await item.locator('button:has-text("Reddet")').click();
    await expect(item).toHaveCount(0);
    await expect(page.getByTestId("cc-action-error")).toHaveCount(0);
  });

  test("Control Center is closed to roles without system.read", async ({ page }) => {
    for (const role of ["catalog_manager", "order_manager", "ai_agent"] as AdminRole[]) {
      await loginAs(page, role);
      const watch = watchRefusals(page);
      await openAdminPage(page, "control-center");
      await expect(page.getByTestId("admin-forbidden"), role).toBeVisible();
      await expect(page.locator(".cc-tabs"), role).toHaveCount(0);
      watch.stop();
      expect(watch.refused, role).toEqual([]);
      await page.evaluate((key) => sessionStorage.removeItem(key), TOKEN_KEY);
    }
  });

  test("Sessions: ending a session is offered only with security.manage, and ends it", async ({ page, request }) => {
    await loginAs(page, "read_only");
    await openAdminPage(page, "sessions");
    await expect(page.getByTestId("sessions-read-only")).toBeVisible();
    for (const button of await page.locator('button:has-text("Revoke")').all()) await expect(button).toBeDisabled();
    await page.evaluate((key) => sessionStorage.removeItem(key), TOKEN_KEY);

    // A second sign-in of the administrator, ended from the page.
    const other = await loginThroughApi(request, adminCredentials("administrator")!);
    const listed = await request.get(`${API_URL}/api/admin/sessions`, { headers: bearer(other) });
    const otherId = ((await listed.json()).sessions as Array<{ sessionId: string; current?: boolean }>).find(
      (entry) => entry.current === true
    )?.sessionId;
    expect(otherId, "session of the second sign-in").toBeTruthy();

    const token = await loginAs(page, "administrator");
    await openAdminPage(page, "sessions");
    await expect(page.getByTestId("sessions-read-only")).toHaveCount(0);
    const row = page.locator('[data-testid="session-row"]', { hasText: otherId! });
    await expect(row).toHaveAttribute("data-current", "false");
    page.once("dialog", (dialog) => dialog.accept());
    await row.locator('button:has-text("Revoke")').click();
    await expect(row).toHaveCount(0);

    expect((await request.get(`${API_URL}/api/admin/me`, { headers: bearer(other) })).status()).toBe(401);
    expect((await request.get(`${API_URL}/api/admin/me`, { headers: bearer(token) })).status()).toBe(200);
    await expect(page.locator('[data-testid="session-row"][data-current="true"]')).toHaveCount(1);
  });

  test("a change the API refuses is announced on the page, and nothing is changed", async ({ page, request }) => {
    // The sync page offers its import to every role that may open it; the API decides.
    const token = await loginAs(page, "read_only");
    const before = await request.get(`${API_URL}/api/admin/sync/logs`, { headers: bearer(token) });
    expect(before.status()).toBe(200);
    const logsBefore = JSON.stringify(await before.json());

    await openAdminPage(page, "sync");
    await expect(page.getByTestId("admin-action-refused")).toHaveCount(0);
    const [response] = await Promise.all([
      page.waitForResponse((res) => res.url().endsWith("/api/admin/import") && res.request().method() === "POST"),
      page.click('button:has-text("Demo-Produkt importieren")'),
    ]);
    expect(response.status()).toBe(403);
    const notice = page.getByTestId("admin-action-refused");
    await expect(notice).toContainText("Aktion nicht erlaubt");
    await expect(notice).toContainText("read_only");
    await expect(notice).toContainText("POST /api/admin/import");
    await expect(page.locator("body")).not.toContainText("Import abgeschlossen");

    const after = await request.get(`${API_URL}/api/admin/sync/logs`, { headers: bearer(token) });
    expect(JSON.stringify(await after.json())).toBe(logsBefore);
    // Still signed in; the notice goes away with the page.
    await page.locator('.admin-nav a[href="/admin/sessions/"]').click();
    await expect(page.getByTestId("admin-action-refused")).toHaveCount(0);
    await expect(page.locator(".admin-nav")).toBeVisible();
  });

  test("Catalog page: lists the products and the categories of the catalog", async ({ page }) => {
    // The page used to stop with "categories.map is not a function": it read the
    // taxonomy answer of the public route as the catalog's category list.
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message.split("\n")[0]));
    const token = await loginAs(page, "catalog_manager");
    await openAdminPage(page, "catalog");
    await expect(page.getByRole("heading", { level: 1, name: "Katalog & SEO" })).toBeVisible();
    await expect(page.getByTestId("catalog-categories-unavailable")).toHaveCount(0);

    const listed = await page.request.get(`${API_URL}/api/admin/catalog/categories`, { headers: bearer(token) });
    expect(listed.status()).toBe(200);
    const categories = (await listed.json()) as Array<{ id: number; name: string }>;
    expect(Array.isArray(categories)).toBe(true);
    const options = page.locator(".automation-queue-form select option");
    await expect(options).toHaveCount(categories.length + 1);
    await expect(options.first()).toHaveText("Alle Kategorien");
    expect(errors, "errors thrown by the page").toEqual([]);

    // Without the list the page says so and still shows the products.
    await page.route(`${API_URL}/api/admin/catalog/categories`, (route) =>
      route.fulfill({ status: 404, contentType: "application/json", body: JSON.stringify({ success: false }) })
    );
    await openAdminPage(page, "catalog");
    await expect(page.getByTestId("catalog-categories-unavailable")).toBeVisible();
    await expect(page.getByRole("heading", { level: 1, name: "Katalog & SEO" })).toBeVisible();
    await expect(options).toHaveCount(1);
    expect(errors, "errors thrown by the page").toEqual([]);
    await page.unroute(`${API_URL}/api/admin/catalog/categories`);
  });

  test("AI Center: the assistant is offered only with ai.execute", async ({ page }) => {
    for (const [role, offered] of [
      ["read_only", false],
      ["staff", false],
      ["ai_agent", true],
    ] as Array<[AdminRole, boolean]>) {
      await loginAs(page, role);
      await openAdminPage(page, "ai-center");
      const send = page.locator('button:has-text("Send")');
      if (offered) {
        await expect(page.getByTestId("ai-chat-no-permission"), role).toHaveCount(0);
        await expect(page.locator('textarea[aria-label="AI message"]'), role).toBeEnabled();
      } else {
        await expect(send, role).toBeDisabled();
        await expect(page.getByTestId("ai-chat-no-permission"), role).toBeVisible();
      }
      await page.evaluate((key) => sessionStorage.removeItem(key), TOKEN_KEY);
    }
  });
});

test.describe("Admin session end and login messages", () => {
  test.skip(!haveRoles, "synthetic role accounts required (run through scripts/isolated/e2e.sh)");

  test("an expired session sends the page back to the login form and is refused by the API", async ({ page, request }) => {
    const token = await loginAs(page, "administrator");
    await openAdminPage(page, "control-center");
    expect((await request.get(`${API_URL}/api/admin/me`, { headers: bearer(token) })).status()).toBe(200);

    expireIsolatedSession(token);

    expect((await request.get(`${API_URL}/api/admin/me`, { headers: bearer(token) })).status()).toBe(401);
    // Moving on inside the open page is enough: its next request is refused and the page returns to the login form.
    await page.locator('.admin-nav a[href="/admin/sessions/"]').click();
    await page.waitForURL(/\/admin\/login\/?$/, { timeout: 20_000 });
    await expect(page.locator("form.admin-login-card")).toBeVisible();
    expect(await page.evaluate((key) => sessionStorage.getItem(key), TOKEN_KEY)).toBeNull();

    // Signing in again works; the expired session stays unusable.
    await loginAs(page, "administrator");
    expect((await request.get(`${API_URL}/api/admin/me`, { headers: bearer(token) })).status()).toBe(401);
  });

  test("a session survives a reload and ends with the browser tab", async ({ page, context }) => {
    const token = await loginAs(page, "administrator");
    await page.reload();
    await expect(page.locator(".admin-nav")).toBeVisible();
    expect(await page.evaluate((key) => sessionStorage.getItem(key), TOKEN_KEY)).toBe(token);
    expect(await page.evaluate((key) => localStorage.getItem(key), TOKEN_KEY)).toBeNull();
    expect((await context.cookies()).filter((cookie) => cookie.value.includes(token))).toEqual([]);

    // A new tab has no session: the token is kept per tab only.
    const second = await context.newPage();
    await second.goto("/admin/control-center/");
    await second.waitForURL(/\/admin\/login\/?$/);
    await second.close();
  });

  const loginAnswers: Array<[string, number, string | null, RegExp]> = [
    ["wrong credentials", 401, "admin.auth.invalid", /E-Mail oder Passwort ungültig/],
    ["locked account", 401, "admin.auth.locked", /vorübergehend gesperrt/],
    ["too many attempts", 429, "admin.auth.rateLimited", /Zu viele Versuche/],
    ["sign-in service failing", 503, "admin.auth.unavailable", /meldet eine Störung/],
    ["answer that is not from the API", 502, null, /nicht erreichbar/],
  ];
  for (const [name, status, errorKey, message] of loginAnswers) {
    test(`login form message: ${name}`, async ({ page }) => {
      // The answer is supplied here; that the API gives it is covered by the API tests.
      await page.route(`${API_URL}/api/admin/login`, (route) =>
        route.request().method() === "POST"
          ? route.fulfill(
              errorKey
                ? { status, contentType: "application/json", body: JSON.stringify({ success: false, errorKey }) }
                : { status, contentType: "text/html", body: "<html><body>Bad gateway</body></html>" }
            )
          : route.continue()
      );
      await submitLogin(page, { email: "synthetic-nobody@isolated.buzzard.test", password: "not-a-real-password" });
      const alert = page.locator("form.admin-login-card [role=alert]");
      await expect(alert).toContainText(message);
      if (status !== 401 || errorKey !== "admin.auth.invalid") {
        await expect(alert).not.toContainText("Passwort ungültig");
      }
      expect(await page.evaluate((key) => sessionStorage.getItem(key), TOKEN_KEY)).toBeNull();
      await expect(page).toHaveURL(/\/admin\/login\/?$/);
    });
  }

  test("locked account: the form says so, also for the right password", async ({ page, request }) => {
    const probe = adminCredentials("lockout_probe_ui");
    expect(probe, "lockout probe account of the isolated stack").toBeTruthy();
    const keys: string[] = [];
    for (let attempt = 1; attempt <= 5; attempt += 1) {
      const res = await request.post(`${API_URL}/api/admin/login`, {
        data: { email: probe!.email, password: "wrong-password-value" },
      });
      keys.push((await res.json()).errorKey);
      // Already locked when the test is repeated within one run.
      if (keys[keys.length - 1] === "admin.auth.locked") break;
    }
    expect(keys[keys.length - 1]).toBe("admin.auth.locked");
    await submitLogin(page, probe!);
    const alert = page.locator("form.admin-login-card [role=alert]");
    await expect(alert).toContainText("vorübergehend gesperrt");
    expect(await page.evaluate((key) => sessionStorage.getItem(key), TOKEN_KEY)).toBeNull();
  });
});
