const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { hashPassword, verifyPassword, needsRehash } = require("./password");
const { checkAdminPassword } = require("./passwordPolicy");
const { createRateLimiter, getClientIp } = require("./security");
const { logSecurityEvent } = require("./securityLog");
const { getLockoutInfo, recordFailure, clearFailures } = require("./accountLockout");
const adminTwoFactor = require("./adminTwoFactor");
const { resolveDataDir } = require("./dataDir");
const { inspectJsonFile, writeJsonAtomic, withFileLock } = require("./jsonFileStore");
const { appendToArchive } = require("./recordStore");
const { isProduction } = require("./runtimeEnv");
const { PERMISSIONS, can } = require("./rbac");

const dataDir = resolveDataDir();
const usersFile = path.join(dataDir, "admin-users.json");
const sessionsFile = path.join(dataDir, "admin-sessions.json");
const seedFile = path.join(__dirname, "..", "..", "data", "buzzard_admin_users.seed.json");

const SESSION_TTL_MS = 8 * 60 * 60 * 1000;
const MAX_SESSIONS_PER_USER = 10;
const MAX_EMAIL_LENGTH = 254;
const MAX_PASSWORD_LENGTH = 1024;
const TOKEN_PATTERN = /^[0-9a-f]{64}$/;

const loginRateLimit = createRateLimiter({ windowMs: 15 * 60 * 1000, max: 8, keyPrefix: "admin-login:" });
// Per address, whatever account is tried: stops one client from walking through many accounts.
const loginAddressRateLimit = createRateLimiter({ windowMs: 15 * 60 * 1000, max: 40, keyPrefix: "admin-login-ip:" });

function writeJson(file, data) {
  writeJsonAtomic(file, data, { durable: true });
}

function sha256(value) {
  return crypto.createHash("sha256").update(String(value)).digest("hex");
}

function fileStamp(file) {
  try {
    const stat = fs.statSync(file);
    return `${stat.ino}:${stat.mtimeMs}:${stat.size}`;
  } catch {
    return "absent";
  }
}

/** Changes whenever the stored password hash changes; never reveals the hash. */
function credentialStamp(passwordHash) {
  return sha256(`admin-credential:${passwordHash || ""}`).slice(0, 16);
}

// ---------------------------------------------------------------------------
// Accounts
// ---------------------------------------------------------------------------

function isValidUser(entry) {
  return (
    Boolean(entry) &&
    typeof entry === "object" &&
    typeof entry.id === "string" &&
    entry.id.length > 0 &&
    typeof entry.email === "string" &&
    /^[^\s@]+@[^\s@]+$/.test(entry.email) &&
    typeof entry.password_hash === "string" &&
    entry.password_hash.length > 0 &&
    typeof entry.role === "string" &&
    Object.prototype.hasOwnProperty.call(PERMISSIONS, entry.role)
  );
}

function readSeed() {
  try {
    const seed = JSON.parse(fs.readFileSync(seedFile, "utf8"));
    return Array.isArray(seed) ? seed : [];
  } catch {
    return [];
  }
}

/** Passwords that are public knowledge: the committed seed file and the development default. */
function knownDefaultPasswords() {
  const values = readSeed().map((entry) => entry.password);
  try {
    values.push(require("./dbAuth").DEV_ADMIN_PASSWORD);
  } catch {
    /* dbAuth needs SQLite; the seed list still applies */
  }
  return [...new Set(values.filter((value) => typeof value === "string" && value))];
}

function usersStoreState() {
  return inspectJsonFile(usersFile, { validate: Array.isArray });
}

/**
 * What the first administrator account depends on.
 *
 *   existing             accounts are stored
 *   ready                none stored; ADMIN_EMAIL / ADMIN_PASSWORD are usable
 *   missing_credentials  none stored and nothing to create one from
 *   invalid_email | weak_password
 *   store_unreadable     the users file exists but cannot be read; it is never replaced
 */
function adminBootstrapStatus() {
  const store = usersStoreState();
  if (store.state === "corrupt") return { state: "store_unreadable" };
  if ((store.state === "ok" || store.state === "restored") && store.value.some(isValidUser)) {
    return { state: "existing" };
  }
  const email = String(process.env.ADMIN_EMAIL || "").trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD || "";
  if (!email || !password) return { state: "missing_credentials" };
  if (email.length > MAX_EMAIL_LENGTH || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { state: "invalid_email" };
  const strength = checkAdminPassword(password, { email, denylist: knownDefaultPasswords() });
  if (!strength.ok) return { state: "weak_password", reason: strength.reason };
  return { state: "ready", email };
}

let warnedBootstrap = null;

/**
 * Production never seeds from the committed demo file. The first
 * administrator comes from ADMIN_EMAIL / ADMIN_PASSWORD; without usable
 * values no account exists and every login is refused.
 */
function seedProductionAdmin() {
  const status = adminBootstrapStatus();
  if (status.state !== "ready") {
    if (warnedBootstrap !== status.state) {
      warnedBootstrap = status.state;
      console.error(`[admin-auth] no administrator account can be created: ${status.state}${status.reason ? ` (${status.reason})` : ""}`);
    }
    return status;
  }
  withFileLock(usersFile, () => {
    if (usersStoreState().state !== "missing" && usersStoreState().state !== "empty") return;
    writeJson(usersFile, [
      {
        id: "usr-admin-001",
        email: status.email,
        name: "Buzzard Admin",
        role: "administrator",
        password_hash: hashPassword(process.env.ADMIN_PASSWORD),
        createdAt: new Date().toISOString(),
      },
    ]);
    logSecurityEvent({ type: "admin_bootstrap", success: true, userId: "usr-admin-001", role: "administrator" });
  });
  return { state: "created" };
}

function seedUsers() {
  const store = usersStoreState();
  if (store.state !== "missing") return;
  if (isProduction()) {
    seedProductionAdmin();
    return;
  }
  const users = readSeed().map(({ password, ...rest }) => ({
    ...rest,
    password_hash: hashPassword(password),
  }));
  withFileLock(usersFile, () => {
    if (usersStoreState().state === "missing") writeJson(usersFile, users);
  });
}

let usersCache = { stamp: null, users: [] };
let reportedInvalidUsers = null;

function loadUsers() {
  let stamp = fileStamp(usersFile);
  if (stamp === "absent") {
    seedUsers();
    stamp = fileStamp(usersFile);
  }
  if (usersCache.stamp === stamp) return usersCache.users.map((user) => ({ ...user }));
  const store = usersStoreState();
  const entries = store.state === "ok" || store.state === "restored" ? store.value : [];
  const users = entries.filter(isValidUser);
  if (entries.length !== users.length && reportedInvalidUsers !== stamp) {
    reportedInvalidUsers = stamp;
    console.error(`[admin-auth] ${entries.length - users.length} entr(ies) in admin-users.json are not valid accounts and are ignored`);
  }
  usersCache = { stamp, users };
  return users.map((user) => ({ ...user }));
}

function findUserById(userId) {
  return loadUsers().find((entry) => entry.id === userId) || null;
}

function updateUsers(mutate) {
  return withFileLock(usersFile, () => {
    const store = usersStoreState();
    if (store.state !== "ok" && store.state !== "restored") return { ok: false, errorKey: "admin.users.storeUnavailable" };
    const users = store.value;
    const result = mutate(users);
    if (result?.ok) writeJson(usersFile, users);
    return result;
  });
}

function publicUser(user) {
  return { id: user.id, email: user.email, name: user.name || user.email, role: user.role };
}

let seedCredentialCheck = { stamp: null, ids: [] };

/**
 * Ids of stored accounts whose password is still one from the committed seed
 * file. Each comparison is a scrypt run and a public health route asks for
 * this, so the answer is kept until the users file changes.
 */
function findSeedCredentialAccounts() {
  const stamp = fileStamp(usersFile);
  if (stamp === "absent") return [];
  if (seedCredentialCheck.stamp !== stamp) {
    const defaults = knownDefaultPasswords();
    const store = usersStoreState();
    const users = store.state === "ok" || store.state === "restored" ? store.value.filter(isValidUser) : [];
    const ids = users
      .filter((user) => defaults.some((password) => verifyPassword(password, user.password_hash)))
      .map((user) => user.id);
    seedCredentialCheck = { stamp, ids };
  }
  return [...seedCredentialCheck.ids];
}

// ---------------------------------------------------------------------------
// Sessions
//
// The file is the shared state: every API process re-reads it when it changed,
// and every change is made under the file lock. Only the SHA-256 of a token is
// kept, in memory and on disk, so neither a copy of the file nor a memory dump
// yields a usable bearer token.
// ---------------------------------------------------------------------------

const sessions = new Map();
let sessionsStamp = null;

function isValidSession(session) {
  return (
    Boolean(session) &&
    typeof session === "object" &&
    typeof session.userId === "string" &&
    typeof session.role === "string" &&
    Number.isFinite(session.expiresAt)
  );
}

/** What is kept of a session once it leaves the store: who, when, from where. Never the token or its hash. */
function endedSessionRecord(entry, reason) {
  const session = entry && typeof entry === "object" && entry.session && typeof entry.session === "object" ? entry.session : {};
  const text = (value, max) => (typeof value === "string" && value ? value.slice(0, max) : null);
  return {
    sessionId: text(session.sessionId, 80),
    userId: text(session.userId, 120),
    role: text(session.role, 40),
    createdAt: text(session.createdAt, 40),
    expiresAt: Number.isFinite(session.expiresAt) ? new Date(session.expiresAt).toISOString() : null,
    ip: text(session.ip, 45),
    reason,
    removedAt: new Date().toISOString(),
  };
}

function readSessionsFile(ended) {
  const loaded = new Map();
  const store = inspectJsonFile(sessionsFile, { validate: Array.isArray });
  // Only the file itself counts. Its previous version may still hold a session that was
  // ended by the last write, so a damaged or missing file means: everyone signs in again.
  const entries = store.state === "ok" ? store.value : [];
  const now = Date.now();
  for (const entry of entries) {
    if (!entry || !isValidSession(entry.session)) {
      if (ended) ended.push(endedSessionRecord(entry, "invalid_entry"));
      continue;
    }
    if (entry.session.expiresAt <= now) {
      if (ended) ended.push(endedSessionRecord(entry, "expired"));
      continue;
    }
    // Files written before tokens were hashed carry the token itself; it is
    // replaced by its hash here and no longer written back.
    const tokenHash =
      typeof entry.tokenHash === "string" && TOKEN_PATTERN.test(entry.tokenHash)
        ? entry.tokenHash
        : typeof entry.token === "string" && entry.token
          ? sha256(entry.token)
          : null;
    if (!tokenHash) {
      if (ended) ended.push(endedSessionRecord(entry, "invalid_entry"));
      continue;
    }
    const session = { ...entry.session };
    if (!session.sessionId) session.sessionId = `sess-${tokenHash.slice(0, 16)}`;
    loaded.set(tokenHash, session);
  }
  return loaded;
}

function replaceSessions(loaded) {
  sessions.clear();
  for (const [tokenHash, session] of loaded) sessions.set(tokenHash, session);
}

function syncSessions() {
  const stamp = fileStamp(sessionsFile);
  if (stamp === sessionsStamp) return;
  replaceSessions(readSessionsFile());
  sessionsStamp = stamp;
}

function mutateSessions(mutate) {
  return withFileLock(sessionsFile, () => {
    // Entries that are not carried over (expired, unusable) are written to the
    // session archive first, so a rewrite never makes a sign-in disappear without trace.
    const ended = [];
    replaceSessions(readSessionsFile(ended));
    if (ended.length) appendToArchive(sessionsFile, ended);
    const result = mutate(sessions);
    writeJson(
      sessionsFile,
      [...sessions.entries()].map(([tokenHash, session]) => ({ tokenHash, session }))
    );
    sessionsStamp = fileStamp(sessionsFile);
    return result;
  });
}

syncSessions();

function createToken() {
  return crypto.randomBytes(32).toString("hex");
}

function createSession(user, meta = {}) {
  // The token is always generated here; a value supplied by a client is never adopted.
  const token = createToken();
  const session = {
    sessionId: `sess-${crypto.randomBytes(8).toString("hex")}`,
    userId: user.id,
    email: user.email,
    name: user.name || user.email,
    role: user.role,
    cred: credentialStamp(user.password_hash),
    expiresAt: Date.now() + SESSION_TTL_MS,
    createdAt: new Date().toISOString(),
    ip: meta.ip || null,
    userAgent: meta.userAgent ? String(meta.userAgent).slice(0, 300) : null,
  };
  mutateSessions((map) => {
    const own = [...map.entries()]
      .filter(([, entry]) => entry.userId === user.id)
      .sort((a, b) => String(a[1].createdAt).localeCompare(String(b[1].createdAt)));
    for (const [tokenHash] of own.slice(0, Math.max(0, own.length - (MAX_SESSIONS_PER_USER - 1)))) {
      map.delete(tokenHash);
    }
    map.set(sha256(token), session);
  });
  return { token, session };
}

function dropSession(tokenHash, reason, session) {
  mutateSessions((map) => map.delete(tokenHash));
  if (reason) {
    logSecurityEvent({
      type: "session_invalidated",
      success: true,
      userId: session.userId,
      role: session.role,
      detail: { sessionId: session.sessionId, reason },
    });
  }
}

/** Why a stored session no longer matches its account, or null. */
function staleReason(session) {
  const user = findUserById(session.userId);
  if (!user) return "account_removed";
  if (user.role !== session.role) return "role_changed";
  if (session.cred && session.cred !== credentialStamp(user.password_hash)) return "password_changed";
  return null;
}

function getSession(token) {
  if (typeof token !== "string" || !TOKEN_PATTERN.test(token)) return null;
  syncSessions();
  const tokenHash = sha256(token);
  const session = sessions.get(tokenHash);
  if (!session) return null;
  if (session.expiresAt <= Date.now()) {
    dropSession(tokenHash, null, session);
    return null;
  }
  const reason = staleReason(session);
  if (reason) {
    dropSession(tokenHash, reason, session);
    return null;
  }
  return session;
}

function revokeUserSessions(userId, { exceptToken = null, reason = "revoked", actor = null } = {}) {
  const keep = exceptToken ? sha256(exceptToken) : null;
  const removed = mutateSessions((map) => {
    const ids = [];
    for (const [tokenHash, session] of map) {
      if (session.userId !== userId || tokenHash === keep) continue;
      map.delete(tokenHash);
      ids.push(session.sessionId);
    }
    return ids;
  });
  if (removed.length) {
    logSecurityEvent({
      type: "session_revoked",
      success: true,
      userId,
      detail: { sessions: removed.length, reason, revokedBy: actor },
    });
  }
  return removed.length;
}

// ---------------------------------------------------------------------------
// Login
// ---------------------------------------------------------------------------

let dummyHash = null;

/** Spends the same scrypt work as a real check, so an unknown address answers as slowly as a wrong password. */
function burnPasswordCheck(password) {
  if (!dummyHash) dummyHash = hashPassword(crypto.randomBytes(24).toString("hex"));
  verifyPassword(typeof password === "string" ? password.slice(0, MAX_PASSWORD_LENGTH) : "", dummyHash);
}

function upgradePasswordHash(user, password) {
  if (!needsRehash(user.password_hash)) return user;
  const passwordHash = hashPassword(password);
  updateUsers((users) => {
    const entry = users.find((candidate) => candidate?.id === user.id);
    if (!entry) return { ok: false };
    entry.password_hash = passwordHash;
    return { ok: true };
  });
  return { ...user, password_hash: passwordHash };
}

function requestMeta(req) {
  return {
    ip: req ? getClientIp(req) : null,
    userAgent: req?.headers?.["user-agent"] || null,
  };
}

function login(email, password, req) {
  const ip = req ? getClientIp(req) : "unknown";
  const normalizedEmail = String(typeof email === "string" ? email : "")
    .trim()
    .toLowerCase()
    .slice(0, MAX_EMAIL_LENGTH);
  const limiterRequest = req || { headers: {}, socket: { remoteAddress: ip } };

  if (loginAddressRateLimit(limiterRequest, { key: ip })) {
    logSecurityEvent({ type: "admin_login_rate_limited", success: false, ip, email: normalizedEmail, path: "/api/admin/login", detail: { scope: "address" } });
    return { success: false, errorKey: "admin.auth.rateLimited" };
  }

  if (adminTwoFactor.isStoreUnreadable()) {
    // Which accounts have a second factor is unknown; signing in without one is not an option.
    // Answered before the password is looked at, so the answer says nothing about it.
    logSecurityEvent({
      type: "admin_login_failed",
      success: false,
      ip,
      email: normalizedEmail,
      path: "/api/admin/login",
      detail: { reason: "two_factor_store_unreadable" },
    });
    return { success: false, errorKey: "admin.auth.unavailable" };
  }

  const lockout = getLockoutInfo("admin", normalizedEmail);
  if (lockout.locked) {
    logSecurityEvent({
      type: "admin_login_locked",
      success: false,
      ip,
      email: normalizedEmail,
      path: "/api/admin/login",
      detail: { retryAfterSec: lockout.retryAfterSec },
    });
    return {
      success: false,
      errorKey: "admin.auth.locked",
      retryAfterSec: lockout.retryAfterSec,
    };
  }

  if (loginRateLimit(limiterRequest, { key: `${ip}:${normalizedEmail}` })) {
    logSecurityEvent({
      type: "admin_login_rate_limited",
      success: false,
      ip,
      email: normalizedEmail,
      path: "/api/admin/login",
    });
    return { success: false, errorKey: "admin.auth.rateLimited" };
  }

  const passwordUsable = typeof password === "string" && password.length > 0 && password.length <= MAX_PASSWORD_LENGTH;
  const found = normalizedEmail ? loadUsers().find((entry) => entry.email.toLowerCase() === normalizedEmail) : null;
  let authenticated = false;
  if (found && passwordUsable) {
    authenticated = verifyPassword(password, found.password_hash);
  } else {
    burnPasswordCheck(password);
  }

  if (!authenticated) {
    const failure = recordFailure("admin", normalizedEmail, {
      ip,
      email: normalizedEmail,
      path: "/api/admin/login",
    });
    logSecurityEvent({
      type: "admin_login_failed",
      success: false,
      ip,
      email: normalizedEmail,
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

  const user = upgradePasswordHash(found, password);
  clearFailures("admin", normalizedEmail);

  if (adminTwoFactor.isEnabled(normalizedEmail)) {
    const challengeToken = adminTwoFactor.createChallenge(user);
    logSecurityEvent({
      type: "admin_login_2fa_required",
      success: true,
      ip,
      userId: user.id,
      email: user.email,
      role: user.role,
      path: "/api/admin/login",
    });
    return {
      success: true,
      requires2FA: true,
      challengeToken,
      user: publicUser(user),
    };
  }

  const { token } = createSession(user, requestMeta(req));

  logSecurityEvent({
    type: "admin_login",
    success: true,
    ip,
    userId: user.id,
    email: user.email,
    role: user.role,
    path: "/api/admin/login",
  });

  return { success: true, token, user: publicUser(user) };
}

function verifyTwoFactor(challengeToken, code, req) {
  const ip = req ? getClientIp(req) : "unknown";
  const challenge = adminTwoFactor.consumeChallenge(challengeToken);
  if (!challenge) {
    logSecurityEvent({
      type: "admin_login_2fa_failed",
      success: false,
      ip,
      path: "/api/admin/login/2fa",
      detail: { reason: "invalid_challenge" },
    });
    return { success: false, errorKey: "admin.2fa.challengeExpired" };
  }

  // The account may have been removed or changed while the challenge was open.
  const user = findUserById(challenge.userId);
  if (!user || user.role !== challenge.role || !adminTwoFactor.verifyLoginCode(challenge.email, code)) {
    logSecurityEvent({
      type: "admin_login_2fa_failed",
      success: false,
      ip,
      email: challenge.email,
      path: "/api/admin/login/2fa",
    });
    return { success: false, errorKey: "admin.2fa.invalidCode" };
  }

  const { token } = createSession(user, requestMeta(req));

  logSecurityEvent({
    type: "admin_login",
    success: true,
    ip,
    userId: user.id,
    email: user.email,
    role: user.role,
    path: "/api/admin/login/2fa",
    detail: { via2FA: true },
  });

  return { success: true, token, user: publicUser(user) };
}

/** Ends the session of this token. Safe to repeat; an unknown token changes nothing. */
function logout(token, req) {
  let ended = null;
  if (typeof token === "string" && TOKEN_PATTERN.test(token)) {
    const tokenHash = sha256(token);
    syncSessions();
    if (sessions.has(tokenHash)) {
      ended = mutateSessions((map) => {
        const session = map.get(tokenHash) || null;
        map.delete(tokenHash);
        return session;
      });
    }
  } else if (token) {
    try {
      ended = require("./dbAuth").revokeToken(token);
    } catch {
      ended = null;
    }
  }
  if (ended) {
    logSecurityEvent({
      type: "admin_logout",
      success: true,
      ip: req ? getClientIp(req) : null,
      userId: ended.userId || null,
      email: ended.email || null,
      role: ended.role || null,
      path: "/api/admin/logout",
      detail: ended.sessionId ? { sessionId: ended.sessionId } : null,
    });
  }
  return Boolean(ended);
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

  if (token && !TOKEN_PATTERN.test(token)) {
    try {
      // verifyToken refuses administrator tokens that were revoked or whose
      // account, role or password changed since they were issued.
      const { verifyToken } = require("./dbAuth");
      const user = verifyToken(token);
      if (user.role === "admin" || user.role === "administrator") {
        req.adminUser = {
          userId: user.sub,
          email: user.email,
          name: user.name || user.email,
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
    path: String(req.url || "").split("?")[0],
  });
  res.status(401).json({ success: false, errorKey: "admin.auth.required" });
  return null;
}

function listActiveSessions(userId, { currentToken = null } = {}) {
  syncSessions();
  const now = Date.now();
  const currentHash = typeof currentToken === "string" && TOKEN_PATTERN.test(currentToken) ? sha256(currentToken) : null;
  const rows = [];
  for (const [tokenHash, session] of sessions.entries()) {
    if (session.expiresAt <= now) continue;
    if (userId && session.userId !== userId) continue;
    rows.push({
      sessionId: session.sessionId,
      current: tokenHash === currentHash,
      userId: session.userId,
      email: session.email,
      role: session.role,
      createdAt: session.createdAt,
      expiresAt: new Date(session.expiresAt).toISOString(),
      ip: session.ip,
      userAgent: session.userAgent,
    });
  }
  return rows.sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
}

function revokeSession(sessionId, { revokedBy } = {}) {
  if (typeof sessionId !== "string" || !sessionId) return false;
  const revoked = mutateSessions((map) => {
    for (const [tokenHash, session] of map) {
      if (session.sessionId === sessionId) {
        map.delete(tokenHash);
        return session;
      }
    }
    return null;
  });
  if (!revoked) return false;
  logSecurityEvent({
    type: "session_revoked",
    success: true,
    userId: revoked.userId,
    email: revoked.email,
    detail: { sessionId, revokedBy },
  });
  return true;
}

// ---------------------------------------------------------------------------
// Account changes that end sessions
// ---------------------------------------------------------------------------

/**
 * Sets a new password for the signed-in account. Every session of the account
 * ends, including the one that made the request; a fresh one is returned.
 */
function changePassword(session, currentPassword, newPassword, req) {
  const ip = req ? getClientIp(req) : null;
  const user = findUserById(session?.userId);
  const lockout = getLockoutInfo("admin-password", session?.userId);
  if (lockout.locked) return { success: false, status: 429, errorKey: "admin.auth.locked", retryAfterSec: lockout.retryAfterSec };
  if (!user || typeof currentPassword !== "string" || !verifyPassword(currentPassword.slice(0, MAX_PASSWORD_LENGTH), user.password_hash)) {
    recordFailure("admin-password", session?.userId, { ip, path: "/api/admin/account/password" });
    logSecurityEvent({ type: "admin_password_change_failed", success: false, ip, userId: session?.userId, role: session?.role, detail: { reason: "current_password" } });
    return { success: false, status: 401, errorKey: "admin.auth.invalid" };
  }
  const strength = checkAdminPassword(newPassword, { email: user.email, denylist: knownDefaultPasswords() });
  if (!strength.ok) return { success: false, status: 400, errorKey: "admin.password.weak", reason: strength.reason };
  if (verifyPassword(newPassword, user.password_hash)) {
    return { success: false, status: 400, errorKey: "admin.password.unchanged" };
  }

  const passwordHash = hashPassword(newPassword);
  const updated = updateUsers((users) => {
    const entry = users.find((candidate) => candidate?.id === user.id);
    if (!entry) return { ok: false, errorKey: "admin.users.notFound" };
    entry.password_hash = passwordHash;
    entry.passwordChangedAt = new Date().toISOString();
    return { ok: true };
  });
  if (!updated.ok) return { success: false, status: 409, errorKey: updated.errorKey };

  clearFailures("admin-password", user.id);
  revokeUserSessions(user.id, { reason: "password_changed", actor: user.id });
  const { token } = createSession({ ...user, password_hash: passwordHash }, requestMeta(req));
  logSecurityEvent({ type: "admin_password_changed", success: true, ip, userId: user.id, email: user.email, role: user.role });
  require("./coreAudit").logAudit({
    userId: user.id,
    userEmail: user.email,
    role: user.role,
    action: "admin.account.password_change",
    entityType: "admin_user",
    entityId: user.id,
    // That it changed is the record; neither the old nor the new value is.
    field: "password",
    ip,
    userAgent: req?.headers?.["user-agent"] || null,
  });
  return { success: true, token, user: publicUser(user) };
}

/**
 * Changes the role of another account and ends its sessions.
 * An actor can only hand out roles whose permissions it holds itself.
 */
function changeUserRole(actor, userId, role, req) {
  const ip = req ? getClientIp(req) : null;
  const deny = (status, errorKey, type = "privilege_escalation_attempt") => {
    logSecurityEvent({ type, success: false, ip, userId: actor?.userId, role: actor?.role, resource: `admin-user:${userId}`, detail: { requestedRole: String(role).slice(0, 40), errorKey } });
    return { success: false, status, errorKey };
  };
  if (!actor || !can(actor.role, "users.write")) return deny(403, "admin.auth.forbidden", "permission_denied");
  if (!Object.prototype.hasOwnProperty.call(PERMISSIONS, role)) return { success: false, status: 400, errorKey: "admin.users.unknownRole" };
  if (actor.userId === userId) return deny(403, "admin.users.ownRole");
  const grants = PERMISSIONS[role];
  const actorHasAll = PERMISSIONS[actor.role]?.includes("*") === true;
  if (!actorHasAll && !grants.every((permission) => permission !== "*" && can(actor.role, permission))) {
    return deny(403, "admin.users.roleAboveOwn");
  }

  const target = findUserById(userId);
  if (!target) return { success: false, status: 404, errorKey: "admin.users.notFound" };
  // An actor without full rights must not strip rights it could not grant either.
  if (PERMISSIONS[target.role]?.includes("*") && !PERMISSIONS[actor.role]?.includes("*")) return deny(403, "admin.users.roleAboveOwn");
  if (target.role === role) return { success: true, user: publicUser(target), changed: false };

  const updated = updateUsers((users) => {
    const entry = users.find((candidate) => candidate?.id === userId);
    if (!entry) return { ok: false, errorKey: "admin.users.notFound" };
    const fullRights = users.filter((candidate) => isValidUser(candidate) && PERMISSIONS[candidate.role].includes("*"));
    if (PERMISSIONS[entry.role]?.includes("*") && !grants.includes("*") && fullRights.length <= 1) {
      return { ok: false, errorKey: "admin.users.lastAdministrator" };
    }
    entry.role = role;
    entry.roleChangedAt = new Date().toISOString();
    return { ok: true };
  });
  if (!updated.ok) return { success: false, status: 409, errorKey: updated.errorKey };

  revokeUserSessions(userId, { reason: "role_changed", actor: actor.userId });
  logSecurityEvent({
    type: "admin_role_changed",
    success: true,
    ip,
    userId: actor.userId,
    role: actor.role,
    resource: `admin-user:${userId}`,
    detail: { from: target.role, to: role },
  });
  require("./coreAudit").logAudit({
    userId: actor.userId,
    userEmail: actor.email,
    role: actor.role,
    action: "admin.user.role_change",
    entityType: "admin_user",
    entityId: userId,
    field: "role",
    oldValue: target.role,
    newValue: role,
    ip,
    userAgent: req?.headers?.["user-agent"] || null,
  });
  return { success: true, user: publicUser({ ...target, role }), changed: true, previousRole: target.role };
}

function listUsers() {
  return loadUsers().map((user) => ({ ...publicUser(user), twoFactor: adminTwoFactor.isEnabled(user.email) }));
}

module.exports = {
  login,
  verifyTwoFactor,
  logout,
  getSession,
  extractToken,
  requireAuth,
  loadUsers,
  listUsers,
  listActiveSessions,
  revokeSession,
  revokeUserSessions,
  changePassword,
  changeUserRole,
  findSeedCredentialAccounts,
  adminBootstrapStatus,
  seedProductionAdmin,
  SESSION_TTL_MS,
  MAX_SESSIONS_PER_USER,
};
