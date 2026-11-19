import { test, expect } from "@playwright/test";

const ADMIN_EMAIL = process.env.BUZZARD_ADMIN_EMAIL || "admin@buzzard.de";
const ADMIN_PASSWORD = process.env.BUZZARD_ADMIN_PASSWORD || "BuzzardAdmin2026!";

async function adminLogin(page: import("@playwright/test").Page) {
  await page.goto("/admin/login/");
  await page.fill('input[type="email"], input[name="email"], #email', ADMIN_EMAIL);
  await page.fill('input[type="password"], input[name="password"], #password', ADMIN_PASSWORD);
  await page.locator("form.admin-login-card button[type=submit]").click();
  await page.waitForURL(/\/admin\/?$/, { timeout: 15_000 });
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

  test("Import dry-run is held for approval and not reported as run", async ({ page }) => {
    await adminLogin(page);
    await page.goto("/admin/pim-core/");
    await page.click('button:has-text("Import")');
    const [response] = await Promise.all([
      page.waitForResponse((res) => res.url().endsWith("/api/admin/pim-core/import") && res.request().method() === "POST"),
      page.click('button:has-text("dry-run")'),
    ]);
    expect(response.status()).toBe(202);
    const body = await response.json();
    expect(body).toMatchObject({ success: true, pendingApproval: true, executed: false, dryRun: true, job: null });
    expect(body.approval?.id).toBeTruthy();

    const pending = page.getByTestId("pim-import-pending");
    await expect(pending).toContainText("Dry run pending approval");
    await expect(pending).toContainText("not executed");
    await expect(pending).toContainText(String(body.approval.id));
    // The page names the state, the approval and the reserved job, and claims no validation result.
    await expect(page.getByTestId("pim-import-state")).toHaveText("pendingApproval");
    await expect(page.getByTestId("pim-import-approval-id")).toHaveText(String(body.approval.id));
    await expect(page.getByTestId("pim-import-approval-status")).toHaveText("PENDING");
    await expect(page.getByTestId("pim-import-job-id")).toContainText(String(body.approval.metadata.jobId));
    await expect(page.getByTestId("pim-import-job-id")).toContainText("not started");
    await expect(page.getByTestId("pim-import-validation")).toContainText("not run");
    await expect(pending).not.toContainText(/finished|completed|abgeschlossen/i);
    await expect(page.getByTestId("pim-import-after-approval")).toContainText("does not start the dry run");
    await expect(page.getByTestId("pim-import-result")).toHaveCount(0);
    await expect(page.getByTestId("pim-import-error")).toHaveCount(0);

    // The request waits in the Control Center approval list; nothing was imported.
    await pending.getByRole("link", { name: "Control Center" }).click();
    await page.waitForURL(/\/admin\/control-center\/?$/);
    await page.click('button:has-text("Onaylar")');
    await expect(page.locator(".cc-approval-item").first()).toBeVisible();
    await page.goto("/admin/pim-core/");
    await expect(page.locator("body")).not.toContainText("BZ-IMPORT-DRY-001");
  });

  test("Brands section", async ({ page }) => {
    await adminLogin(page);
    await page.goto("/admin/pim-core/");
    await page.click('button:has-text("Brands")');
    await expect(page.locator("body")).toContainText(/Buzzard Demo/i);
  });
});
