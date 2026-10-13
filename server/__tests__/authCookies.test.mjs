import { describe, it, expect } from "vitest";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const {
  applyAdminSessionCookies,
  clearAdminSessionCookies,
  readAdminSessionCookie,
  serializeCookie,
} = require("../lib/authCookies");
const { extractToken } = require("../lib/auth");

function mockRes() {
  const headers = {};
  return {
    headers,
    getHeader(name) {
      return headers[name.toLowerCase()];
    },
    setHeader(name, value) {
      headers[name.toLowerCase()] = value;
    },
  };
}

describe("admin session cookies", () => {
  it("sets HttpOnly session cookie and readable CSRF/UI cookies", () => {
    const res = mockRes();
    applyAdminSessionCookies(res, { token: "sess-secret", csrfToken: "csrf-public" });
    const cookies = res.getHeader("set-cookie");
    expect(Array.isArray(cookies)).toBe(true);
    const session = cookies.find((c) => c.startsWith("buzzard_admin="));
    expect(session).toMatch(/HttpOnly/);
    expect(session).toMatch(/SameSite=None/);
    expect(session).toMatch(/Secure/);
    const csrf = cookies.find((c) => c.startsWith("buzzard_csrf="));
    expect(csrf).not.toMatch(/HttpOnly/);
    expect(csrf).toContain("csrf-public");
  });

  it("reads the session from cookie when Bearer is absent", () => {
    const token = extractToken({
      headers: { cookie: "buzzard_admin=cookie-session-token" },
    });
    expect(token).toBe("cookie-session-token");
  });

  it("prefers Bearer over cookie", () => {
    const token = extractToken({
      headers: {
        authorization: "Bearer header-token",
        cookie: "buzzard_admin=cookie-session-token",
      },
    });
    expect(token).toBe("header-token");
  });

  it("clears session cookies", () => {
    const res = mockRes();
    clearAdminSessionCookies(res);
    const cookies = res.getHeader("set-cookie");
    expect(cookies.some((c) => c.includes("Max-Age=0"))).toBe(true);
  });

  it("never serializes the session cookie without HttpOnly", () => {
    const cookie = serializeCookie("buzzard_admin", "x", { httpOnly: true });
    expect(cookie).toMatch(/HttpOnly/);
  });
});
