/**
 * CSRF — Bearer-token admin API does NOT require CSRF tokens.
 * Cookie/session state-changing requests must send X-Buzzard-CSRF-Token
 * matching the csrf cookie. Disabled only when BUZZARD_CSRF_ENFORCE=0.
 */
const crypto = require("crypto");
const { logSecurityEvent } = require("./securityLog");
const { getClientIp } = require("./security");

const STATE_CHANGING = new Set(["POST", "PUT", "PATCH", "DELETE"]);

function usesBearerAuth(req) {
  const auth = req.headers.authorization || "";
  return auth.startsWith("Bearer ");
}

function getCsrfCookie(req) {
  const cookie = req.headers.cookie || "";
  const match = cookie.match(/(?:^|;\s*)buzzard_csrf=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : null;
}

function validateCsrfForRequest(req, res) {
  if (!STATE_CHANGING.has((req.method || "GET").toUpperCase())) return true;
  if (usesBearerAuth(req)) return true;

  const publicPaths = ["/api/admin/login", "/api/admin/login/2fa", "/api/account/login", "/api/auth/login"];
  const path = (req.url || "").split("?")[0];
  if (publicPaths.some((p) => path === p || path.startsWith(p))) return true;

  if (process.env.BUZZARD_CSRF_ENFORCE === "0") return true;

  const { readAdminSessionCookie } = require("./authCookies");
  const sessionCookie = readAdminSessionCookie(req);
  const cookieToken = getCsrfCookie(req);
  if (!sessionCookie && !cookieToken) return true;

  const headerToken = req.headers["x-buzzard-csrf-token"];
  if (!headerToken || !cookieToken || headerToken !== cookieToken) {
    logSecurityEvent({
      type: "csrf_failure",
      success: false,
      ip: getClientIp(req),
      path,
      detail: { reason: "token_mismatch_or_missing" },
    });
    res.status(403).json({ success: false, errorKey: "security.csrfInvalid" });
    return false;
  }
  return true;
}

function generateCsrfToken() {
  return crypto.randomBytes(32).toString("hex");
}

module.exports = {
  validateCsrfForRequest,
  generateCsrfToken,
  usesBearerAuth,
};
