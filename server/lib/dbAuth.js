const jwt = require("jsonwebtoken");
const { db } = require("./db");
const { hashPassword, verifyPassword, needsRehash } = require("./password");

const secret = process.env.JWT_SECRET || process.env.AUTH_SECRET || "DEV_ONLY_CHANGE_ME";

function signUser(user) {
  return jwt.sign({ sub: user.id, email: user.email, role: user.role }, secret, { expiresIn: "7d" });
}

function verifyToken(token) {
  return jwt.verify(token, secret);
}

function extractToken(req) {
  const header = req.headers.authorization || "";
  if (header.startsWith("Bearer ")) return header.slice(7).trim();
  return null;
}

function requireAuth(req, res) {
  const token = extractToken(req);
  if (!token) {
    res.status(401).json({ error: "Authentication required" });
    return null;
  }
  try {
    req.user = verifyToken(token);
    return req.user;
  } catch {
    res.status(401).json({ error: "Invalid or expired token" });
    return null;
  }
}

function requireAdmin(req, res) {
  const user = requireAuth(req, res);
  if (!user) return null;
  if (user.role !== "admin") {
    res.status(403).json({ error: "Admin access required" });
    return null;
  }
  return user;
}

function ensureAdmin() {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;
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
  return secret === "DEV_ONLY_CHANGE_ME";
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
