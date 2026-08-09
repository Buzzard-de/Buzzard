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
  return jwt.sign({ sub: user.id, email: user.email, role: user.role }, secret, {
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
        [body.firstName, body.lastName].filter(Boolean).join(" ").trim() || email,
        body.firstName || "",
        body.lastName || "",
        "customer",
        0,
        "active"
      );

    const raw = crypto.randomBytes(32).toString("hex");
    db.prepare(`
      INSERT INTO identity_verification_tokens(user_id, token_hash, token_type, expires_at)
      VALUES(?,?,?,datetime('now','+24 hours'))
    `).run(result.lastInsertRowid, sha256(raw), "email_verification");

    audit(result.lastInsertRowid, "register", req);
    return { userId: result.lastInsertRowid, verificationTokenForDevelopment: raw };
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

  db.prepare("UPDATE users SET email_verified = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(row.user_id);
  db.prepare("UPDATE identity_verification_tokens SET used = 1 WHERE id = ?").run(row.id);
  audit(row.user_id, "email_verified", req);
  return { ok: true };
}

function loginUser(body = {}, req) {
  const email = String(body.email || "")
    .toLowerCase()
    .trim();
  const user = db.prepare("SELECT * FROM users WHERE email = ?").get(email);
  const ok = user && (user.status || "active") === "active" && verifyPassword(user.password_hash, body.password);

  db.prepare("INSERT INTO identity_login_attempts(email, success, ip_hash) VALUES(?,?,?)").run(
    email,
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
    req.headers["user-agent"] || "",
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
      { sub: session.user_id, email: session.email, role: session.role },
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

function getAccount(userId) {
  const user = db
    .prepare(`
      SELECT id, email, first_name, last_name, name, role, status, email_verified, twofa_enabled, created_at
      FROM users WHERE id = ?
    `)
    .get(userId);
  if (!user) return { error: "User not found", status: 404 };
  return { account: mapPublicUser(user) };
}

function updateAccount(userId, body = {}, req) {
  const firstName = body.firstName || "";
  const lastName = body.lastName || "";
  const name = [firstName, lastName].filter(Boolean).join(" ").trim();
  db.prepare(`
    UPDATE users
    SET first_name = ?, last_name = ?, name = CASE WHEN ? <> '' THEN ? ELSE name END, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(firstName, lastName, name, name, userId);
  audit(userId, "profile_updated", req);
  return { ok: true };
}

function listAddresses(userId) {
  return db
    .prepare("SELECT * FROM identity_addresses WHERE user_id = ? ORDER BY is_default DESC, id DESC")
    .all(userId);
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
  return { address: db.prepare("SELECT * FROM identity_addresses WHERE id = ?").get(result.lastInsertRowid) };
}

function deleteAddress(userId, addressId) {
  db.prepare("DELETE FROM identity_addresses WHERE id = ? AND user_id = ?").run(addressId, userId);
  return { ok: true };
}

function requestPasswordReset(body = {}, req) {
  const email = String(body.email || "")
    .toLowerCase()
    .trim();
  const user = db.prepare("SELECT id FROM users WHERE email = ?").get(email);
  if (user) {
    const raw = crypto.randomBytes(32).toString("hex");
    db.prepare(`
      INSERT INTO identity_verification_tokens(user_id, token_hash, token_type, expires_at)
      VALUES(?,?,?,datetime('now','+1 hour'))
    `).run(user.id, sha256(raw), "password_reset");
    audit(user.id, "password_reset_requested", req);
    return { ok: true, resetTokenForDevelopment: raw };
  }
  return { ok: true };
}

function completePasswordReset(body = {}, req) {
  const password = String(body.password || "");
  if (password.length < 10) return { error: "Password must be at least 10 characters", status: 400 };

  const token = db
    .prepare(`
      SELECT * FROM identity_verification_tokens
      WHERE token_hash = ? AND token_type = 'password_reset' AND used = 0 AND expires_at > datetime('now')
    `)
    .get(sha256(body.token || ""));
  if (!token) return { error: "Invalid or expired reset token", status: 400 };

  db.prepare("UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(
    hashPassword(password),
    token.user_id
  );
  db.prepare("UPDATE identity_verification_tokens SET used = 1 WHERE id = ?").run(token.id);
  db.prepare("UPDATE identity_sessions SET revoked = 1 WHERE user_id = ?").run(token.user_id);
  audit(token.user_id, "password_reset_completed", req);
  return { ok: true };
}

function setupTwoFactor(userId, req) {
  const secretValue = crypto.randomBytes(20).toString("hex");
  db.prepare("UPDATE users SET twofa_secret = ?, twofa_enabled = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(
    secretValue,
    userId
  );
  audit(userId, "2fa_setup_started", req);
  return {
    ok: true,
    secretForDevelopment: secretValue,
    productionNote: "Connect a TOTP library and QR provisioning before enabling 2FA.",
  };
}

function disableTwoFactor(userId, req) {
  db.prepare(`
    UPDATE users SET twofa_secret = '', twofa_enabled = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?
  `).run(userId);
  audit(userId, "2fa_disabled", req);
  return { ok: true };
}

function createPrivacyRequest(userId, body = {}, req) {
  const type = body.type;
  if (!["export", "delete"].includes(type)) {
    return { error: "Request type must be export or delete", status: 400 };
  }
  const result = db
    .prepare("INSERT INTO identity_privacy_requests(user_id, request_type) VALUES(?,?)")
    .run(userId, type);
  audit(userId, "privacy_request", req, { type });
  return { request: db.prepare("SELECT * FROM identity_privacy_requests WHERE id = ?").get(result.lastInsertRowid) };
}

function listPrivacyRequests(userId) {
  return db
    .prepare("SELECT * FROM identity_privacy_requests WHERE user_id = ? ORDER BY id DESC")
    .all(userId);
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
  return db.prepare("SELECT * FROM identity_security_audit ORDER BY id DESC LIMIT 200").all();
}

function listSessions() {
  return db
    .prepare(`
      SELECT id, user_id, user_agent, expires_at, revoked, created_at
      FROM identity_sessions
      ORDER BY id DESC
      LIMIT 200
    `)
    .all();
}

function mapPublicUser(user) {
  return {
    id: user.id,
    email: user.email,
    firstName: user.first_name || "",
    lastName: user.last_name || "",
    name: user.name,
    role: user.role,
    status: user.status || "active",
    emailVerified: Boolean(user.email_verified),
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
