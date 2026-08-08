const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const dataDir = path.join(__dirname, "..", "data");
const sessionsFile = path.join(dataDir, "customer-sessions.json");
const resetFile = path.join(dataDir, "password-reset-tokens.json");
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const RESET_TTL_MS = 60 * 60 * 1000;

const sessions = new Map();
const loginAttempts = new Map();
const MAX_ATTEMPTS = 8;
const WINDOW_MS = 15 * 60 * 1000;

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

function hashPassword(password) {
  return crypto.createHash("sha256").update(String(password)).digest("hex");
}

function loadSessions() {
  for (const entry of readJson(sessionsFile, [])) {
    if (entry.session?.expiresAt > Date.now()) sessions.set(entry.token, entry.session);
  }
}

loadSessions();

function persistSessions() {
  writeJson(
    sessionsFile,
    [...sessions.entries()].map(([token, session]) => ({ token, session }))
  );
}

function createToken() {
  return crypto.randomBytes(32).toString("hex");
}

function rateLimited(key) {
  const now = Date.now();
  const records = (loginAttempts.get(key) || []).filter((ts) => now - ts < WINDOW_MS);
  if (records.length >= MAX_ATTEMPTS) {
    loginAttempts.set(key, records);
    return true;
  }
  records.push(now);
  loginAttempts.set(key, records);
  return false;
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
  sessions.set(token, session);
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

function login(email, password, verifyPassword) {
  const key = String(email).trim().toLowerCase();
  if (rateLimited(key)) return { success: false, errorKey: "account.auth.rateLimited" };

  const customer = verifyPassword(key, password);
  if (!customer) return { success: false, errorKey: "account.auth.invalid" };

  const session = createSession(customer);
  return { success: true, ...session };
}

function logout(token) {
  sessions.delete(token);
  persistSessions();
}

function getSession(token) {
  if (!token) return null;
  const session = sessions.get(token);
  if (!session || session.expiresAt <= Date.now()) {
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

function requireCustomer(req, res) {
  const session = getSession(extractToken(req));
  if (!session) {
    res.status(401).json({ success: false, errorKey: "account.auth.required" });
    return null;
  }
  req.customerSession = session;
  req.customerToken = extractToken(req);
  return session;
}

function createResetToken(customerId) {
  const token = createToken();
  const tokens = readJson(resetFile, []).filter((t) => t.expiresAt > Date.now());
  tokens.push({ token, customerId, expiresAt: Date.now() + RESET_TTL_MS, createdAt: new Date().toISOString() });
  writeJson(resetFile, tokens);
  return token;
}

function consumeResetToken(token) {
  const tokens = readJson(resetFile, []);
  const idx = tokens.findIndex((t) => t.token === token && t.expiresAt > Date.now());
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
};
