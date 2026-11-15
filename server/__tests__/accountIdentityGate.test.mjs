import { describe, expect, it } from "vitest";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const jwt = require("jsonwebtoken");
const identity = require("../lib/identitySecurity.js");
const auth = require("../lib/customerAuth.js");
const { signUser } = require("../lib/dbAuth.js");
const { listActiveSessions } = require("../lib/auth.js");
const { db } = require("../lib/db");

const secret = `account-secret-${Date.now()}@example.test`;

describe("account responses do not carry contact data or reset authority", () => {
  it("strips email from account, login, and token payloads and refuses stored reset tokens", async () => {
    const user = db.prepare("INSERT INTO users(email, password_hash, role, name, first_name) VALUES(?,?,?,?,?)").run(
      secret,
      "stored-hash",
      "customer",
      "Account",
      "Ada"
    ).lastInsertRowid;
    const other = db.prepare("INSERT INTO users(email, password_hash, role, name) VALUES(?,?,?,?)").run(
      `other-${Date.now()}@example.test`,
      "stored-hash",
      "customer",
      "Other"
    ).lastInsertRowid;

    const own = identity.getAccount(user, user);
    const foreign = identity.getAccount(user, other);
    expect(own.account.email).toBeNull();
    expect(own.account.phone).toBeNull();
    expect(own.account.emailVerified).toBe(false);
    expect(own.account.firstName).toBe("Ada");
    expect(JSON.stringify(own)).not.toContain(secret);
    expect(foreign.account).toBeNull();
    expect(foreign.email).toBeNull();

    const shown = auth.publicUser({ id: user, email: secret, phone: "+49123", firstName: "Ada", emailVerified: true });
    expect(shown.email).toBeNull();
    expect(shown.phone).toBeNull();
    expect(shown.emailVerified).toBe(false);
    expect(JSON.stringify(shown)).not.toContain(secret);

    const access = identity.loginUser(
      { email: secret, password: "not-the-password" },
      { headers: {}, socket: { remoteAddress: "127.0.0.1" } }
    );
    expect(access.error).toBeTruthy();
    expect(JSON.stringify(access)).not.toContain(secret);
    expect(db.prepare("SELECT email FROM identity_login_attempts ORDER BY id DESC LIMIT 1").get().email).toBe("");

    const signed = signUser({ id: user, email: secret, role: "customer" });
    const claims = jwt.decode(signed);
    expect(claims.sub).toBe(user);
    expect(claims.email).toBeUndefined();
    expect(signed).not.toContain(secret);

    const raw = `reset-${Date.now()}`;
    db.prepare(
      "INSERT INTO identity_verification_tokens(user_id, token_hash, token_type, expires_at, used) VALUES(?,?,?,datetime('now','+1 hour'),0)"
    ).run(user, require("crypto").createHash("sha256").update(raw).digest("hex"), "password_reset");
    const before = db.prepare("SELECT password_hash FROM users WHERE id = ?").get(user).password_hash;
    const reset = identity.completePasswordReset({ token: raw, password: "replacement-password" });
    const again = identity.completePasswordReset({ token: raw, password: "replacement-password" });
    const [left, right] = await Promise.all([
      Promise.resolve().then(() => identity.completePasswordReset({ token: `${raw}-pair`, password: "replacement-password" })),
      Promise.resolve().then(() => identity.completePasswordReset({ token: `${raw}-pair`, password: "replacement-password" })),
    ]);
    expect(reset.ok).toBe(false);
    expect(reset.passwordChanged).toBe(false);
    expect(reset.code).toBe("RESET_NOT_AUTHORIZED");
    expect(again.duplicate).toBe(true);
    expect(again.passwordChanged).toBe(false);
    expect(left.passwordChanged).toBe(false);
    expect(right.passwordChanged).toBe(false);
    expect(JSON.stringify(reset)).not.toContain(raw);
    expect(db.prepare("SELECT password_hash FROM users WHERE id = ?").get(user).password_hash).toBe(before);
    expect(identity.completePasswordReset({ token: "", password: "replacement-password" }).passwordChanged).toBe(false);
    expect(auth.createResetToken(user, {}).token).toBeNull();
    expect(auth.consumeResetToken(raw)).toBeNull();
    expect(identity.setupTwoFactor(user, {}).secret).toBeNull();
    db.prepare("UPDATE users SET twofa_secret = ?, twofa_enabled = 1 WHERE id = ?").run("stored-secret", user);
    const turnedOff = identity.disableTwoFactor(user, { headers: {}, socket: {} });
    expect(turnedOff.ok).toBe(false);
    expect(turnedOff.disabled).toBe(false);
    expect(turnedOff.secret).toBeNull();
    expect(JSON.stringify(turnedOff)).not.toContain(secret);
    expect(db.prepare("SELECT twofa_secret, twofa_enabled FROM users WHERE id = ?").get(user)).toEqual({
      twofa_secret: "stored-secret",
      twofa_enabled: 1,
    });

    const req = { headers: {}, socket: {} };
    const recorded = identity.createPrivacyRequest(user, { type: "export", street: "Secret Street", email: secret }, req);
    const repeated = identity.createPrivacyRequest(user, { type: "export" }, req);
    const [firstDelete, secondDelete] = await Promise.all([
      Promise.resolve().then(() => identity.createPrivacyRequest(user, { type: "delete" }, req)),
      Promise.resolve().then(() => identity.createPrivacyRequest(user, { type: "delete" }, req)),
    ]);
    expect(recorded.recorded).toBe(true);
    expect(recorded.exportCompleted).toBe(false);
    expect(recorded.deleteCompleted).toBe(false);
    expect(recorded.fulfilled).toBe(false);
    expect(recorded.request.status).toBe("requested");
    expect(repeated.duplicate).toBe(true);
    expect(repeated.exportCompleted).toBe(false);
    expect([firstDelete.duplicate, secondDelete.duplicate].filter(Boolean)).toHaveLength(1);
    expect(firstDelete.exportCompleted).toBe(false);
    expect(secondDelete.deleteCompleted).toBe(false);
    expect(JSON.stringify(recorded)).not.toContain(secret);
    expect(JSON.stringify(recorded)).not.toContain("Secret Street");
    const ownRequests = identity.listPrivacyRequests(user);
    const otherRequests = identity.listPrivacyRequests(other);
    expect(ownRequests.every((row) => row.userId === user && row.fulfilled === false && row.email === null)).toBe(true);
    expect(otherRequests.some((row) => row.userId === user)).toBe(false);
    expect(identity.createPrivacyRequest(other, { type: "export", userId: user }, req).error).toBe("PRIVACY_NOT_AUTHORIZED");
    expect(identity.createPrivacyRequest(user, { type: "export", userId: other }, req).recorded).toBe(false);
    for (const row of listActiveSessions()) {
      expect(row.email).toBeNull();
      expect(row.tokenPreview).toBeNull();
      expect(JSON.stringify(row)).not.toContain(secret);
    }
  });
});
