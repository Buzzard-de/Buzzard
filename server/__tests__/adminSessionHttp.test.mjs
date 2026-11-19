import crypto from "node:crypto";
import { createRequire } from "node:module";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { startIsolatedApi } from "./support/isolatedApi.mjs";

const require = createRequire(import.meta.url);
const jwt = require("jsonwebtoken");

const jwtSecret = crypto.randomBytes(32).toString("hex");
const dbAdmin = { email: "db-admin@unit.buzzard.test", password: `Db-${crypto.randomBytes(12).toString("base64url")}-4k` };

let api;

beforeAll(async () => {
  api = await startIsolatedApi({
    env: { JWT_SECRET: jwtSecret, ADMIN_EMAIL: dbAdmin.email, ADMIN_PASSWORD: dbAdmin.password, BUZZARD_TEST_MODE: "1" },
  });
}, 60_000);

afterAll(async () => {
  await api?.stop();
});

async function login(role) {
  const account = api.accounts[role];
  const res = await api.request("POST", "/api/admin/login", { body: { email: account.email, password: account.password } });
  expect(res.status, `login ${role}`).toBe(200);
  return res.json.token;
}

const me = (token) => api.request("GET", "/api/admin/me", { token });

describe("bearer handling", () => {
  it("answers 401 without a token and for every malformed Authorization header", async () => {
    const token = await login("administrator");
    expect((await me(undefined)).status).toBe(401);
    const variants = [
      token,
      `bearer ${token}`,
      `Basic ${Buffer.from(`${api.accounts.administrator.email}:x`).toString("base64")}`,
      `Bearer`,
      `Bearer `,
      `Bearer ${token.slice(0, 63)}`,
      `Bearer ${token}0`,
      `Bearer ${token.toUpperCase()}`,
      `Bearer ${"0".repeat(64)}`,
      `Bearer null`,
      `Bearer undefined`,
      `Bearer ${token} ${token}`,
      `Token ${token}`,
    ];
    for (const authorization of variants) {
      const res = await api.request("GET", "/api/admin/me", { headers: { Authorization: authorization } });
      expect(res.status, authorization.slice(0, 12)).toBe(401);
      expect(res.json.errorKey).toBe("admin.auth.required");
    }
    expect((await me(token)).status).toBe(200);
  });

  it("does not read a session from the query string, a cookie or the body", async () => {
    const token = await login("administrator");
    expect((await api.request("GET", `/api/admin/me?token=${token}&access_token=${token}`)).status).toBe(401);
    expect((await api.request("GET", "/api/admin/me", { headers: { Cookie: `buzzard_admin_token=${token}; token=${token}` } })).status).toBe(401);
    const sessionId = (await api.request("GET", "/api/admin/sessions", { token })).json.sessions.find((entry) => entry.current).sessionId;
    expect((await api.request("DELETE", `/api/admin/sessions/${sessionId}`, { body: { token } })).status).toBe(401);
    expect((await me(token)).status).toBe(200);
  });

  it("marks authenticated answers as not cacheable", async () => {
    const token = await login("read_only");
    const res = await me(token);
    expect(res.headers.get("cache-control")).toBe("no-store");
    const loginRes = await api.request("POST", "/api/admin/login", {
      body: { email: api.accounts.read_only.email, password: api.accounts.read_only.password },
    });
    expect(loginRes.headers.get("cache-control")).toBe("no-store");
    expect(loginRes.headers.get("set-cookie")).toBeNull();
  });
});

describe("lifecycle over HTTP", () => {
  it("logout ends the session and may be repeated or sent without a token", async () => {
    const token = await login("catalog_manager");
    const other = await login("catalog_manager");
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const res = await api.request("POST", "/api/admin/logout", { token });
      expect(res.status).toBe(200);
      expect(res.json).toEqual({ success: true });
    }
    expect((await api.request("POST", "/api/admin/logout")).json).toEqual({ success: true });
    expect((await me(token)).status).toBe(401);
    expect((await me(other)).status).toBe(200);
  });

  it("an administrator revokes another session by its id; the revoked session is refused everywhere", async () => {
    const admin = await login("administrator");
    const victim = await login("order_manager");
    const list = await api.request("GET", "/api/admin/sessions", { token: admin });
    expect(list.status).toBe(200);
    const row = list.json.sessions.find((entry) => entry.userId === api.accounts.order_manager.id);
    expect(row.sessionId).toMatch(/^sess-[0-9a-f]{16}$/);
    expect(list.json.sessions.filter((entry) => entry.current)).toHaveLength(1);
    expect(list.text).not.toContain(admin);
    expect(list.text).not.toContain(victim);
    expect(list.text).not.toMatch(/tokenHash|tokenPreview|password/);

    expect((await api.request("DELETE", `/api/admin/sessions/${row.sessionId}`)).status).toBe(401);
    expect((await me(victim)).status).toBe(200);
    const revoke = await api.request("DELETE", `/api/admin/sessions/${row.sessionId}`, { token: admin });
    expect(revoke.status).toBe(200);
    for (const route of ["/api/admin/me", "/api/admin/orders", "/api/admin/sessions"]) {
      expect((await api.request("GET", route, { token: victim })).status, route).toBe(401);
    }
    const again = await api.request("DELETE", `/api/admin/sessions/${row.sessionId}`, { token: admin });
    expect(again.status).toBe(404);
    for (const candidate of [victim, victim.slice(0, 16), "sess-0000000000000000"]) {
      expect((await api.request("DELETE", `/api/admin/sessions/${candidate}`, { token: admin })).status).toBe(404);
    }
  });

  it("a non-administrator sees and revokes only its own sessions", async () => {
    const admin = await login("administrator");
    const own = await login("read_only");
    const list = await api.request("GET", "/api/admin/sessions", { token: own });
    expect(list.status).toBe(200);
    expect(new Set(list.json.sessions.map((entry) => entry.userId))).toEqual(new Set([api.accounts.read_only.id]));

    const all = await api.request("GET", "/api/admin/sessions", { token: admin });
    const foreign = all.json.sessions.find((entry) => entry.userId === api.accounts.administrator.id);
    const res = await api.request("DELETE", `/api/admin/sessions/${foreign.sessionId}`, { token: own });
    expect(res.status).toBe(403);
    expect((await me(admin)).status).toBe(200);
  });

  it("a password change ends the old sessions, issues a new one and is not available anonymously", async () => {
    const account = api.accounts.staff;
    const next = `Next-${crypto.randomBytes(9).toString("base64url")}-8Z`;
    const first = await login("staff");
    const second = await login("staff");

    expect((await api.request("POST", "/api/admin/account/password", { body: { currentPassword: account.password, newPassword: next } })).status).toBe(401);
    const wrong = await api.request("POST", "/api/admin/account/password", { token: first, body: { currentPassword: "Wrong-Current-1", newPassword: next } });
    expect(wrong.status).toBe(401);
    const weak = await api.request("POST", "/api/admin/account/password", { token: first, body: { currentPassword: account.password, newPassword: "weak" } });
    expect(weak.status).toBe(400);

    const changed = await api.request("POST", "/api/admin/account/password", { token: first, body: { currentPassword: account.password, newPassword: next } });
    expect(changed.status).toBe(200);
    expect(changed.text).not.toContain(next);
    expect((await me(first)).status).toBe(401);
    expect((await me(second)).status).toBe(401);
    expect((await me(changed.json.token)).status).toBe(200);
    expect((await api.request("POST", "/api/admin/login", { body: { email: account.email, password: account.password } })).status).toBe(401);
    expect((await api.request("POST", "/api/admin/login", { body: { email: account.email, password: next } })).status).toBe(200);
    account.password = next;
  });

  it("a role change ends the affected sessions and the new role applies after the next login", async () => {
    const admin = await login("administrator");
    const target = await login("ai_agent");
    expect((await api.request("GET", "/api/admin/orders", { token: target })).status).toBe(403);

    const denied = await api.request("PATCH", `/api/admin/users/${api.accounts.ai_agent.id}/role`, { token: target, body: { role: "administrator" } });
    expect(denied.status).toBe(403);
    expect((await api.request("PATCH", `/api/admin/users/${api.accounts.ai_agent.id}/role`, { body: { role: "administrator" } })).status).toBe(401);

    const changed = await api.request("PATCH", `/api/admin/users/${api.accounts.ai_agent.id}/role`, { token: admin, body: { role: "order_manager" } });
    expect(changed.status).toBe(200);
    expect(changed.text).not.toMatch(/password_hash|scrypt:/);
    expect((await me(target)).status).toBe(401);
    const fresh = await login("ai_agent");
    expect((await me(fresh)).json.user.role).toBe("order_manager");
    expect((await api.request("GET", "/api/admin/orders", { token: fresh })).status).toBe(200);

    const users = await api.request("GET", "/api/admin/users", { token: admin });
    expect(users.status).toBe(200);
    expect(users.text).not.toMatch(/password_hash|scrypt:|"password"/);
    expect((await api.request("GET", "/api/admin/users", { token: fresh })).status).toBe(403);
    expect((await api.request("GET", "/api/admin/users")).status).toBe(401);
  });

  it("concurrent requests with one session and concurrent logins all succeed and leave a readable store", async () => {
    const token = await login("administrator");
    const reads = await Promise.all(Array.from({ length: 25 }, () => me(token)));
    expect(reads.every((res) => res.status === 200)).toBe(true);

    const account = api.accounts.admin;
    const logins = await Promise.all(
      Array.from({ length: 8 }, () => api.request("POST", "/api/admin/login", { body: { email: account.email, password: account.password } }))
    );
    expect(logins.map((res) => res.status)).toEqual(Array(8).fill(200));
    expect(new Set(logins.map((res) => res.json.token)).size).toBe(8);
    const checks = await Promise.all(logins.map((res) => me(res.json.token)));
    expect(checks.every((res) => res.status === 200)).toBe(true);

    const stored = api.readStore("admin-sessions.json");
    expect(Array.isArray(stored)).toBe(true);
    expect(stored.every((entry) => /^[0-9a-f]{64}$/.test(entry.tokenHash) && !("token" in entry))).toBe(true);
  });

  it("no token is written to any store or to the server output", async () => {
    const token = await login("administrator");
    await me(token);
    await api.request("POST", "/api/admin/logout", { token });
    for (const name of readdirSync(api.dataDir)) {
      const full = path.join(api.dataDir, name);
      expect(readFileSync(full, "utf8"), name).not.toContain(token);
    }
    expect(api.output()).not.toContain(token);
  });
});

describe("database administrator tokens (SQLite store mode)", () => {
  async function dbLogin() {
    const res = await api.request("POST", "/api/auth/login", { body: dbAdmin });
    expect(res.status).toBe(200);
    return res.json.token;
  }

  it("works on the back office and ends at logout, while a second token of the same account stays valid", async () => {
    const first = await dbLogin();
    const second = await dbLogin();
    expect((await me(first)).status).toBe(200);
    expect((await api.request("GET", "/api/admin/orders", { token: first })).status).toBe(200);

    expect((await api.request("POST", "/api/admin/logout", { token: first })).status).toBe(200);
    expect((await me(first)).status).toBe(401);
    expect((await api.request("GET", "/api/admin/orders", { token: first })).status).toBe(401);
    expect((await api.request("GET", "/api/me", { token: first })).status).toBe(401);
    expect((await me(second)).status).toBe(200);
    expect((await api.request("POST", "/api/admin/logout", { token: first })).json).toEqual({ success: true });
  });

  it.each([
    ["an administrator that does not exist in the database", { sub: 999_999, email: "ghost@unit.buzzard.test", role: "admin" }],
    ["the role administrator", { sub: 999_998, email: "ghost@unit.buzzard.test", role: "administrator" }],
    ["a token without id and credential version", null],
  ])("refuses a correctly signed token for %s", async (_label, claims) => {
    const real = jwt.decode(await dbLogin());
    const forged = jwt.sign(claims || { sub: real.sub, email: real.email, role: "admin" }, jwtSecret, { expiresIn: "1h", algorithm: "HS256" });
    expect((await me(forged)).status).toBe(401);
    expect((await api.request("GET", "/api/admin/orders", { token: forged })).status).toBe(401);
  });

  it("refuses a customer who was promoted only inside the token", async () => {
    const email = `customer-${crypto.randomBytes(4).toString("hex")}@unit.buzzard.test`;
    const password = `Cust-${crypto.randomBytes(9).toString("base64url")}-1a`;
    const registered = await api.request("POST", "/api/auth/register", { body: { email, password, name: "Synthetic Customer", role: "admin" } });
    expect([200, 201]).toContain(registered.status);
    const claims = jwt.decode(registered.json.token);
    expect(claims.role).toBe("customer");
    expect((await me(registered.json.token)).status).toBe(401);
    expect((await api.request("GET", "/api/admin/orders", { token: registered.json.token })).status).toBeGreaterThanOrEqual(401);
    expect((await api.request("GET", "/api/admin/orders", { token: registered.json.token })).status).toBeLessThan(404);

    const forged = jwt.sign({ ...claims, role: "admin", jti: "x", cv: "y" }, jwtSecret, { algorithm: "HS256" });
    expect((await me(forged)).status).toBe(401);
  });

  it.each([
    ["signed with another secret", (claims) => jwt.sign(claims, crypto.randomBytes(32).toString("hex"), { algorithm: "HS256" })],
    ["with algorithm none", (claims) => `${Buffer.from('{"alg":"none","typ":"JWT"}').toString("base64url")}.${Buffer.from(JSON.stringify(claims)).toString("base64url")}.`],
    ["signed with HS512", (claims) => jwt.sign(claims, jwtSecret, { algorithm: "HS512" })],
    ["that expired", (claims) => jwt.sign({ ...claims, exp: Math.floor(Date.now() / 1000) - 60 }, jwtSecret, { algorithm: "HS256" })],
  ])("refuses a token %s", async (_label, forge) => {
    const { iat, exp, ...claims } = jwt.decode(await dbLogin());
    const forged = forge(claims);
    expect((await me(forged)).status).toBe(401);
    expect((await api.request("GET", "/api/admin/orders", { token: forged })).status).toBe(401);
  });
});
