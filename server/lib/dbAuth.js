const crypto = require("crypto");
const path = require("path");
const jwt = require("jsonwebtoken");
const { db } = require("./db");
const { resolveDataDir } = require("./dataDir");
const { inspectJsonFile, writeJsonAtomic, withFileLock } = require("./jsonFileStore");
const { isProduction } = require("./runtimeEnv");
const { checkAdminPassword } = require("./passwordPolicy");
const { hashPassword, verifyPassword, needsRehash } = require("./password");

const { secret, isConfigured: isJwtSecretConfigured } = require("./jwtSecret");

const ADMIN_ROLES = new Set(["admin", "administrator"]);
const revokedFile = path.join(resolveDataDir(), "revoked-admin-tokens.json");

function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

/** Changes whenever the stored password hash changes; never reveals the hash. */
function credentialVersion(passwordHash) {
  return crypto.createHash("sha256").update(`jwt-credential:${passwordHash || ""}`).digest("hex").slice(0, 16);
}

function findUserRow(id) {
  try {
    return db.prepare("SELECT id, email, role, password_hash FROM users WHERE id = ?").get(id) || null;
  } catch {
    return null;
  }
}

/**
 * Claims for a user token. Administrator tokens additionally carry an id, so
 * a single token can be revoked, and the version of the password they were
 * issued for, so a password change ends them.
 */
function buildClaims(user) {
  const claims = { sub: user.id, email: user.email, role: user.role };
  if (ADMIN_ROLES.has(user.role)) {
    const passwordHash = user.password_hash || findUserRow(user.id)?.password_hash;
    claims.jti = crypto.randomBytes(12).toString("hex");
    claims.cv = credentialVersion(passwordHash);
  }
  return claims;
}

function signUser(user) {
  return jwt.sign(buildClaims(user), secret, { expiresIn: "7d", algorithm: "HS256" });
}

function readRevoked() {
  const result = inspectJsonFile(revokedFile, { validate: isPlainObject });
  return result.state === "ok" || result.state === "restored" ? result.value : {};
}

function isRevoked(jti) {
  return Object.prototype.hasOwnProperty.call(readRevoked(), jti);
}

/**
 * An administrator token is only as good as the account behind it: it must
 * still exist, still be an administrator, still have the password the token
 * was issued for, and the token must not have been signed out.
 */
function assertCurrentAdmin(claims) {
  const row = findUserRow(claims.sub);
  if (!row || !ADMIN_ROLES.has(row.role)) throw new Error("admin token: account is not an administrator");
  if (typeof claims.cv !== "string" || claims.cv !== credentialVersion(row.password_hash)) {
    throw new Error("admin token: credentials changed");
  }
  if (typeof claims.jti !== "string" || !claims.jti || isRevoked(claims.jti)) {
    throw new Error("admin token: revoked");
  }
}

function verifyToken(token) {
  const claims = jwt.verify(token, secret, { algorithms: ["HS256"] });
  if (ADMIN_ROLES.has(claims.role)) assertCurrentAdmin(claims);
  return claims;
}

/** Signs an administrator token out. Returns the identity it belonged to, or null. */
function revokeToken(token) {
  let claims;
  try {
    claims = verifyToken(token);
  } catch {
    return null;
  }
  if (!ADMIN_ROLES.has(claims.role) || !claims.jti) return null;
  withFileLock(revokedFile, () => {
    const now = Math.floor(Date.now() / 1000);
    const revoked = readRevoked();
    for (const [jti, exp] of Object.entries(revoked)) {
      if (!Number.isFinite(exp) || exp <= now) delete revoked[jti];
    }
    revoked[claims.jti] = Number.isFinite(claims.exp) ? claims.exp : now + 7 * 24 * 3600;
    writeJsonAtomic(revokedFile, revoked, { durable: true, backup: false });
  });
  return { userId: String(claims.sub), email: claims.email, role: "administrator" };
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

// Development only. Production takes the administrator from ADMIN_EMAIL /
// ADMIN_PASSWORD and refuses this value (see passwordPolicy denylist).
const DEV_ADMIN_EMAIL = "admin@buzzard.de";
const DEV_ADMIN_PASSWORD = "BuzzardAdmin2026!";

function ensureAdmin() {
  const isProd = isProduction();
  const email = process.env.ADMIN_EMAIL || (!isProd ? DEV_ADMIN_EMAIL : null);
  const password = process.env.ADMIN_PASSWORD || (!isProd ? DEV_ADMIN_PASSWORD : null);
  if (!email || !password) return;
  if (isProd && !checkAdminPassword(password, { email, denylist: [DEV_ADMIN_PASSWORD] }).ok) {
    console.error("[db-auth] ADMIN_PASSWORD does not meet the administrator password rules; no database administrator created");
    return;
  }

  const normalized = email.toLowerCase();
  const existing = db.prepare("SELECT id, role, password_hash FROM users WHERE email = ?").get(normalized);

  if (!existing) {
    db.prepare("INSERT INTO users(email, password_hash, role, name) VALUES(?,?,?,?)").run(
      normalized,
      hashPassword(password),
      "admin",
      "Buzzard Admin"
    );
    return;
  }

  // Re-hashing on every start would change the credential version and end
  // every administrator token although nothing changed.
  if (existing.role === "admin" && verifyPassword(password, existing.password_hash) && !needsRehash(existing.password_hash)) {
    return;
  }
  db.prepare("UPDATE users SET password_hash = ?, role = 'admin' WHERE id = ?").run(
    hashPassword(password),
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
  return !isJwtSecretConfigured;
}

module.exports = {
  hashPassword,
  verifyPassword,
  signUser,
  buildClaims,
  verifyToken,
  revokeToken,
  DEV_ADMIN_PASSWORD,
  extractToken,
  requireAuth,
  requireAdmin,
  ensureAdmin,
  authenticateUser,
  getJwtSecret,
  isDefaultJwtSecret,
};
