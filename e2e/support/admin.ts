import { createHash } from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { expect, test, type APIRequestContext, type Page } from "@playwright/test";

export type AdminRole =
  | "administrator"
  | "admin"
  | "catalog_manager"
  | "order_manager"
  | "staff"
  | "ai_agent"
  | "read_only";

/** Roles of the API, plus the account that tests may lock out. */
export type SyntheticAccount = AdminRole | "lockout_probe" | "lockout_probe_ui";

export const ALL_ROLES: AdminRole[] = [
  "administrator",
  "admin",
  "catalog_manager",
  "order_manager",
  "staff",
  "ai_agent",
  "read_only",
];

export interface AdminCredentials {
  email: string;
  password: string;
}

export const API_URL = (
  process.env.BUZZARD_API_URL ||
  process.env.NEXT_PUBLIC_BUZZARD_API_URL ||
  "http://localhost:3001"
).replace(/\/$/, "");

export const TOKEN_KEY = "buzzard_admin_token";

/**
 * Login data for one role. The isolated stack writes a credentials file with a
 * synthetic account per role; without it only the administrator configured via
 * BUZZARD_ADMIN_EMAIL / BUZZARD_ADMIN_PASSWORD is known.
 */
export function adminCredentials(role: SyntheticAccount = "administrator"): AdminCredentials | null {
  const file = process.env.BUZZARD_E2E_CREDENTIALS_FILE;
  if (file && fs.existsSync(file)) {
    const all = JSON.parse(fs.readFileSync(file, "utf8")) as Record<string, AdminCredentials | undefined>;
    return all[role] ?? null;
  }
  if (role === "administrator" && process.env.BUZZARD_ADMIN_EMAIL && process.env.BUZZARD_ADMIN_PASSWORD) {
    return { email: process.env.BUZZARD_ADMIN_EMAIL, password: process.env.BUZZARD_ADMIN_PASSWORD };
  }
  return null;
}

export async function submitLogin(page: Page, credentials: AdminCredentials): Promise<void> {
  await page.goto("/admin/login/");
  await page.fill("#email", credentials.email);
  await page.fill("#password", credentials.password);
  await page.locator("form.admin-login-card button[type=submit]").click();
}

/**
 * How often the isolated Next.js development server has restarted itself. It
 * does so when its heap fills up ("approaching the used memory threshold");
 * a page that is loading at that moment stays blank.
 */
function devServerRestarts(): number | null {
  const root = process.env.BUZZARD_E2E_RUN_ROOT;
  if (!root) return null;
  try {
    return fs.readFileSync(path.join(root, "web.log"), "utf8").split("approaching the used memory threshold").length - 1;
  } catch {
    return null;
  }
}

/**
 * Runs a step that needs the web server. The step is repeated only when the
 * development server demonstrably restarted while it ran; every other failure
 * is reported as it is. Each repetition is noted on the test.
 */
export async function withDevServer<T>(label: string, step: () => Promise<T>): Promise<T> {
  for (let attempt = 1; ; attempt += 1) {
    const before = devServerRestarts();
    try {
      return await step();
    } catch (error) {
      const after = devServerRestarts();
      if (attempt >= 3 || before === null || after === null || after === before) throw error;
      test.info().annotations.push({
        type: "dev-server-restart",
        description: `${label}: repeated after the development server restarted (attempt ${attempt})`,
      });
    }
  }
}

export async function loginThroughUi(page: Page, credentials: AdminCredentials): Promise<string> {
  await withDevServer("login", async () => {
    await submitLogin(page, credentials);
    await page.waitForURL(/\/admin\/?$/, { timeout: 15_000 });
  });
  const token = await page.evaluate((key) => sessionStorage.getItem(key), TOKEN_KEY);
  expect(token, "admin token after login").toMatch(/^[0-9a-f]{64}$/);
  return token as string;
}

export async function loginThroughApi(request: APIRequestContext, credentials: AdminCredentials): Promise<string> {
  const res = await request.post(`${API_URL}/api/admin/login`, { data: credentials });
  expect(res.status(), "admin API login").toBe(200);
  return (await res.json()).token as string;
}

/** Signs a role in through the login form and waits for the page the role lands on. */
export async function loginAs(page: Page, role: AdminRole): Promise<string> {
  const credentials = adminCredentials(role);
  if (!credentials) throw new Error(`no synthetic account for ${role}`);
  await withDevServer(`login as ${role}`, async () => {
    await submitLogin(page, credentials);
    await expect(page.locator(".admin-nav")).toBeVisible({ timeout: 20_000 });
  });
  const token = await page.evaluate((key) => sessionStorage.getItem(key), TOKEN_KEY);
  expect(token, "admin token after login").toMatch(/^[0-9a-f]{64}$/);
  return token as string;
}

export function bearer(token: string): { Authorization: string } {
  return { Authorization: `Bearer ${token}` };
}

/**
 * Lets a session of the isolated stack run out, as it would after its lifetime.
 *
 * The lifetime is fixed in the API (8 hours) and deliberately not configurable,
 * so the expiry time is moved into the past in the throwaway session store of
 * this run. Refuses any file that is not below the temp directory of an
 * isolated run.
 */
export function expireIsolatedSession(token: string): void {
  const root = process.env.BUZZARD_E2E_RUN_ROOT;
  if (!root) throw new Error("BUZZARD_E2E_RUN_ROOT is not set: not an isolated run");
  const dataDir = fs.realpathSync(path.join(root, "data"));
  const runRoot = path.dirname(dataDir);
  if (
    !dataDir.startsWith(fs.realpathSync(os.tmpdir()) + path.sep) ||
    !path.basename(runRoot).startsWith("buzzard-isolated.") ||
    !fs.existsSync(path.join(dataDir, ".buzzard-isolated"))
  ) {
    throw new Error(`${dataDir} is not the data directory of an isolated run`);
  }
  const file = path.join(dataDir, "admin-sessions.json");
  const tokenHash = createHash("sha256").update(token).digest("hex");
  const entries = JSON.parse(fs.readFileSync(file, "utf8")) as Array<{ tokenHash: string; session: { expiresAt: number } }>;
  const entry = entries.find((candidate) => candidate.tokenHash === tokenHash);
  if (!entry) throw new Error("the session is not in the isolated session store");
  entry.session.expiresAt = Date.now() - 1000;
  const temporary = `${file}.${process.pid}.e2e.tmp`;
  fs.writeFileSync(temporary, JSON.stringify(entries, null, 2), { mode: 0o600 });
  fs.renameSync(temporary, file);
}
