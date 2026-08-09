const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const { db } = require("./db");

const secret = process.env.JWT_SECRET || process.env.AUTH_SECRET || "DEV_ONLY_CHANGE_ME";

function hashPassword(password) {
  return crypto.createHash("sha256").update(String(password || "")).digest("hex");
}

function signUser(user) {
  return jwt.sign({ sub: user.id, email: user.email, role: user.role }, secret, { expiresIn: "7d" });
}

function verifyToken(token) {
  return jwt.verify(token, secret);
}

function requireAuth(req, res) {
  const header = req.headers.authorization || "";
  if (!header.startsWith("Bearer ")) {
    res.status(401).json({ error: "Authentication required" });
    return null;
  }
  try {
    req.user = verifyToken(header.slice(7));
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

  const exists = db.prepare("SELECT id FROM users WHERE email = ?").get(email.toLowerCase());
  if (!exists) {
    db.prepare("INSERT INTO users(email, password_hash, role, name) VALUES(?,?,?,?)").run(
      email.toLowerCase(),
      hashPassword(password),
      "admin",
      "Buzzard Admin"
    );
  }
}

module.exports = {
  hashPassword,
  signUser,
  verifyToken,
  requireAuth,
  requireAdmin,
  ensureAdmin,
};
