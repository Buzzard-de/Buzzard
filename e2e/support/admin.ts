import fs from "node:fs";
import { expect, type APIRequestContext, type Page } from "@playwright/test";

export type AdminRole = "administrator" | "catalog_manager" | "order_manager" | "read_only";

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
export function adminCredentials(role: AdminRole = "administrator"): AdminCredentials | null {
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

export async function loginThroughUi(page: Page, credentials: AdminCredentials): Promise<string> {
  await submitLogin(page, credentials);
  await page.waitForURL(/\/admin\/?$/, { timeout: 15_000 });
  const token = await page.evaluate((key) => sessionStorage.getItem(key), TOKEN_KEY);
  expect(token, "admin token after login").toMatch(/^[0-9a-f]{64}$/);
  return token as string;
}

export async function loginThroughApi(request: APIRequestContext, credentials: AdminCredentials): Promise<string> {
  const res = await request.post(`${API_URL}/api/admin/login`, { data: credentials });
  expect(res.status(), "admin API login").toBe(200);
  return (await res.json()).token as string;
}

export function bearer(token: string): { Authorization: string } {
  return { Authorization: `Bearer ${token}` };
}
