const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { hashPassword, verifyPassword, needsRehash } = require("./password");
const { createRateLimiter, getClientIp } = require("./security");
const { logSecurityEvent } = require("./securityLog");

const dataDir = require("./dataDir").resolveDataDir();
const sessionsFile = path.join(dataDir, "customer-sessions.json");
const resetFile = path.join(dataDir, "password-reset-tokens.json");
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const RESET_TTL_MS = 60 * 60 * 1000;

const sessions = new Map();
const loginRateLimit = createRateLimiter({ windowMs: 15 * 60 * 1000, max: 8, keyPrefix: "customer-login:" });
const resetRateLimit = createRateLimiter({ windowMs: 60 * 60 * 1000, max: 5, keyPrefix: "customer-reset:" });

function ensureDataDir() {
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
}

function readJson(file, fallback) {
  if (!fs.existsSync(file)) return fallback;
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    return fallback;
  }
}

function writeJson(file, data) {
  ensureDataDir();
  // Whole file or nothing, readable by the service account only. No previous
  // version is kept: sessions and reset tokens have no history worth restoring.
  require("./jsonFileStore").writeJsonAtomic(file, data, { backup: false });
}

function tokenKey(token) {
  return crypto.createHash("sha256").update(String(token || "")).digest("hex");
}

// Sessions are kept under the hash of their token: the file does not contain
// anything that could be presented as a session.
function loadSessions() {
  let legacy = false;
  for (const entry of readJson(sessionsFile, [])) {
    if (!entry || !(entry.session?.expiresAt > Date.now())) continue;
    if (typeof entry.tokenHash === "string") {
      sessions.set(entry.tokenHash, entry.session);
    } else if (typeof entry.token === "string") {
      // Written by an earlier version; still valid, re-keyed on first write.
      sessions.set(tokenKey(entry.token), entry.session);
      legacy = true;
    }
  }
  if (legacy) {
    try {
      persistSessions();
    } catch {
      // Read-only start (inspection); the next sign-in rewrites the file.
    }
  }
}

function persistSessions() {
  writeJson(
    sessionsFile,
    [...sessions.entries()].map(([tokenHash, session]) => ({ tokenHash, session }))
  );
}

loadSessions();

function createToken() {
  return crypto.randomBytes(32).toString("hex");
}

function createSession(customer) {
  const token = createToken();
  const session = {
    customerId: customer.id,
    email: customer.email,
    firstName: customer.firstName,
    lastName: customer.lastName,
    expiresAt: Date.now() + SESSION_TTL_MS,
  };
  sessions.set(tokenKey(token), session);
  persistSessions();
  return { token, user: publicUser(customer) };
}

function publicUser(customer) {
  return {
    id: customer.id,
    email: customer.email,
    firstName: customer.firstName,
    lastName: customer.lastName,
    country: customer.country,
    phone: customer.phone || "",
    emailVerified: customer.emailVerified || false,
  };
}

function login(email, password, verifyPasswordFn, req) {
  const ip = req ? getClientIp(req) : "unknown";
  const key = String(email).trim().toLowerCase();

  if (loginRateLimit(req || { headers: {}, socket: { remoteAddress: ip } }, { key: `${ip}:${key}` })) {
    logSecurityEvent({
      type: "customer_login_rate_limited",
      success: false,
      ip,
      email: key,
      path: "/api/account/login",
    });
    return { success: false, errorKey: "account.auth.rateLimited" };
  }

  const customer = verifyPasswordFn(key, password);
  if (!customer) {
    logSecurityEvent({
      type: "customer_login_failed",
      success: false,
      ip,
      email: key,
      path: "/api/account/login",
    });
    return { success: false, errorKey: "account.auth.invalid" };
  }

  if (needsRehash(customer.password_hash)) {
    const customerStore = require("./customerStore");
    customerStore.updatePasswordHash(customer.id, password);
  }

  const session = createSession(customer);
  logSecurityEvent({
    type: "customer_login",
    success: true,
    ip,
    userId: customer.id,
    email: customer.email,
    path: "/api/account/login",
  });
  return { success: true, ...session };
}

function logout(token, req) {
  if (sessions.delete(tokenKey(token))) persistSessions();
  if (req) {
    logSecurityEvent({
      type: "customer_logout",
      success: true,
      ip: getClientIp(req),
      path: "/api/account/logout",
    });
  }
}

function getSession(token) {
  if (typeof token !== "string" || token.length < 16 || token.length > 256) return null;
  const key = tokenKey(token);
  const session = sessions.get(key);
  if (!session) return null;
  if (session.expiresAt <= Date.now()) {
    sessions.delete(key);
    persistSessions();
    return null;
  }
  return session;
}

/** Ends every session of one customer (password reset, account closed). */
function revokeCustomerSessions(customerId) {
  let removed = 0;
  for (const [key, session] of sessions) {
    if (session.customerId === customerId) {
      sessions.delete(key);
      removed += 1;
    }
  }
  if (removed) persistSessions();
  return removed;
}

function extractToken(req) {
  const header = req.headers.authorization || "";
  if (header.startsWith("Bearer ")) return header.slice(7).trim();
  return null;
}

function requireCustomer(req, res) {
  const session = getSession(extractToken(req));
  if (!session) {
    logSecurityEvent({
      type: "customer_auth_required",
      success: false,
      ip: getClientIp(req),
      path: req.url,
    });
    res.status(401).json({ success: false, errorKey: "account.auth.required" });
    return null;
  }
  req.customerSession = session;
  req.customerToken = extractToken(req);
  return session;
}

function resetTokenHash(token) {
  return crypto.createHash("sha256").update(String(token || "")).digest("hex");
}

function createResetToken(customerId, req) {
  if (resetRateLimit(req, { key: customerId })) {
    return { limited: true };
  }
  const token = createToken();
  const tokens = readJson(resetFile, []).filter((entry) => entry.expiresAt > Date.now());
  // Only the hash is kept: the file alone does not let anyone reset a password.
  tokens.push({ tokenHash: resetTokenHash(token), customerId, expiresAt: Date.now() + RESET_TTL_MS, createdAt: new Date().toISOString() });
  writeJson(resetFile, tokens);
  return { token };
}

function consumeResetToken(token) {
  if (typeof token !== "string" || token.length < 16 || token.length > 256) return null;
  const tokens = readJson(resetFile, []);
  const hash = resetTokenHash(token);
  const idx = tokens.findIndex(
    (entry) => entry && entry.expiresAt > Date.now() && (entry.tokenHash === hash || (typeof entry.token === "string" && entry.token === token))
  );
  if (idx < 0) return null;
  const entry = tokens[idx];
  tokens.splice(idx, 1);
  writeJson(resetFile, tokens);
  return entry.customerId;
}

module.exports = {
  hashPassword,
  publicUser,
  createSession,
  login,
  logout,
  getSession,
  extractToken,
  requireCustomer,
  createResetToken,
  consumeResetToken,
  revokeCustomerSessions,
};
