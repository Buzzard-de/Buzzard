import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { fakeRequest, freshServerLib, seedSyntheticAdmins, tempDataDir } from "./support/freshServerLib.mjs";

const EIGHT_HOURS_MS = 8 * 60 * 60 * 1000;

function responseRecorder() {
  return {
    statusCode: null,
    body: null,
    writeHead(status) {
      this.statusCode = status;
    },
    setHeader() {},
    end(payload) {
      this.body = payload ? JSON.parse(payload) : null;
    },
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    },
  };
}

function bearer(token) {
  return fakeRequest("198.51.100.7", token ? { authorization: `Bearer ${token}` } : {});
}

let lib;

function setup(env = {}) {
  const dataDir = tempDataDir("session");
  const accounts = seedSyntheticAdmins(dataDir);
  lib = freshServerLib({ BUZZARD_DATA_DIR: dataDir, BUZZARD_TEST_MODE: undefined, BUZZARD_RATE_LIMIT_DISABLED: undefined, ...env });
  return { dataDir, accounts, auth: lib.load("auth.js") };
}

afterEach(() => {
  vi.useRealTimers();
  lib?.restore();
  lib = null;
});

describe("admin login", () => {
  it("accepts the right password and rejects a wrong one with a generic error", () => {
    const { auth, accounts } = setup();
    const admin = accounts.administrator;

    const ok = auth.login(admin.email, admin.password, fakeRequest());
    expect(ok.success).toBe(true);
    expect(ok.token).toMatch(/^[0-9a-f]{64}$/);
    expect(ok.user).toEqual({ id: admin.id, email: admin.email, name: admin.name, role: "administrator" });
    expect(JSON.stringify(ok)).not.toContain("password");

    const wrong = auth.login(admin.email, `${admin.password}x`, fakeRequest());
    expect(wrong).toEqual({ success: false, errorKey: "admin.auth.invalid" });

    const unknown = auth.login("nobody@unit.buzzard.test", admin.password, fakeRequest());
    expect(unknown).toEqual({ success: false, errorKey: "admin.auth.invalid" });
  });

  it("issues a new server-generated token on every login", () => {
    const { auth, accounts } = setup();
    const admin = accounts.administrator;
    const first = auth.login(admin.email, admin.password, fakeRequest());
    const second = auth.login(admin.email, admin.password, fakeRequest());
    expect(first.token).not.toBe(second.token);
    expect(auth.getSession(first.token).sessionId).not.toBe(auth.getSession(second.token).sessionId);
    expect(auth.getSession("a".repeat(64))).toBeNull();
  });

  it("does not write the password or the bearer token to the security log", () => {
    const { auth, accounts, dataDir } = setup();
    const admin = accounts.administrator;
    const { token } = auth.login(admin.email, admin.password, fakeRequest());
    auth.login(admin.email, "wrong-password-value", fakeRequest());
    const log = readFileSync(path.join(dataDir, "security-log.json"), "utf8");
    expect(log).not.toContain(admin.password);
    expect(log).not.toContain("wrong-password-value");
    expect(log).not.toContain(token);
    expect(JSON.parse(log).map((entry) => entry.type)).toEqual(["admin_login", "admin_login_failed"]);
  });
});

describe("admin session lifetime", () => {
  it("answers 401 without a token, with an unknown token and after logout", () => {
    const { auth, accounts } = setup();
    const admin = accounts.administrator;
    const { token } = auth.login(admin.email, admin.password, fakeRequest());

    const valid = responseRecorder();
    expect(auth.requireAuth(bearer(token), valid)).toMatchObject({ userId: admin.id, role: "administrator" });
    expect(valid.statusCode).toBeNull();

    for (const candidate of [null, "f".repeat(64), `${token}0`, token.slice(0, 63)]) {
      const res = responseRecorder();
      expect(auth.requireAuth(bearer(candidate), res)).toBeFalsy();
      expect(res.statusCode).toBe(401);
    }

    auth.logout(token, fakeRequest());
    const afterLogout = responseRecorder();
    expect(auth.requireAuth(bearer(token), afterLogout)).toBeFalsy();
    expect(afterLogout.statusCode).toBe(401);
  });

  it("expires a session eight hours after login", () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-11-17T08:00:00.000Z"));
    const { auth, accounts, dataDir } = setup();
    const admin = accounts.administrator;
    const { token } = auth.login(admin.email, admin.password, fakeRequest());
    expect(auth.getSession(token).expiresAt - Date.now()).toBe(EIGHT_HOURS_MS);

    vi.setSystemTime(Date.now() + EIGHT_HOURS_MS - 1000);
    expect(auth.getSession(token)).not.toBeNull();

    vi.setSystemTime(Date.now() + 1000);
    const res = responseRecorder();
    expect(auth.requireAuth(bearer(token), res)).toBeFalsy();
    expect(res.statusCode).toBe(401);
    expect(JSON.parse(readFileSync(path.join(dataDir, "admin-sessions.json"), "utf8"))).toEqual([]);
  });

  it("revokes one session by id and leaves the others", () => {
    const { auth, accounts } = setup();
    const admin = accounts.administrator;
    const first = auth.login(admin.email, admin.password, fakeRequest());
    const second = auth.login(admin.email, admin.password, fakeRequest());
    const firstId = auth.getSession(first.token).sessionId;

    expect(auth.revokeSession(firstId, { revokedBy: admin.email })).toBeTruthy();
    expect(auth.getSession(first.token)).toBeNull();
    expect(auth.getSession(second.token)).not.toBeNull();
  });

  it("restores unexpired sessions after a restart and drops expired ones", () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-11-17T08:00:00.000Z"));
    const { auth, accounts, dataDir } = setup();
    const admin = accounts.administrator;
    const early = auth.login(admin.email, admin.password, fakeRequest());
    vi.setSystemTime(Date.now() + 2 * 60 * 60 * 1000);
    const late = auth.login(admin.email, admin.password, fakeRequest());
    lib.restore();

    vi.setSystemTime(new Date("2026-11-17T16:30:00.000Z"));
    lib = freshServerLib({ BUZZARD_DATA_DIR: dataDir });
    const restarted = lib.load("auth.js");
    expect(restarted.getSession(early.token)).toBeNull();
    expect(restarted.getSession(late.token)).toMatchObject({ userId: admin.id });
  });

  it("logs everyone out and keeps the damaged file when the session store is unreadable", () => {
    const { auth, accounts, dataDir } = setup();
    const admin = accounts.administrator;
    const { token } = auth.login(admin.email, admin.password, fakeRequest());
    lib.restore();

    const file = path.join(dataDir, "admin-sessions.json");
    const damaged = readFileSync(file, "utf8").slice(0, 40);
    writeFileSync(file, damaged);

    lib = freshServerLib({ BUZZARD_DATA_DIR: dataDir });
    const restarted = lib.load("auth.js");
    expect(restarted.getSession(token)).toBeNull();
    const copies = readdirSync(dataDir).filter((name) => name.startsWith("admin-sessions.json.corrupt-"));
    expect(copies).toHaveLength(1);
    expect(readFileSync(path.join(dataDir, copies[0]), "utf8")).toBe(damaged);
  });
});

describe("admin login limiter", () => {
  it("returns rateLimited on the ninth attempt in fifteen minutes when the limiter is on", () => {
    const { auth, accounts } = setup();
    const admin = accounts.administrator;
    const req = fakeRequest("198.51.100.20");
    for (let attempt = 1; attempt <= 8; attempt += 1) {
      expect(auth.login(admin.email, admin.password, req).success, `attempt ${attempt}`).toBe(true);
    }
    expect(auth.login(admin.email, admin.password, req)).toEqual({ success: false, errorKey: "admin.auth.rateLimited" });
    // Another address is counted separately.
    expect(auth.login(admin.email, admin.password, fakeRequest("198.51.100.21")).success).toBe(true);
  });

  it("does not rate limit in test mode but still locks the account after five failures", () => {
    const { auth, accounts } = setup({ BUZZARD_TEST_MODE: "1" });
    const admin = accounts.administrator;
    const req = fakeRequest("198.51.100.30");
    for (let attempt = 1; attempt <= 12; attempt += 1) {
      expect(auth.login(admin.email, admin.password, req).success, `attempt ${attempt}`).toBe(true);
    }

    const readOnly = accounts.read_only;
    const results = [];
    for (let attempt = 1; attempt <= 6; attempt += 1) {
      results.push(auth.login(readOnly.email, "wrong-password-value", req).errorKey);
    }
    expect(results).toEqual([
      "admin.auth.invalid",
      "admin.auth.invalid",
      "admin.auth.invalid",
      "admin.auth.invalid",
      "admin.auth.locked",
      "admin.auth.locked",
    ]);
    // The right password does not get through a locked account either.
    expect(auth.login(readOnly.email, readOnly.password, req).errorKey).toBe("admin.auth.locked");
  });

  it("locks the account after five failures with the limiter on", () => {
    const { auth, accounts } = setup();
    const readOnly = accounts.read_only;
    const req = fakeRequest("198.51.100.40");
    const results = [];
    for (let attempt = 1; attempt <= 5; attempt += 1) {
      results.push(auth.login(readOnly.email, "wrong-password-value", req).errorKey);
    }
    expect(results.slice(0, 4)).toEqual(Array(4).fill("admin.auth.invalid"));
    expect(results[4]).toBe("admin.auth.locked");
  });
});

describe("admin account seeding", () => {
  it("creates no accounts from the committed seed file in production", () => {
    const dataDir = tempDataDir("seed");
    lib = freshServerLib({ BUZZARD_DATA_DIR: dataDir, NODE_ENV: "production", ADMIN_EMAIL: undefined, ADMIN_PASSWORD: undefined });
    const errors = vi.spyOn(console, "error").mockImplementation(() => {});
    const auth = lib.load("auth.js");
    const seed = JSON.parse(readFileSync(new URL("../../data/buzzard_admin_users.seed.json", import.meta.url), "utf8"));

    for (const entry of seed) {
      expect(auth.login(entry.email, entry.password, fakeRequest()).success).toBe(false);
    }
    expect(existsSync(path.join(dataDir, "admin-users.json"))).toBe(false);
    errors.mockRestore();
  });

  it("creates the first production administrator from ADMIN_EMAIL and ADMIN_PASSWORD", () => {
    const dataDir = tempDataDir("seed");
    const password = `synthetic-${Math.random().toString(36).slice(2)}-production`;
    lib = freshServerLib({
      BUZZARD_DATA_DIR: dataDir,
      NODE_ENV: "production",
      ADMIN_EMAIL: "Owner@Unit.Buzzard.Test",
      ADMIN_PASSWORD: password,
    });
    const auth = lib.load("auth.js");
    const result = auth.login("owner@unit.buzzard.test", password, fakeRequest());
    expect(result.success).toBe(true);
    expect(result.user.role).toBe("administrator");
    const stored = readFileSync(path.join(dataDir, "admin-users.json"), "utf8");
    expect(stored).not.toContain(password);
    expect(JSON.parse(stored)).toHaveLength(1);
    expect(auth.findSeedCredentialAccounts()).toEqual([]);
  });

  it("reports accounts that still use a seed password", () => {
    const dataDir = tempDataDir("seed");
    lib = freshServerLib({ BUZZARD_DATA_DIR: dataDir, NODE_ENV: "test" });
    const auth = lib.load("auth.js");
    const seed = JSON.parse(readFileSync(new URL("../../data/buzzard_admin_users.seed.json", import.meta.url), "utf8"));
    auth.login(seed[0].email, "not-the-password", fakeRequest());
    expect(auth.findSeedCredentialAccounts().sort()).toEqual(seed.map((entry) => entry.id).sort());
  });
});
