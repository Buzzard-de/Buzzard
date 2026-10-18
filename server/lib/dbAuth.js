const jwt = require("jsonwebtoken");
const { db } = require("./db");
const { hashPassword, verifyPassword, needsRehash } = require("./password");
const { resolveJwtSecret, isUnsafeJwtSecret } = require("./jwtSecret");
const { sendAuthRequired, sendAdminRequired, sendInvalidToken } = require("./http/publicPluginError");

const secret = resolveJwtSecret();

function signUser(user) {
  return jwt.sign({ sub: user.id, email: user.email, role: user.role }, secret, { expiresIn: "7d" });
}

function verifyToken(token) {
  return jwt.verify(token, secret);
}

function extractToken(req) {
  const header = req.headers?.authorization || "";
  if (header.startsWith("Bearer ")) return header.slice(7).trim();
  const { readCustomerSessionCookie, readAdminSessionCookie } = require("./authCookies");
  return readAdminSessionCookie(req) || readCustomerSessionCookie(req);
}

function requireAuth(req, res) {
  const token = extractToken(req);
  if (!token) {
    sendAuthRequired(res);
    return null;
  }
  try {
    req.user = verifyToken(token);
    return req.user;
  } catch {
    sendInvalidToken(res);
    return null;
  }
}

function requireAdmin(req, res) {
  const user = requireAuth(req, res);
  if (!user) return null;
  if (user.role !== "admin") {
    sendAdminRequired(res);
    return null;
  }
  return user;
}

function ensureAdmin() {
  const isProd = process.env.NODE_ENV === "production";
  const email = process.env.ADMIN_EMAIL || (!isProd ? "admin@buzzard.de" : null);
  const password = process.env.ADMIN_PASSWORD || (!isProd ? "BuzzardAdmin2026!" : null);
  if (!email || !password) return;

  const normalized = email.toLowerCase();
  const existing = db.prepare("SELECT id FROM users WHERE email = ?").get(normalized);
  const passwordHash = hashPassword(password);

  if (!existing) {
    db.prepare("INSERT INTO users(email, password_hash, role, name) VALUES(?,?,?,?)").run(
      normalized,
      passwordHash,
      "admin",
      "Buzzard Admin"
    );
    return;
  }

  db.prepare("UPDATE users SET password_hash = ?, role = 'admin' WHERE id = ?").run(
    passwordHash,
    existing.id
  );
}

function authenticateUser(user, password) {
  if (!user || !verifyPassword(password, user.password_hash)) {
    return false;
  }
  if (needsRehash(user.password_hash)) {
    db.prepare("UPDATE users SET password_hash = ? WHERE id = ?").run(hashPassword(password), user.id);
  }
  return true;
}

function getJwtSecret() {
  return secret;
}

function isDefaultJwtSecret() {
  return isUnsafeJwtSecret(secret);
}

module.exports = {
  hashPassword,
  verifyPassword,
  signUser,
  verifyToken,
  extractToken,
  requireAuth,
  requireAdmin,
  ensureAdmin,
  authenticateUser,
  getJwtSecret,
  isDefaultJwtSecret,
};
