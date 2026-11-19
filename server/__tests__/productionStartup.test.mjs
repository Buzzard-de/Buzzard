import { randomBytes } from "node:crypto";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { startIsolatedApi } from "./support/isolatedApi.mjs";

const seed = JSON.parse(readFileSync(new URL("../../data/buzzard_admin_users.seed.json", import.meta.url), "utf8"));
const jwtSecret = randomBytes(32).toString("base64");
const adminPassword = `Unit-${randomBytes(12).toString("base64url")}-7q`;
const production = {
  NODE_ENV: "production",
  JWT_SECRET: jwtSecret,
  ADMIN_EMAIL: "owner@unit.buzzard.test",
  ADMIN_PASSWORD: adminPassword,
  BUZZARD_TEST_MODE: undefined,
  BUZZARD_RATE_LIMIT_DISABLED: undefined,
  BUZZARD_E2E_DB: undefined,
  BUZZARD_TRUSTED_PROXY_HOPS: "0",
};

let api;

afterEach(async () => {
  await api?.stop();
  api = null;
});

async function expectRefusal(env, pattern, secrets = []) {
  api = await startIsolatedApi({ env: { ...production, ...env }, seed: false, expectExit: true });
  const exit = await Promise.race([api.exited, new Promise((resolve) => setTimeout(() => resolve("still running"), 45_000))]);
  expect(exit, api.output().slice(-600)).not.toBe("still running");
  expect(exit.code).toBe(1);
  expect(api.output()).toMatch(pattern);
  expect(api.output()).not.toMatch(/Buzzard API server running/);
  for (const secret of [jwtSecret, adminPassword, ...secrets]) expect(api.output()).not.toContain(secret);
  expect(existsSync(path.join(api.dataDir, "admin-users.json"))).toBe(false);
}

describe("production refuses to start without its mandatory secrets", () => {
  it("without JWT_SECRET", async () => {
    await expectRefusal({ JWT_SECRET: undefined, AUTH_SECRET: undefined }, /JWT_SECRET must be set/);
  }, 60_000);

  it("with a short JWT_SECRET", async () => {
    await expectRefusal({ JWT_SECRET: "Short-Secret-123" }, /JWT_SECRET must be a random value/, ["Short-Secret-123"]);
  }, 60_000);

  it("with a placeholder JWT_SECRET", async () => {
    const placeholder = "change-me-change-me-change-me-change-me";
    await expectRefusal({ JWT_SECRET: placeholder }, /JWT_SECRET must be a random value/, [placeholder]);
  }, 60_000);

  it("without ADMIN_EMAIL and ADMIN_PASSWORD when no account exists", async () => {
    await expectRefusal({ ADMIN_EMAIL: undefined, ADMIN_PASSWORD: undefined }, /ADMIN_EMAIL and ADMIN_PASSWORD must be set/);
  }, 60_000);

  it("with a weak ADMIN_PASSWORD", async () => {
    await expectRefusal({ ADMIN_PASSWORD: "Short-1x" }, /ADMIN_PASSWORD does not meet/, ["Short-1x"]);
  }, 60_000);

  it("with a demo password from the committed seed file as ADMIN_PASSWORD", async () => {
    await expectRefusal({ ADMIN_PASSWORD: seed[0].password }, /ADMIN_PASSWORD does not meet/, [seed[0].password]);
  }, 60_000);

  it("with BUZZARD_TEST_MODE=1", async () => {
    await expectRefusal({ BUZZARD_TEST_MODE: "1" }, /BUZZARD_TEST_MODE=1 must not be set in production/);
  }, 60_000);

  it("with BUZZARD_E2E_DB=1", async () => {
    await expectRefusal({ BUZZARD_E2E_DB: "1" }, /BUZZARD_E2E_DB=1 must not be set in production/);
  }, 60_000);

  it("with BUZZARD_RATE_LIMIT_DISABLED=1", async () => {
    await expectRefusal({ BUZZARD_RATE_LIMIT_DISABLED: "1" }, /BUZZARD_RATE_LIMIT_DISABLED=1 must not be set/);
  }, 60_000);

  it("on a hosted runtime that forgot NODE_ENV=production", async () => {
    await expectRefusal({ NODE_ENV: "development", RENDER: "true", JWT_SECRET: undefined }, /JWT_SECRET must be set/);
  }, 60_000);
});

describe("production with a complete configuration", () => {
  it("starts, creates exactly the configured administrator and no demo account, and prints no secret", async () => {
    api = await startIsolatedApi({ env: production, seed: false });

    const users = api.readStore("admin-users.json");
    expect(users.map((user) => [user.email, user.role])).toEqual([["owner@unit.buzzard.test", "administrator"]]);
    expect(statSync(path.join(api.dataDir, "admin-users.json")).mode & 0o777).toBe(0o600);

    for (const entry of seed) {
      const res = await api.request("POST", "/api/admin/login", { body: { email: entry.email, password: entry.password } });
      expect(res.status, entry.id).toBe(401);
      expect(res.json.errorKey).toBe("admin.auth.invalid");
    }

    const login = await api.request("POST", "/api/admin/login", { body: { email: "owner@unit.buzzard.test", password: adminPassword } });
    expect(login.status).toBe(200);
    expect(login.json.user.role).toBe("administrator");
    expect(login.text).not.toMatch(/password_hash|scrypt:/);
    const me = await api.request("GET", "/api/admin/me", { token: login.json.token });
    expect(me.status).toBe(200);

    const health = await api.request("GET", "/api/health");
    expect(health.status).toBe(200);
    expect(health.text).not.toContain(api.root);
    expect(health.json.database.path).toBe("[data]/catalog.sqlite");
    for (const route of ["/api/health/db", "/api/health/production", "/api/health/operations", "/api/health/go-live-readiness", "/api/smart-menu-48/health"]) {
      const res = await api.request("GET", route);
      expect(res.text, route).not.toContain(api.root);
      expect(res.text, route).not.toMatch(/\/tmp\/|\/workspace|\/home\//);
    }

    const stored = readdirSync(api.dataDir)
      .filter((name) => name.endsWith(".json"))
      .map((name) => readFileSync(path.join(api.dataDir, name), "utf8"))
      .join("\n");
    for (const secret of [jwtSecret, adminPassword, login.json.token]) {
      expect(api.output()).not.toContain(secret);
      expect(stored).not.toContain(secret);
    }
  }, 90_000);

  it("enforces the login limiter, sends HSTS and does not trust the null origin", async () => {
    api = await startIsolatedApi({ env: production, seed: false });
    const attempts = [];
    for (let index = 0; index < 10; index += 1) {
      const res = await api.request("POST", "/api/admin/login", { body: { email: "owner@unit.buzzard.test", password: adminPassword } });
      attempts.push(res.status);
    }
    expect(attempts).toEqual([...Array(8).fill(200), 429, 429]);

    const failures = [];
    for (let index = 0; index < 6; index += 1) {
      const res = await api.request("POST", "/api/admin/login", { body: { email: "locked@unit.buzzard.test", password: "Wrong-Value-000" } });
      failures.push(res.json.errorKey);
    }
    expect(failures).toEqual([...Array(4).fill("admin.auth.invalid"), "admin.auth.locked", "admin.auth.locked"]);

    const res = await api.request("GET", "/api/health", { headers: { Origin: "null" } });
    expect(res.headers.get("access-control-allow-origin")).toBeNull();
    expect(res.headers.get("strict-transport-security")).toMatch(/max-age=\d+/);
    const allowed = await api.request("GET", "/api/health", { headers: { Origin: "https://buzzard24.de" } });
    expect(allowed.headers.get("access-control-allow-origin")).toBe("https://buzzard24.de");
  }, 90_000);

  it("starts a second time on the same data without the bootstrap variables", async () => {
    api = await startIsolatedApi({ env: production, seed: false });
    const { dataDir, root } = api;
    const before = readFileSync(path.join(dataDir, "admin-users.json"), "utf8");
    await api.stop();

    api = await startIsolatedApi({
      env: {
        ...production,
        ADMIN_EMAIL: undefined,
        ADMIN_PASSWORD: undefined,
        BUZZARD_DATA_DIR: dataDir,
        BUZZARD_DB_PATH: path.join(root, "catalog.sqlite"),
      },
      seed: false,
    });
    expect(readFileSync(path.join(dataDir, "admin-users.json"), "utf8")).toBe(before);
    const login = await api.request("POST", "/api/admin/login", { body: { email: "owner@unit.buzzard.test", password: adminPassword } });
    expect(login.status).toBe(200);
  }, 120_000);
});

describe("development configuration", () => {
  it("starts without secrets, seeds the demo accounts and warns about nothing fatal", async () => {
    api = await startIsolatedApi({
      env: { NODE_ENV: "development", JWT_SECRET: undefined, AUTH_SECRET: undefined, ADMIN_EMAIL: undefined, ADMIN_PASSWORD: undefined, BUZZARD_TEST_MODE: "1" },
      seed: false,
    });
    const res = await api.request("POST", "/api/admin/login", { body: { email: seed[0].email, password: seed[0].password } });
    expect(res.status).toBe(200);
    expect(api.readStore("admin-users.json").map((user) => user.id).sort()).toEqual(seed.map((entry) => entry.id).sort());
    expect(api.output()).not.toContain(seed[0].password);
    expect((await api.request("GET", "/api/health", { headers: { Origin: "null" } })).headers.get("access-control-allow-origin")).toBe("null");
  }, 90_000);
});
