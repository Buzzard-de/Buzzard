const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const dataDir = path.join(__dirname, "..", "data");
const usersFile = path.join(dataDir, "admin-users.json");
const sessionsFile = path.join(dataDir, "admin-sessions.json");
const seedFile = path.join(__dirname, "..", "..", "data", "buzzard_admin_users.seed.json");

const sessions = new Map();
const SESSION_TTL_MS = 8 * 60 * 60 * 1000;

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

function hashPassword(password) {
  return crypto.createHash("sha256").update(String(password)).digest("hex");
}

function loadUsers() {
  seedUsers();
  return readJson(usersFile, []);
}

function persistSessions() {
  const entries = [...sessions.entries()].map(([token, session]) => ({ token, session }));
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

function login(email, password) {
  const users = loadUsers();
  const user = users.find((u) => u.email.toLowerCase() === String(email).trim().toLowerCase());
  if (!user || user.password_hash !== hashPassword(password)) {
    return { success: false, errorKey: "admin.auth.invalid" };
  }

  const token = createToken();
  const session = {
    userId: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    expiresAt: Date.now() + SESSION_TTL_MS,
  };
  sessions.set(token, session);
  persistSessions();

  return {
    success: true,
    token,
    user: { id: user.id, email: user.email, name: user.name, role: user.role },
  };
}

function logout(token) {
  sessions.delete(token);
  persistSessions();
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
  if (!session) {
    res.status(401).json({ success: false, errorKey: "admin.auth.required" });
    return null;
  }
  req.adminUser = session;
  req.adminToken = token;
  return session;
}

module.exports = {
  login,
  logout,
  getSession,
  extractToken,
  requireAuth,
  loadUsers,
};
