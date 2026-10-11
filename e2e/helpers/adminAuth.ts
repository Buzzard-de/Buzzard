import type { APIRequestContext, Page } from "@playwright/test";

export const ADMIN_EMAIL = process.env.BUZZARD_ADMIN_EMAIL || "admin@buzzard.de";
export const ADMIN_PASSWORD = process.env.BUZZARD_ADMIN_PASSWORD || "BuzzardAdmin2026!";
export const API = (process.env.NEXT_PUBLIC_BUZZARD_API_URL || process.env.BUZZARD_API_URL || "http://127.0.0.1:3001").replace(
  /\/$/,
  "",
);

let cachedToken: string | undefined;

export async function seedAdminSession(page: Page, request: APIRequestContext) {
  if (!cachedToken) {
    const login = await request.post(`${API}/api/admin/login`, {
      data: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD },
    });
    const body = await login.json();
    cachedToken = body.token as string | undefined;
  }
  const token = cachedToken;
  if (!token) {
    throw new Error("admin_login_failed");
  }
  await page.addInitScript(
    ({ api, token: sessionToken }) => {
      (window as Window & { __BUZZARD_API_URL__?: string }).__BUZZARD_API_URL__ = api;
      sessionStorage.setItem("buzzard_admin_token", sessionToken);
    },
    { api: API, token },
  );
}
