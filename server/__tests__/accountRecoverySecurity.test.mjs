import { createHash, randomBytes } from "node:crypto";
import { existsSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { startIsolatedApi } from "./support/isolatedApi.mjs";

const require = createRequire(import.meta.url);
const Database = require("better-sqlite3");

/**
 * Password reset and e-mail verification tokens prove control of a mailbox
 * only when they are delivered to that mailbox. These tests run the real
 * server and check that no anonymous caller is handed one where it matters,
 * and that a back-office account can never be reset through self-service.
 */

const ADMIN_EMAIL = "owner@unit.buzzard.test";
const adminPassword = `Unit-${randomBytes(12).toString("base64url")}-7q`;
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const TOKEN_KEYS = /token|secret|code|link/i;

function tokenKeys(body) {
  return Object.keys(body || {}).filter((key) => TOKEN_KEYS.test(key));
}

function db(api) {
  return new Database(path.join(api.root, "catalog.sqlite"));
}

/** The administrator kept in the database signs in here; the token is accepted on back-office routes. */
async function databaseLogin(api, password = adminPassword) {
  return api.request("POST", "/api/auth/login", { body: { email: ADMIN_EMAIL, password } });
}

async function identityRegister(api, email, password) {
  return api.request("POST", "/api/identity-security/auth/register", { body: { email, password } });
}

async function customerRegister(api, email, password) {
  return api.request("POST", "/api/account/register", {
    body: { email, password, passwordConfirm: password, firstName: "Syn", lastName: "Thetic", acceptTerms: true, acceptPrivacy: true },
  });
}

function startProduction() {
  return startIsolatedApi({
    seed: false,
    env: {
      NODE_ENV: "production",
      JWT_SECRET: randomBytes(32).toString("base64"),
      ADMIN_EMAIL,
      ADMIN_PASSWORD: adminPassword,
      BUZZARD_TEST_MODE: undefined,
      BUZZARD_RATE_LIMIT_DISABLED: undefined,
      BUZZARD_E2E_DB: undefined,
      BUZZARD_TRUSTED_PROXY_HOPS: "0",
    },
  });
}

describe("production", () => {
  let api;
  const customer = { email: `kunde-${randomBytes(4).toString("hex")}@synthetic.invalid`, password: `Kunde-${randomBytes(9).toString("base64url")}-1a` };

  beforeAll(async () => {
    api = await startProduction();
  }, 120_000);
  afterAll(async () => api?.stop());

  it("the administrator account exists in both sign-in paths, so the test is meaningful", async () => {
    const jsonLogin = await api.request("POST", "/api/admin/login", { body: { email: ADMIN_EMAIL, password: adminPassword } });
    expect(jsonLogin.status).toBe(200);
    const dbLogin = await databaseLogin(api);
    expect(dbLogin.status).toBe(200);
    expect(dbLogin.json.user.role).toBe("admin");
    const reach = await api.request("GET", "/api/admin/security/events", { token: dbLogin.json.token });
    expect(reach.status).toBe(200);
  });

  it("an anonymous reset request for the administrator returns no token and creates none", async () => {
    const res = await api.request("POST", "/api/identity-security/auth/password-reset-request", { body: { email: ADMIN_EMAIL } });
    expect(res.status).toBe(200);
    expect(res.json).toEqual({ ok: true });
    const handle = db(api);
    const tokens = handle.prepare("SELECT COUNT(*) n FROM identity_verification_tokens WHERE token_type = 'password_reset'").get().n;
    handle.close();
    expect(tokens).toBe(0);
    const event = api.readStore("security-log.json").find((entry) => entry.type === "password_reset_refused");
    expect(event).toMatchObject({ success: false, severity: "HIGH", role: "admin", detail: { reason: "back_office_account" } });
    expect(JSON.stringify(event)).not.toContain(ADMIN_EMAIL);
  });

  it("the answer is the same for the administrator, a customer and an address nobody has", async () => {
    await identityRegister(api, customer.email, customer.password);
    const answers = [];
    for (const email of [ADMIN_EMAIL, customer.email, "nobody@synthetic.invalid", "", "not-an-address"]) {
      const res = await api.request("POST", "/api/identity-security/auth/password-reset-request", { body: { email } });
      answers.push(`${res.status} ${res.text}`);
    }
    expect(new Set(answers).size, answers.join(" | ")).toBe(1);
  });

  it("registration does not hand out the e-mail verification token", async () => {
    const res = await identityRegister(api, `neu-${randomBytes(4).toString("hex")}@synthetic.invalid`, `Neu-${randomBytes(9).toString("base64url")}-1a`);
    expect(res.status).toBe(201);
    expect(tokenKeys(res.json)).toEqual([]);
    expect(Object.keys(res.json).sort()).toEqual(["ok", "userId"]);
  });

  it("the customer account store answers alike for known and unknown addresses and creates no token", async () => {
    const register = await customerRegister(api, customer.email, customer.password);
    expect(register.json?.success, register.text.slice(0, 200)).toBe(true);
    const known = await api.request("POST", "/api/account/password-reset/request", { body: { email: customer.email } });
    const unknown = await api.request("POST", "/api/account/password-reset/request", { body: { email: "nobody@synthetic.invalid" } });
    expect(known.status).toBe(200);
    expect(known.text).toBe(unknown.text);
    expect(tokenKeys(known.json)).toEqual([]);
    expect(existsSync(path.join(api.dataDir, "password-reset-tokens.json"))).toBe(false);
  });

  it("a guessed or made-up token resets nothing", async () => {
    const next = `Taken-${randomBytes(9).toString("base64url")}-1a`;
    for (const token of ["", "a", "0".repeat(64), randomBytes(32).toString("hex"), "undefined", "null"]) {
      const identity = await api.request("POST", "/api/identity-security/auth/password-reset", { body: { token, password: next } });
      expect(identity.status, `identity ${token.slice(0, 8)}`).toBe(400);
      const account = await api.request("POST", "/api/account/password-reset/confirm", { body: { token, password: next, passwordConfirm: next } });
      expect(account.status, `account ${token.slice(0, 8)}`).toBe(400);
    }
    for (const token of [null, 1, {}, [], true]) {
      const identity = await api.request("POST", "/api/identity-security/auth/password-reset", { body: { token, password: next } });
      expect(identity.status).toBe(400);
      const account = await api.request("POST", "/api/account/password-reset/confirm", { body: { token, password: next, passwordConfirm: next } });
      expect(account.status).toBe(400);
    }
    expect((await databaseLogin(api)).status).toBe(200);
    expect((await databaseLogin(api, next)).status).toBe(401);
    expect(api.alive()).toBe(true);
  });

  it("a reset token that exists for a back-office account is refused and used up", async () => {
    const raw = randomBytes(32).toString("hex");
    const handle = db(api);
    const admin = handle.prepare("SELECT id FROM users WHERE email = ?").get(ADMIN_EMAIL);
    handle
      .prepare("INSERT INTO identity_verification_tokens(user_id, token_hash, token_type, expires_at) VALUES(?,?,?,datetime('now','+1 hour'))")
      .run(admin.id, sha256(raw), "password_reset");
    handle.close();

    const next = `Taken-${randomBytes(9).toString("base64url")}-1a`;
    const res = await api.request("POST", "/api/identity-security/auth/password-reset", { body: { token: raw, password: next } });
    expect(res.status).toBe(400);
    const again = await api.request("POST", "/api/identity-security/auth/password-reset", { body: { token: raw, password: next } });
    expect(again.status).toBe(400);

    const check = db(api);
    const row = check.prepare("SELECT used FROM identity_verification_tokens WHERE token_hash = ?").get(sha256(raw));
    check.close();
    expect(row.used).toBe(1);
    expect((await databaseLogin(api, next)).status).toBe(401);
    const withNew = await api.request("POST", "/api/identity-security/auth/login", { body: { email: ADMIN_EMAIL, password: next } });
    expect(withNew.status).toBe(401);
    const withOld = await databaseLogin(api);
    expect(withOld.status).toBe(200);
    const refusals = api.readStore("security-log.json").filter((entry) => entry.type === "password_reset_refused");
    expect(refusals.some((entry) => entry.detail?.reason === "back_office_account_token")).toBe(true);
  });

  it("nothing in the output or the logs contains a password", () => {
    const text = api.output() + JSON.stringify(api.readStore("security-log.json")) + JSON.stringify(api.readStore("audit-log.json"));
    for (const secret of [adminPassword, customer.password]) expect(text).not.toContain(secret);
  });
});

// Its own instance: the limiter for anonymous writes (60 a minute per address) is on in production.
describe("production: sign-in on the identity route", () => {
  let api;
  const customer = { email: `kunde-${randomBytes(4).toString("hex")}@synthetic.invalid`, password: `Kunde-${randomBytes(9).toString("base64url")}-1a` };

  beforeAll(async () => {
    api = await startProduction();
    expect((await identityRegister(api, customer.email, customer.password)).status).toBe(201);
  }, 120_000);
  afterAll(async () => api?.stop());

  it("locks after repeated failures, also for the right password", async () => {
    const email = `gesperrt-${randomBytes(4).toString("hex")}@synthetic.invalid`;
    const password = `Sperre-${randomBytes(9).toString("base64url")}-1a`;
    expect((await identityRegister(api, email, password)).status).toBe(201);
    const statuses = [];
    for (let attempt = 0; attempt < 7; attempt += 1) {
      const res = await api.request("POST", "/api/identity-security/auth/login", { body: { email, password: `wrong-${attempt}-value` } });
      statuses.push(res.status);
    }
    expect(statuses.slice(0, 5)).toEqual([401, 401, 401, 401, 401]);
    expect(statuses.slice(5)).toEqual([423, 423]);
    const right = await api.request("POST", "/api/identity-security/auth/login", { body: { email, password } });
    expect(right.status).toBe(423);
    expect(right.json.retryAfterSec).toBeGreaterThan(0);
    expect(tokenKeys(right.json)).toEqual([]);
    const events = api.readStore("security-log.json").filter((entry) => entry.path === "/api/identity-security/auth/login");
    expect(events.filter((entry) => entry.type === "auth_login_failed").length).toBeGreaterThanOrEqual(5);
    expect(JSON.stringify(events)).not.toContain(email);
  });

  it("repeated guesses against one address are stopped without locking anyone else out", async () => {
    const statuses = [];
    for (let attempt = 0; attempt < 12; attempt += 1) {
      const res = await api.request("POST", "/api/identity-security/auth/login", { body: { email: "spray@synthetic.invalid", password: `wrong-${attempt}-value` } });
      statuses.push(res.status);
    }
    expect(statuses.filter((status) => status === 200)).toEqual([]);
    expect(statuses.slice(5).every((status) => status === 423 || status === 429)).toBe(true);
    // Another account, same caller: not affected by the failures above.
    const other = await api.request("POST", "/api/identity-security/auth/login", { body: { email: customer.email, password: customer.password } });
    expect(other.status).toBe(200);
  });
});

describe("development and test stacks", () => {
  let api;
  const customer = { email: `kunde-${randomBytes(4).toString("hex")}@synthetic.invalid`, password: `Kunde-${randomBytes(9).toString("base64url")}-1a` };

  beforeAll(async () => {
    api = await startIsolatedApi({ env: { BUZZARD_TEST_MODE: "1", ADMIN_EMAIL, ADMIN_PASSWORD: adminPassword } });
  }, 120_000);
  afterAll(async () => api?.stop());

  it("a back-office account gets no reset token here either", async () => {
    const login = await databaseLogin(api);
    expect(login.status).toBe(200);
    expect(login.json.user.role).toBe("admin");
    const res = await api.request("POST", "/api/identity-security/auth/password-reset-request", { body: { email: ADMIN_EMAIL } });
    expect(res.json).toEqual({ ok: true });
    const handle = db(api);
    const tokens = handle.prepare("SELECT COUNT(*) n FROM identity_verification_tokens WHERE token_type = 'password_reset'").get().n;
    handle.close();
    expect(tokens).toBe(0);
  });

  it("a customer reset works once, ends the old sessions and the old password", async () => {
    expect((await identityRegister(api, customer.email, customer.password)).status).toBe(201);
    const before = await api.request("POST", "/api/identity-security/auth/login", { body: { email: customer.email, password: customer.password } });
    expect(before.status).toBe(200);
    const request = await api.request("POST", "/api/identity-security/auth/password-reset-request", { body: { email: customer.email } });
    const token = request.json.resetTokenForDevelopment;
    expect(token).toMatch(/^[0-9a-f]{64}$/);

    const next = `Neu-${randomBytes(9).toString("base64url")}-1a`;
    const reset = await api.request("POST", "/api/identity-security/auth/password-reset", { body: { token, password: next } });
    expect(reset.status).toBe(200);
    const replay = await api.request("POST", "/api/identity-security/auth/password-reset", { body: { token, password: `${next}x` } });
    expect(replay.status).toBe(400);
    const refresh = await api.request("POST", "/api/identity-security/auth/refresh", { body: { refreshToken: before.json.refreshToken } });
    expect(refresh.status).toBe(401);
    expect((await api.request("POST", "/api/identity-security/auth/login", { body: { email: customer.email, password: customer.password } })).status).toBe(401);
    const after = await api.request("POST", "/api/identity-security/auth/login", { body: { email: customer.email, password: next } });
    expect(after.status).toBe(200);
    expect(after.json.user.role).toBe("customer");
    // A customer token opens no back-office route.
    for (const route of ["/api/admin/users", "/api/admin/security/events", "/api/admin/orders"]) {
      expect((await api.request("GET", route, { token: after.json.accessToken })).status, route).toBe(401);
    }

    const handle = db(api);
    const rows = handle.prepare("SELECT token_hash FROM identity_verification_tokens").all();
    handle.close();
    expect(rows.some((row) => row.token_hash === sha256(token))).toBe(true);
    expect(rows.some((row) => row.token_hash === token)).toBe(false);
  });

  it("tokens of the wrong type are refused, not crashed on", async () => {
    for (const value of [null, 1, true, {}, [], { $ne: null }, "x".repeat(5000)]) {
      const verify = await api.request("POST", "/api/identity-security/auth/verify-email", { body: { token: value } });
      const refresh = await api.request("POST", "/api/identity-security/auth/refresh", { body: { refreshToken: value } });
      const reset = await api.request("POST", "/api/identity-security/auth/password-reset", { body: { token: value, password: "Long-Enough-Value-1" } });
      expect(verify.status, `verify ${JSON.stringify(value).slice(0, 20)}`).toBe(400);
      expect(refresh.status, `refresh ${JSON.stringify(value).slice(0, 20)}`).toBe(401);
      expect(reset.status, `reset ${JSON.stringify(value).slice(0, 20)}`).toBe(400);
    }
    expect(api.alive()).toBe(true);
    expect(api.output()).not.toMatch(/TypeError|ERR_INVALID_ARG_TYPE/);
  });

  it("the customer account store keeps only hashes of reset and session tokens, in private files", async () => {
    const register = await customerRegister(api, customer.email, customer.password);
    expect(register.json?.success, register.text.slice(0, 200)).toBe(true);
    const login = await api.request("POST", "/api/account/login", { body: { email: customer.email, password: customer.password } });
    expect(login.status).toBe(200);
    const session = login.json.token;
    expect((await api.request("GET", "/api/account/me", { token: session })).status).toBe(200);

    const request = await api.request("POST", "/api/account/password-reset/request", { body: { email: customer.email } });
    const token = request.json.resetToken;
    expect(token).toMatch(/^[0-9a-f]{64}$/);

    for (const name of ["password-reset-tokens.json", "customer-sessions.json"]) {
      const file = path.join(api.dataDir, name);
      const content = readFileSync(file, "utf8");
      expect(content.includes(token), name).toBe(false);
      expect(content.includes(session), name).toBe(false);
      expect(statSync(file).mode & 0o077, name).toBe(0);
      expect(existsSync(`${file}.bak`), name).toBe(false);
    }
    expect(readFileSync(path.join(api.dataDir, "password-reset-tokens.json"), "utf8")).toContain(sha256(token));
    expect(readFileSync(path.join(api.dataDir, "customer-sessions.json"), "utf8")).toContain(sha256(session));

    const next = `Neu-${randomBytes(9).toString("base64url")}-1a`;
    const confirm = await api.request("POST", "/api/account/password-reset/confirm", { body: { token, password: next, passwordConfirm: next } });
    expect(confirm.status).toBe(200);
    const replay = await api.request("POST", "/api/account/password-reset/confirm", { body: { token, password: next, passwordConfirm: next } });
    expect(replay.status).toBe(400);
    // The session opened with the old password is over.
    expect((await api.request("GET", "/api/account/me", { token: session })).status).toBe(401);
    expect((await api.request("POST", "/api/account/login", { body: { email: customer.email, password: customer.password } })).status).toBe(401);
    expect((await api.request("POST", "/api/account/login", { body: { email: customer.email, password: next } })).status).toBe(200);

    const entry = api.readStore("audit-log.json").find((candidate) => candidate.action === "password_reset_complete");
    expect(entry).toMatchObject({ entityType: "customer", field: "password", oldValue: null, newValue: null, userEmail: null });
    const logs = JSON.stringify(api.readStore("audit-log.json")) + JSON.stringify(api.readStore("security-log.json")) + api.output();
    for (const value of [token, session, next, customer.password, customer.email]) expect(logs).not.toContain(value);
  });
});

describe("customer sessions written by an earlier version", () => {
  it("stay valid and are re-keyed so the file no longer holds a usable token", async () => {
    const legacyToken = randomBytes(32).toString("hex");
    const expired = randomBytes(32).toString("hex");
    const api = await startIsolatedApi({
      env: { BUZZARD_TEST_MODE: "1" },
      prepare: (dataDir) => {
        writeFileSync(
          path.join(dataDir, "customer-sessions.json"),
          JSON.stringify([
            { token: legacyToken, session: { customerId: "cus-synthetic-legacy", email: "legacy@synthetic.invalid", firstName: "Syn", lastName: "Thetic", expiresAt: Date.now() + 3_600_000 } },
            { token: expired, session: { customerId: "cus-synthetic-old", email: "old@synthetic.invalid", expiresAt: Date.now() - 1000 } },
          ])
        );
      },
    });
    try {
      const file = path.join(api.dataDir, "customer-sessions.json");
      const content = readFileSync(file, "utf8");
      expect(content).not.toContain(legacyToken);
      expect(content).not.toContain(expired);
      expect(content).toContain(sha256(legacyToken));
      expect(existsSync(`${file}.bak`)).toBe(false);
      const stored = JSON.parse(content);
      expect(stored).toHaveLength(1);
      // The session itself still works for its holder; the customer record does not exist here, so the route says so.
      const me = await api.request("GET", "/api/account/me", { token: legacyToken });
      expect([200, 404]).toContain(me.status);
      const other = await api.request("GET", "/api/account/me", { token: expired });
      expect(other.status).toBe(401);
      // The hash from the file is not a session.
      const fromFile = await api.request("GET", "/api/account/me", { token: stored[0].tokenHash });
      expect(fromFile.status).toBe(401);
    } finally {
      await api.stop();
    }
  }, 120_000);
});
