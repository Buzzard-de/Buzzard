const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { hashPassword, verifyPassword, needsRehash } = require("./password");
const { createRateLimiter, getClientIp } = require("./security");
const { logSecurityEvent } = require("./securityLog");
const { isLocked, getLockoutInfo, recordFailure, clearFailures } = require("./accountLockout");
const adminTwoFactor = require("./adminTwoFactor");

const dataDir = path.join(__dirname, "..", "data");
const usersFile = path.join(dataDir, "admin-users.json");
const sessionsFile = path.join(dataDir, "admin-sessions.json");
const seedFile = path.join(__dirname, "..", "..", "data", "buzzard_admin_users.seed.json");

const sessions = new Map();
const SESSION_TTL_MS = 8 * 60 * 60 * 1000;
const loginRateLimit = createRateLimiter({ windowMs: 15 * 60 * 1000, max: 8, keyPrefix: "admin-login:" });

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
  fs.writeFileSync(file, JSON.stringify(data, null, 2), "utf8");
}

function seedUsers() {
  if (fs.existsSync(usersFile)) return;
  const seed = readJson(seedFile, []);
  const users = seed.map(({ password, ...rest }) => ({
    ...rest,
    password_hash: hashPassword(password),
  }));
  writeJson(usersFile, users);
}

function persistSessions() {
  const entries = [...sessions.entries()].map(([token, session]) => ({
    token,
    session: { ...session, email: null, ip: null, userAgent: null },
  }));
  writeJson(sessionsFile, entries);
}

function loadSessions() {
  const entries = readJson(sessionsFile, []);
  const now = Date.now();
  for (const entry of entries) {
    if (entry.session?.expiresAt > now) {
      sessions.set(entry.token, entry.session);
    }
  }
}

loadSessions();

function createToken() {
  return crypto.randomBytes(32).toString("hex");
}

function upgradePasswordHash(user, password) {
  if (!needsRehash(user.password_hash)) return;
  const users = loadUsers();
  const idx = users.findIndex((entry) => entry.id === user.id);
  if (idx < 0) return;
  users[idx].password_hash = hashPassword(password);
  writeJson(usersFile, users);
}

function loadUsers() {
  seedUsers();
  return readJson(usersFile, []);
}

function createSession(user, meta = {}) {
  const token = createToken();
  const sessionId = `sess-${crypto.randomBytes(8).toString("hex")}`;
  const session = {
    sessionId,
    userId: user.id,
    email: null,
    name: user.name,
    role: user.role,
    expiresAt: Date.now() + SESSION_TTL_MS,
    createdAt: new Date().toISOString(),
    ip: null,
    userAgent: null,
  };
  sessions.set(token, session);
  persistSessions();
  return { token, session };
}

function login(email, password, req) {
  const ip = req ? getClientIp(req) : "unknown";
  const normalizedEmail = String(email || "").trim().toLowerCase();

  const identityKey = crypto.createHash("sha256").update(normalizedEmail).digest("hex");
  const lockout = getLockoutInfo("admin", identityKey);
  if (lockout.locked) {
    logSecurityEvent({
      type: "admin_login_locked",
      success: false,
      ip,
      path: "/api/admin/login",
      detail: { retryAfterSec: lockout.retryAfterSec },
    });
    return {
      success: false,
      errorKey: "admin.auth.locked",
      retryAfterSec: lockout.retryAfterSec,
    };
  }

  if (loginRateLimit(req || { headers: {}, socket: { remoteAddress: ip } }, { key: `${ip}:${identityKey}` })) {
    logSecurityEvent({
      type: "admin_login_rate_limited",
      success: false,
      ip,
      path: "/api/admin/login",
    });
    return { success: false, errorKey: "admin.auth.rateLimited" };
  }

  const users = loadUsers();
  const user = users.find((entry) => entry.email.toLowerCase() === normalizedEmail);
  if (!user || !verifyPassword(password, user.password_hash)) {
    const failure = recordFailure("admin", identityKey, {
      ip,
      path: "/api/admin/login",
    });
    logSecurityEvent({
      type: "admin_login_failed",
      success: false,
      ip,
      path: "/api/admin/login",
      detail: { remainingAttempts: failure.remainingAttempts },
    });
    if (failure.locked) {
      return {
        success: false,
        errorKey: "admin.auth.locked",
        retryAfterSec: failure.retryAfterSec,
      };
    }
    return { success: false, errorKey: "admin.auth.invalid" };
  }

  upgradePasswordHash(user, password);
  clearFailures("admin", identityKey);

  if (adminTwoFactor.isEnabled(user.id)) {
    const challengeToken = adminTwoFactor.createChallenge(user);
    logSecurityEvent({
      type: "admin_login_2fa_required",
      success: true,
      ip,
      userId: user.id,
      role: user.role,
      path: "/api/admin/login",
    });
    return {
      success: true,
      requires2FA: true,
      challengeToken,
      user: { id: user.id, email: null, name: user.name, role: user.role },
    };
  }

  const { token } = createSession(user, {
    ip: req ? getClientIp(req) : null,
    userAgent: req?.headers?.["user-agent"] || null,
  });

  logSecurityEvent({
    type: "admin_login",
    success: true,
    ip,
    userId: user.id,
    role: user.role,
    path: "/api/admin/login",
  });

  return {
    success: true,
    token,
    user: { id: user.id, email: null, name: user.name, role: user.role },
  };
}

function verifyTwoFactor(challengeToken, code, req) {
  const ip = req ? getClientIp(req) : "unknown";
  const challenge = adminTwoFactor.acceptChallenge(challengeToken, code);
  if (!challenge.ok) {
    logSecurityEvent({
      type: "admin_login_2fa_failed",
      success: false,
      ip,
      path: "/api/admin/login/2fa",
      detail: { reason: challenge.reason === "code" ? "invalid_code" : "invalid_challenge" },
    });
    return {
      success: false,
      errorKey: challenge.reason === "code" ? "admin.2fa.invalidCode" : "admin.2fa.challengeExpired",
    };
  }

  const user = {
    id: challenge.userId,
    email: null,
    name: challenge.name,
    role: challenge.role,
  };
  const { token } = createSession(user, {
    ip: req ? getClientIp(req) : null,
    userAgent: req?.headers?.["user-agent"] || null,
  });

  logSecurityEvent({
    type: "admin_login",
    success: true,
    ip,
    userId: user.id,
    role: user.role,
    path: "/api/admin/login/2fa",
    detail: { via2FA: true },
  });

  return {
    success: true,
    token,
    user: { id: user.id, email: null, name: user.name, role: user.role },
  };
}

function logout(token, req) {
  sessions.delete(token);
  persistSessions();
  if (req) {
    logSecurityEvent({
      type: "admin_logout",
      success: true,
      ip: getClientIp(req),
      path: "/api/admin/logout",
    });
  }
}

function getSession(token) {
  if (!token) return null;
  const session = sessions.get(token);
  if (!session) return null;
  if (session.expiresAt <= Date.now()) {
    sessions.delete(token);
    persistSessions();
    return null;
  }
  return session;
}

function extractToken(req) {
  const header = req.headers.authorization || "";
  if (header.startsWith("Bearer ")) return header.slice(7).trim();
  return null;
}

function requireAuth(req, res) {
  const token = extractToken(req);
  const session = getSession(token);
  if (session) {
    req.adminUser = session;
    req.adminToken = token;
    return session;
  }

  if (token) {
    try {
      const { verifyToken } = require("./dbAuth");
      const user = verifyToken(token);
      if (user.role === "admin" || user.role === "administrator") {
        req.adminUser = {
          userId: user.sub,
          email: null,
          name: user.name || null,
          role: user.role === "admin" ? "administrator" : user.role,
        };
        req.user = user;
        req.adminToken = token;
        return req.adminUser;
      }
    } catch {
      /* fall through */
    }
  }

  logSecurityEvent({
    type: "admin_auth_required",
    success: false,
    ip: getClientIp(req),
    path: req.url,
  });
  res.status(401).json({ success: false, errorKey: "admin.auth.required" });
  return null;
}

function listActiveSessions(userId) {
  const now = Date.now();
  const rows = [];
  for (const [token, session] of sessions.entries()) {
    if (session.expiresAt <= now) continue;
    if (userId && session.userId !== userId) continue;
    rows.push({
      sessionId: session.sessionId || null,
      tokenPreview: null,
      userId: session.userId,
      email: null,
      role: session.role,
      createdAt: session.createdAt,
      expiresAt: new Date(session.expiresAt).toISOString(),
      ip: null,
    });
  }
  return rows.sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
}

function revokeSession(sessionId, { revokedBy } = {}) {
  for (const [token, session] of sessions.entries()) {
    if (session.sessionId === sessionId || token === sessionId) {
      sessions.delete(token);
      persistSessions();
      logSecurityEvent({
        type: "session_revoked",
        success: true,
        userId: session.userId,
        detail: { sessionId },
      });
      return true;
    }
  }
  return false;
}

module.exports = {
  login,
  verifyTwoFactor,
  logout,
  getSession,
  extractToken,
  requireAuth,
  loadUsers,
  listActiveSessions,
  revokeSession,
};
