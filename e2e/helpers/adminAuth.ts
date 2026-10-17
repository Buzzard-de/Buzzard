import type { APIRequestContext, Page } from "@playwright/test";
import { identityHeaders } from "./testIdentity";

export const ADMIN_EMAIL = process.env.BUZZARD_ADMIN_EMAIL || "admin@buzzard.de";
export const ADMIN_PASSWORD = process.env.BUZZARD_ADMIN_PASSWORD || "BuzzardAdmin2026!";
export const API = (process.env.BUZZARD_API_URL || process.env.NEXT_PUBLIC_BUZZARD_API_URL || "http://127.0.0.1:3001").replace(
  /\/$/,
  "",
);

let cachedToken: string | undefined;

export async function loginAdminApi(request: APIRequestContext): Promise<string> {
  const ipHeaders = identityHeaders("admin-login");
  if (cachedToken) {
    const probe = await request.get(`${API}/api/admin/me`, {
      headers: { Authorization: `Bearer ${cachedToken}`, ...ipHeaders },
    });
    // 429 is a limiter response, not proof the session is invalid.
    if (probe.ok() || probe.status() === 429) return cachedToken;
    cachedToken = undefined;
  }

  const login = await request.post(`${API}/api/admin/login`, {
    data: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD },
    headers: ipHeaders,
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
    headers: { Authorization: `Bearer ${token}`, ...ipHeaders },
  });
  if (!me.ok()) {
    throw new Error(`admin_me_failed:${me.status()}`);
  }
  cachedToken = token;
  return token;
}

export async function seedAdminSession(page: Page, request: APIRequestContext) {
  const token = await loginAdminApi(request);
  const apiUrl = new URL(API.includes("://") ? API : `http://${API}`);
  const crossOriginHttp = apiUrl.protocol === "http:";
  // Secure cookies are not stored on http:// static-export E2E. Production keeps Secure.
  // Bearer is a first-class admin auth path (CSRF-exempt). Do not disable cookie CSRF.
  await page.context().addCookies([
    {
      name: "buzzard_admin",
      value: token,
      domain: apiUrl.hostname,
      path: "/",
      httpOnly: true,
      secure: !crossOriginHttp,
      sameSite: "Lax",
    },
    {
      name: "buzzard_admin_ui",
      value: "1",
      domain: apiUrl.hostname,
      path: "/",
      secure: !crossOriginHttp,
      sameSite: "Lax",
    },
  ]);
  const apiOrigin = apiUrl.origin;
  await page.route(`${apiOrigin}/**`, async (route) => {
    const headers = {
      ...route.request().headers(),
      Authorization: `Bearer ${token}`,
      "x-forwarded-for": identityHeaders("admin-page")["x-forwarded-for"],
    };
    await route.continue({ headers });
  });
  await page.addInitScript(
    ({ api }) => {
      (window as Window & { __BUZZARD_API_URL__?: string }).__BUZZARD_API_URL__ = api;
      sessionStorage.setItem("buzzard_admin_session", "1");
    },
    { api: API },
  );
}

export async function waitForAdminReady(page: Page) {
  await page.locator(".admin-loading").waitFor({ state: "hidden", timeout: 20_000 }).catch(() => undefined);
  if (/\/admin\/login\//.test(page.url())) {
    throw new Error("admin_session_lost_redirected_to_login");
  }
}
