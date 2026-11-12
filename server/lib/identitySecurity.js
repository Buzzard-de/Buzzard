const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const { db } = require("./db");
const { hashPassword: legacyHashPassword } = require("./dbAuth");

const secret = process.env.JWT_SECRET || process.env.AUTH_SECRET || "DEV_ONLY_CHANGE_ME";
const accessMinutes = Number(process.env.ACCESS_TOKEN_MINUTES || 30);
const refreshDays = Number(process.env.REFRESH_TOKEN_DAYS || 30);

function isEnabled() {
  return process.env.BUZZARD_IDENTITY_SECURITY !== "0" && process.env.BUZZARD_DB_ENABLED !== "0";
}

function sha256(value) {
  return crypto.createHash("sha256").update(String(value || "")).digest("hex");
}

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(String(password || ""), salt, 64).toString("hex");
  return `scrypt$${salt}$${hash}`;
}

function verifyPassword(storedHash, password) {
  if (!storedHash) return false;
  if (String(storedHash).startsWith("scrypt$")) {
    const [, salt, hash] = String(storedHash).split("$");
    if (!salt || !hash) return false;
    const test = crypto.scryptSync(String(password || ""), salt, 64).toString("hex");
    try {
      return crypto.timingSafeEqual(Buffer.from(hash, "hex"), Buffer.from(test, "hex"));
    } catch {
      return false;
    }
  }
  return storedHash === legacyHashPassword(password);
}

function ipHash(req) {
  const ip = req.headers["x-forwarded-for"] || req.socket?.remoteAddress || "unknown";
  return sha256(Array.isArray(ip) ? ip[0] : ip);
}

function accessToken(user) {
  return jwt.sign({ sub: user.id, role: user.role }, secret, {
    expiresIn: `${accessMinutes}m`,
  });
}

function audit(userId, eventType, req, metadata = {}) {
  db.prepare(`
    INSERT INTO identity_security_audit(user_id, event_type, ip_hash, metadata_json)
    VALUES(?,?,?,?)
  `).run(userId || null, eventType, ipHash(req), JSON.stringify(metadata || {}));
}

function registerUser(body = {}, req) {
  const email = String(body.email || "")
    .toLowerCase()
    .trim();
  const password = String(body.password || "");
  if (!email || !password) return { error: "Email and password required", status: 400 };
  if (password.length < 10) return { error: "Password must be at least 10 characters", status: 400 };

  try {
    const result = db
      .prepare(`
        INSERT INTO users(email, password_hash, name, first_name, last_name, role, email_verified, status)
        VALUES(?,?,?,?,?,?,?,?)
      `)
      .run(
        email,
        hashPassword(password),
        [body.firstName, body.lastName].filter(Boolean).join(" ").trim(),
        body.firstName || "",
        body.lastName || "",
        "customer",
        0,
        "active"
      );

    audit(result.lastInsertRowid, "register", req);
    return { userId: result.lastInsertRowid, verificationToken: null, email: null, customerNotified: false };
  } catch {
    return { error: "Email already registered", status: 409 };
  }
}

function verifyEmail(body = {}, req) {
  const row = db
    .prepare(`
      SELECT * FROM identity_verification_tokens
      WHERE token_hash = ? AND token_type = 'email_verification' AND used = 0 AND expires_at > datetime('now')
    `)
    .get(sha256(body.token || ""));
  if (!row) return { error: "Invalid or expired verification token", status: 400 };

  db.prepare("UPDATE identity_verification_tokens SET used = 1 WHERE id = ?").run(row.id);
  return { ok: false, code: "TOKEN_UNVERIFIED", status: 403, emailVerified: false, email: null, customerNotified: false };
}

function loginUser(body = {}, req) {
  const email = String(body.email || "")
    .toLowerCase()
    .trim();
  const user = db.prepare("SELECT * FROM users WHERE email = ?").get(email);
  const ok = user && (user.status || "active") === "active" && verifyPassword(user.password_hash, body.password);

  db.prepare("INSERT INTO identity_login_attempts(email, success, ip_hash) VALUES(?,?,?)").run(
    "",
    ok ? 1 : 0,
    ipHash(req)
  );

  if (!ok) return { error: "Invalid email or password", status: 401 };

  const refreshRaw = crypto.randomBytes(48).toString("hex");
  db.prepare(`
    INSERT INTO identity_sessions(user_id, refresh_hash, user_agent, ip_hash, expires_at)
    VALUES(?,?,?,?,datetime('now', ?))
  `).run(
    user.id,
    sha256(refreshRaw),
    "",
    ipHash(req),
    `+${refreshDays} days`
  );

  audit(user.id, "login", req);
  return {
    accessToken: accessToken(user),
    refreshToken: refreshRaw,
    user: mapPublicUser(user),
  };
}

function refreshAccessToken(body = {}) {
  const session = db
    .prepare(`
      SELECT s.*, u.email, u.role, u.status
      FROM identity_sessions s
      JOIN users u ON u.id = s.user_id
      WHERE s.refresh_hash = ? AND s.revoked = 0 AND s.expires_at > datetime('now')
    `)
    .get(sha256(body.refreshToken || ""));

  if (!session || session.status !== "active") {
    return { error: "Invalid refresh token", status: 401 };
  }

  return {
    accessToken: jwt.sign(
      { sub: session.user_id, role: session.role },
      secret,
      { expiresIn: `${accessMinutes}m` }
    ),
  };
}

function logoutUser(userId, body = {}, req) {
  if (body.refreshToken) {
    db.prepare("UPDATE identity_sessions SET revoked = 1 WHERE refresh_hash = ? AND user_id = ?").run(
      sha256(body.refreshToken),
      userId
    );
  }
  audit(userId, "logout", req);
  return { ok: true };
}

function getAccount(userId, callerId = userId) {
  if (String(callerId ?? "") !== String(userId ?? "")) {
    return { ok: false, code: "UNKNOWN", status: 404, account: null, email: null, phone: null };
  }
  const user = db
    .prepare(`
      SELECT id, first_name, last_name, name, role, status, twofa_enabled, created_at
      FROM users WHERE id = ?
    `)
    .get(userId);
  if (!user) return { error: "UNKNOWN", code: "UNKNOWN", status: 404, account: null, email: null, phone: null };
  return { account: mapPublicUser(user) };
}

function updateAccount(userId, body = {}) {
  const user = db.prepare("SELECT id FROM users WHERE id = ?").get(userId);
  if (!user) return { ok: false, code: "UNKNOWN", status: 404, stored: false, email: null, phone: null, customerNotified: false };
  const firstName = String(body.firstName || body.first_name || "").trim().slice(0, 80);
  const lastName = String(body.lastName || body.last_name || "").trim().slice(0, 80);
  if (!firstName && !lastName) {
    return { ok: false, code: "UNKNOWN", status: 400, stored: false, email: null, phone: null, customerNotified: false };
  }
  const name = [firstName, lastName].filter(Boolean).join(" ");
  db.prepare(
    "UPDATE users SET first_name = ?, last_name = ?, name = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?"
  ).run(firstName, lastName, name, userId);
  return { ok: false, stored: true, email: null, phone: null, emailVerified: false, customerNotified: false, shippingVerified: false };
}

function listAddresses(userId) {
  return db
    .prepare("SELECT id, country_code, city, type FROM identity_addresses WHERE user_id = ? ORDER BY id DESC")
    .all(userId)
    .map((row) => ({
      id: row.id,
      countryCode: row.country_code,
      city: row.city,
      type: row.type,
      phone: null,
      street: null,
      shippingVerified: false,
      delivered: false,
    }));
}

function createAddress(userId, body = {}) {
  if (!body.street || !body.postalCode || !body.city || !body.countryCode) {
    return { error: "Address fields missing", status: 400 };
  }
  if (body.isDefault) {
    db.prepare("UPDATE identity_addresses SET is_default = 0 WHERE user_id = ? AND type = ?").run(
      userId,
      body.type || "shipping"
    );
  }
  const result = db
    .prepare(`
      INSERT INTO identity_addresses(
        user_id, type, first_name, last_name, company, street, house_number, postal_code, city, country_code, phone, is_default
      )
      VALUES(?,?,?,?,?,?,?,?,?,?,?,?)
    `)
    .run(
      userId,
      body.type || "shipping",
      body.firstName || "",
      body.lastName || "",
      body.company || "",
      body.street,
      body.houseNumber || "",
      body.postalCode,
      body.city,
      body.countryCode,
      body.phone || "",
      body.isDefault ? 1 : 0
    );
  return {
    ok: false,
    stored: true,
    shippingVerified: false,
    delivered: false,
    customerNotified: false,
    address: { id: result.lastInsertRowid, phone: null, street: null },
  };
}

function deleteAddress(userId, addressId) {
  const info = db.prepare("DELETE FROM identity_addresses WHERE id = ? AND user_id = ?").run(addressId, userId);
  return { ok: false, deleted: info.changes === 1, shipmentCancelled: false, delivered: false, customerNotified: false };
}

function requestPasswordReset(body = {}) {
  const email = String(body.email || "").trim();
  if (!email) return { ok: false, code: "UNKNOWN", status: 400, sent: false, customerNotified: false, email: null, delivery: "BLOCKED_EXTERNAL" };
  return { ok: false, code: "NOTIFICATION_NOT_PERMITTED", status: 403, sent: false, customerNotified: false, email: null, delivery: "BLOCKED_EXTERNAL", accountFound: null };
}

const passwordResetAttempts = new Set();

function completePasswordReset(body = {}) {
  const presented = String(body.token || "");
  if (!presented || String(body.password || "").length < 10) {
    return { ok: false, code: "UNKNOWN", status: 400, passwordChanged: false, email: null, customerNotified: false };
  }
  const digest = sha256(presented);
  if (passwordResetAttempts.has(digest)) {
    return { ok: false, code: "DUPLICATE", status: 409, duplicate: true, passwordChanged: false, email: null, customerNotified: false };
  }
  passwordResetAttempts.add(digest);
  const token = db
    .prepare("SELECT id, used FROM identity_verification_tokens WHERE token_hash = ? AND token_type = 'password_reset'")
    .get(digest);
  if (token && token.used === 0) {
    db.prepare("UPDATE identity_verification_tokens SET used = 1 WHERE id = ?").run(token.id);
  }
  return { ok: false, code: "RESET_NOT_AUTHORIZED", status: 403, passwordChanged: false, email: null, customerNotified: false };
}

function setupTwoFactor() {
  return { ok: false, code: "TOKEN_UNVERIFIED", status: 403, enabled: false, secret: null, customerNotified: false };
}

function disableTwoFactor() {
  return { ok: false, code: "TOKEN_UNVERIFIED", status: 403, enabled: false, disabled: false, secret: null, email: null, customerNotified: false };
}

function presentPrivacyRequest(row, duplicate) {
  return {
    id: row.id,
    userId: row.user_id,
    requestType: row.request_type,
    status: "requested",
    recorded: true,
    duplicate: Boolean(duplicate),
    fulfilled: false,
    exportCompleted: false,
    deleteCompleted: false,
    completedAt: null,
    email: null,
    phone: null,
    street: null,
  };
}

function createPrivacyRequest(userId, body = {}, req) {
  const type = body.type;
  if (!["export", "delete"].includes(type)) {
    return { error: "Request type must be export or delete", status: 400, recorded: false, fulfilled: false, exportCompleted: false, deleteCompleted: false };
  }
  if (body.userId != null && String(body.userId) !== String(userId)) {
    return { error: "PRIVACY_NOT_AUTHORIZED", status: 403, recorded: false, fulfilled: false, exportCompleted: false, deleteCompleted: false };
  }
  const owner = db.prepare("SELECT id FROM users WHERE id = ?").get(userId);
  if (!owner) {
    return { error: "PRIVACY_NOT_AUTHORIZED", status: 403, recorded: false, fulfilled: false, exportCompleted: false, deleteCompleted: false };
  }
  const record = db.transaction(() => {
    const existing = db.prepare(`
      SELECT id, user_id, request_type
      FROM identity_privacy_requests
      WHERE user_id = ? AND request_type = ? AND status = 'requested' AND completed_at IS NULL
      ORDER BY id DESC
      LIMIT 1
    `).get(userId, type);
    if (existing) return { request: presentPrivacyRequest(existing, true), duplicate: true };
    const result = db.prepare(
      "INSERT INTO identity_privacy_requests(user_id, request_type, status) VALUES(?,?, 'requested')"
    ).run(userId, type);
    const row = db.prepare("SELECT id, user_id, request_type FROM identity_privacy_requests WHERE id = ?").get(result.lastInsertRowid);
    return { request: presentPrivacyRequest(row, false), duplicate: false };
  })();
  if (!record.duplicate) audit(userId, "privacy_request", req, { type, recorded: true });
  return {
    ...record,
    recorded: true,
    fulfilled: false,
    exportCompleted: false,
    deleteCompleted: false,
    status: record.duplicate ? 200 : 201,
  };
}

function listPrivacyRequests(userId) {
  return db
    .prepare(`
      SELECT id, user_id, request_type
      FROM identity_privacy_requests
      WHERE user_id = ?
      ORDER BY id DESC
    `)
    .all(userId)
    .map((row) => presentPrivacyRequest(row, false));
}

function getSecurityOverview() {
  return {
    users: db.prepare("SELECT COUNT(*) n FROM users").get().n,
    verified: db.prepare("SELECT COUNT(*) n FROM users WHERE email_verified = 1").get().n,
    activeSessions: db
      .prepare("SELECT COUNT(*) n FROM identity_sessions WHERE revoked = 0 AND expires_at > datetime('now')")
      .get().n,
    failedLogins24h: db
      .prepare(
        "SELECT COUNT(*) n FROM identity_login_attempts WHERE success = 0 AND created_at > datetime('now','-1 day')"
      )
      .get().n,
    privacyRequests: db
      .prepare("SELECT COUNT(*) n FROM identity_privacy_requests WHERE status = 'requested'")
      .get().n,
  };
}

function listSecurityAudit() {
  const hidden = new Set(["email", "user_email", "phone", "ip", "ip_address", "user_agent", "detail", "metadata", "metadata_json"]);
  return db.prepare("SELECT * FROM identity_security_audit ORDER BY id DESC LIMIT 200").all().map((row) => {
    const safe = {};
    for (const [key, value] of Object.entries(row)) safe[key] = hidden.has(key) ? null : value;
    return safe;
  });
}

function listSessions() {
  return db
    .prepare(`
      SELECT id, user_id, NULL AS user_agent, expires_at, revoked, created_at
      FROM identity_sessions
      ORDER BY id DESC
      LIMIT 200
    `)
    .all();
}

function mapPublicUser(user) {
  return {
    id: user.id,
    email: null,
    phone: null,
    firstName: user.first_name || user.firstName || "",
    lastName: user.last_name || user.lastName || "",
    name: user.name,
    role: user.role,
    status: user.status || "active",
    emailVerified: false,
    twofaEnabled: Boolean(user.twofa_enabled),
    createdAt: user.created_at,
  };
}

function getIdentitySecurityStatus() {
  const overview = getSecurityOverview();
  return {
    version: "2.0.0",
    enabled: isEnabled(),
    accessTokenMinutes: accessMinutes,
    refreshTokenDays: refreshDays,
    totals: {
      users: overview.users,
      verified: overview.verified,
      activeSessions: overview.activeSessions,
      failedLogins24h: overview.failedLogins24h,
      privacyRequests: overview.privacyRequests,
      auditEvents: db.prepare("SELECT COUNT(*) n FROM identity_security_audit").get().n,
      addresses: db.prepare("SELECT COUNT(*) n FROM identity_addresses").get().n,
    },
  };
}

module.exports = {
  isEnabled,
  registerUser,
  verifyEmail,
  loginUser,
  refreshAccessToken,
  logoutUser,
  getAccount,
  updateAccount,
  listAddresses,
  createAddress,
  deleteAddress,
  requestPasswordReset,
  completePasswordReset,
  setupTwoFactor,
  disableTwoFactor,
  createPrivacyRequest,
  listPrivacyRequests,
  getSecurityOverview,
  listSecurityAudit,
  listSessions,
  getIdentitySecurityStatus,
};
