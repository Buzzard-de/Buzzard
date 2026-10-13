/**
 * Admin session cookies. JWT/session id is HttpOnly.
 * CSRF is a separate cookie compared to X-Buzzard-CSRF-Token.
 * SameSite=None; Secure so the Next admin UI on :3000 can call the API on :3001
 * with credentials (cross-origin).
 */
const ADMIN_SESSION_COOKIE = "buzzard_admin";
const CUSTOMER_SESSION_COOKIE = "buzzard_customer";
const CSRF_COOKIE = "buzzard_csrf";
const UI_COOKIE = "buzzard_admin_ui";
const CUSTOMER_UI_COOKIE = "buzzard_customer_ui";
const MAX_AGE_SEC = 8 * 60 * 60;
const CUSTOMER_MAX_AGE_SEC = 7 * 24 * 60 * 60;

function cookieSecure() {
  return process.env.BUZZARD_COOKIE_SECURE !== "0";
}

function serializeCookie(name, value, { httpOnly = false, maxAge = MAX_AGE_SEC } = {}) {
  const parts = [
    `${name}=${encodeURIComponent(value)}`,
    "Path=/",
    "SameSite=None",
    `Max-Age=${maxAge}`,
  ];
  if (httpOnly) parts.push("HttpOnly");
  if (cookieSecure()) parts.push("Secure");
  return parts.join("; ");
}

function appendSetCookie(res, cookie) {
  const prev = res.getHeader("Set-Cookie");
  if (!prev) {
    res.setHeader("Set-Cookie", cookie);
    return;
  }
  const list = Array.isArray(prev) ? prev : [String(prev)];
  res.setHeader("Set-Cookie", [...list, cookie]);
}

function applyAdminSessionCookies(res, { token, csrfToken }) {
  if (!res || !token) return;
  appendSetCookie(res, serializeCookie(ADMIN_SESSION_COOKIE, token, { httpOnly: true }));
  if (csrfToken) {
    appendSetCookie(res, serializeCookie(CSRF_COOKIE, csrfToken, { httpOnly: false }));
  }
  appendSetCookie(res, serializeCookie(UI_COOKIE, "1", { httpOnly: false }));
}

function clearAdminSessionCookies(res) {
  if (!res) return;
  appendSetCookie(res, serializeCookie(ADMIN_SESSION_COOKIE, "", { httpOnly: true, maxAge: 0 }));
  appendSetCookie(res, serializeCookie(CSRF_COOKIE, "", { httpOnly: false, maxAge: 0 }));
  appendSetCookie(res, serializeCookie(UI_COOKIE, "", { httpOnly: false, maxAge: 0 }));
}

function readCookie(req, name) {
  const cookie = req?.headers?.cookie || "";
  const match = cookie.match(new RegExp(`(?:^|;\\s*)${name}=([^;]+)`));
  return match ? decodeURIComponent(match[1]) : null;
}

function readAdminSessionCookie(req) {
  return readCookie(req, ADMIN_SESSION_COOKIE);
}

function applyCustomerSessionCookies(res, { token, csrfToken }) {
  if (!res || !token) return;
  appendSetCookie(
    res,
    serializeCookie(CUSTOMER_SESSION_COOKIE, token, { httpOnly: true, maxAge: CUSTOMER_MAX_AGE_SEC })
  );
  if (csrfToken) {
    appendSetCookie(res, serializeCookie(CSRF_COOKIE, csrfToken, { httpOnly: false, maxAge: CUSTOMER_MAX_AGE_SEC }));
  }
  appendSetCookie(
    res,
    serializeCookie(CUSTOMER_UI_COOKIE, "1", { httpOnly: false, maxAge: CUSTOMER_MAX_AGE_SEC })
  );
}

function clearCustomerSessionCookies(res) {
  if (!res) return;
  appendSetCookie(res, serializeCookie(CUSTOMER_SESSION_COOKIE, "", { httpOnly: true, maxAge: 0 }));
  appendSetCookie(res, serializeCookie(CUSTOMER_UI_COOKIE, "", { httpOnly: false, maxAge: 0 }));
}

function readCustomerSessionCookie(req) {
  return readCookie(req, CUSTOMER_SESSION_COOKIE);
}

function readAnySessionCookie(req) {
  return readAdminSessionCookie(req) || readCustomerSessionCookie(req);
}

module.exports = {
  ADMIN_SESSION_COOKIE,
  CUSTOMER_SESSION_COOKIE,
  CSRF_COOKIE,
  UI_COOKIE,
  CUSTOMER_UI_COOKIE,
  MAX_AGE_SEC,
  CUSTOMER_MAX_AGE_SEC,
  serializeCookie,
  appendSetCookie,
  applyAdminSessionCookies,
  clearAdminSessionCookies,
  applyCustomerSessionCookies,
  clearCustomerSessionCookies,
  readCookie,
  readAdminSessionCookie,
  readCustomerSessionCookie,
  readAnySessionCookie,
};
