import type { APIRequestContext, Page } from "@playwright/test";

export const ADMIN_EMAIL = process.env.BUZZARD_ADMIN_EMAIL || "admin@buzzard.de";
export const ADMIN_PASSWORD = process.env.BUZZARD_ADMIN_PASSWORD || "BuzzardAdmin2026!";
export const API = (process.env.BUZZARD_API_URL || process.env.NEXT_PUBLIC_BUZZARD_API_URL || "http://127.0.0.1:3001").replace(
  /\/$/,
  "",
);

let cachedToken: string | undefined;

export async function loginAdminApi(request: APIRequestContext): Promise<string> {
  if (cachedToken) {
    const probe = await request.get(`${API}/api/admin/me`, {
      headers: { Authorization: `Bearer ${cachedToken}` },
    });
    // 429 is a limiter response, not proof the session is invalid.
    if (probe.ok() || probe.status() === 429) return cachedToken;
    cachedToken = undefined;
  }

  const login = await request.post(`${API}/api/admin/login`, {
    data: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD },
  });
  if (login.status() === 429) {
    throw new Error("admin_login_rate_limited");
  }
  const body = await login.json();
  const token = body.token as string | undefined;
  if (!token) {
    throw new Error(`admin_login_failed:${login.status()}`);
  }
  const me = await request.get(`${API}/api/admin/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!me.ok()) {
    throw new Error(`admin_me_failed:${me.status()}`);
  }
  cachedToken = token;
  return token;
}

export async function seedAdminSession(page: Page, request: APIRequestContext) {
  const token = await loginAdminApi(request);
  await page.addInitScript(
    ({ api, token: sessionToken }) => {
      (window as Window & { __BUZZARD_API_URL__?: string }).__BUZZARD_API_URL__ = api;
      sessionStorage.setItem("buzzard_admin_token", sessionToken);
    },
    { api: API, token },
  );
}

export async function waitForAdminReady(page: Page) {
  await page.locator(".admin-loading").waitFor({ state: "hidden", timeout: 20_000 }).catch(() => undefined);
  if (/\/admin\/login\//.test(page.url())) {
    throw new Error("admin_session_lost_redirected_to_login");
  }
}
