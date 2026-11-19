import crypto from "node:crypto";
import { existsSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { fakeRequest, freshServerLib, seedSyntheticAdmins, tempDataDir } from "./support/freshServerLib.mjs";

const require = createRequire(import.meta.url);
const seed = JSON.parse(readFileSync(new URL("../../data/buzzard_admin_users.seed.json", import.meta.url), "utf8"));

let lib;

function setup(env = {}, { accounts = true } = {}) {
  const dataDir = tempDataDir("login");
  const seeded = accounts ? seedSyntheticAdmins(dataDir) : {};
  lib = freshServerLib({
    BUZZARD_DATA_DIR: dataDir,
    BUZZARD_TEST_MODE: undefined,
    BUZZARD_RATE_LIMIT_DISABLED: undefined,
    BUZZARD_TRUSTED_PROXY_HOPS: undefined,
    RENDER: undefined,
    BUZZARD_ENV: undefined,
    ...env,
  });
  return { dataDir, accounts: seeded };
}

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  lib?.restore();
  lib = null;
});

describe("administrator password rules", () => {
  const { checkAdminPassword } = require("../lib/passwordPolicy.js");

  it.each([
    [undefined, "not_a_string"],
    [12345678901234, "not_a_string"],
    ["Short1!", "too_short"],
    ["x".repeat(257), "too_long"],
    [" Padded-Value-2026 ", "surrounding_whitespace"],
    ["MyPassword-2026-x", "common_pattern"],
    ["Changeme-Now-2026", "common_pattern"],
    ["aaaaaaaaaaaaaaaaaaaaaaaa", "too_few_distinct_characters"],
    ["abababababab1", "too_few_distinct_characters"],
    ["onlylowercaseabc", "too_few_character_classes"],
    ["owner-Access-77", "contains_account_name"],
  ])("rejects %s as %s", (password, reason) => {
    expect(checkAdminPassword(password, { email: "owner@unit.buzzard.test" })).toEqual({ ok: false, reason });
  });

  it("rejects every password from the committed seed file and the development default", () => {
    const { DEV_ADMIN_PASSWORD } = require("../lib/dbAuth.js");
    const denylist = [...seed.map((entry) => entry.password), DEV_ADMIN_PASSWORD];
    for (const password of denylist) {
      expect(checkAdminPassword(password, { denylist }).ok).toBe(false);
    }
  });

  it("accepts a generated value and a long passphrase", () => {
    expect(checkAdminPassword(crypto.randomBytes(32).toString("base64"), { email: "owner@unit.buzzard.test" })).toEqual({ ok: true });
    expect(checkAdminPassword("korrekt pferd batterie heftklammer", { email: "owner@unit.buzzard.test" })).toEqual({ ok: true });
    expect(checkAdminPassword("Tr4vel-Kiosk-93", {})).toEqual({ ok: true });
  });

  it("never echoes the candidate", () => {
    const candidate = "Synthetic-Candidate-Value-1";
    expect(JSON.stringify(checkAdminPassword(candidate, { denylist: [candidate] }))).not.toContain(candidate);
  });
});

describe("first administrator in production", () => {
  const strongPassword = `Unit-${crypto.randomBytes(12).toString("base64url")}-9a`;

  function production(env) {
    return setup({ NODE_ENV: "production", ADMIN_EMAIL: undefined, ADMIN_PASSWORD: undefined, ...env }, { accounts: false });
  }

  it("reports missing credentials and creates nothing", () => {
    const { dataDir } = production({});
    vi.spyOn(console, "error").mockImplementation(() => {});
    const auth = lib.load("auth.js");
    expect(auth.adminBootstrapStatus()).toEqual({ state: "missing_credentials" });
    expect(auth.loadUsers()).toEqual([]);
    expect(existsSync(path.join(dataDir, "admin-users.json"))).toBe(false);
  });

  it.each([
    ["not-an-address", "invalid_email"],
    ["owner@localhost", "invalid_email"],
  ])("refuses ADMIN_EMAIL %s", (email, state) => {
    production({ ADMIN_EMAIL: email, ADMIN_PASSWORD: strongPassword });
    expect(lib.load("auth.js").adminBootstrapStatus().state).toBe(state);
  });

  it.each([
    ["a seed password", () => seed[0].password],
    ["the development default", () => require("../lib/dbAuth.js").DEV_ADMIN_PASSWORD],
    ["a short value", () => "Short-1x"],
    ["a value with the account name", () => "owner-Access-2026"],
  ])("refuses %s as ADMIN_PASSWORD and writes no account", (_label, value) => {
    const password = value();
    const { dataDir } = production({ ADMIN_EMAIL: "owner@unit.buzzard.test", ADMIN_PASSWORD: password });
    const errors = vi.spyOn(console, "error").mockImplementation(() => {});
    const auth = lib.load("auth.js");
    expect(auth.adminBootstrapStatus().state).toBe("weak_password");
    expect(auth.login("owner@unit.buzzard.test", password, fakeRequest()).success).toBe(false);
    expect(existsSync(path.join(dataDir, "admin-users.json"))).toBe(false);
    expect(JSON.stringify(errors.mock.calls)).not.toContain(password);
  });

  it("creates exactly one administrator, stores only a scrypt hash and logs no secret", () => {
    const { dataDir } = production({ ADMIN_EMAIL: "Owner@Unit.Buzzard.Test", ADMIN_PASSWORD: strongPassword });
    const logs = vi.spyOn(console, "log").mockImplementation(() => {});
    const errors = vi.spyOn(console, "error").mockImplementation(() => {});
    const auth = lib.load("auth.js");
    expect(auth.seedProductionAdmin()).toEqual({ state: "created" });
    const file = path.join(dataDir, "admin-users.json");
    const stored = JSON.parse(readFileSync(file, "utf8"));
    expect(stored).toHaveLength(1);
    expect(stored[0]).toMatchObject({ email: "owner@unit.buzzard.test", role: "administrator" });
    expect(stored[0].password_hash).toMatch(/^scrypt:[0-9a-f]{32}:[0-9a-f]{128}$/);
    expect(statSync(file).mode & 0o777).toBe(0o600);
    expect(readFileSync(file, "utf8")).not.toContain(strongPassword);
    expect(JSON.stringify([logs.mock.calls, errors.mock.calls])).not.toContain(strongPassword);
    expect(readFileSync(path.join(dataDir, "security-log.json"), "utf8")).not.toContain(strongPassword);
    expect(auth.adminBootstrapStatus()).toEqual({ state: "existing" });
    expect(auth.login("owner@unit.buzzard.test", strongPassword, fakeRequest()).success).toBe(true);
  });

  it("does not touch existing accounts when ADMIN_PASSWORD changes later", () => {
    const { dataDir } = production({ ADMIN_EMAIL: "owner@unit.buzzard.test", ADMIN_PASSWORD: strongPassword });
    vi.spyOn(console, "log").mockImplementation(() => {});
    lib.load("auth.js").seedProductionAdmin();
    const before = readFileSync(path.join(dataDir, "admin-users.json"), "utf8");
    lib.restore();

    lib = freshServerLib({ BUZZARD_DATA_DIR: dataDir, NODE_ENV: "production", ADMIN_EMAIL: "other@unit.buzzard.test", ADMIN_PASSWORD: `${strongPassword}-next` });
    const auth = lib.load("auth.js");
    expect(auth.seedProductionAdmin()).toEqual({ state: "existing" });
    expect(readFileSync(path.join(dataDir, "admin-users.json"), "utf8")).toBe(before);
    expect(auth.login("other@unit.buzzard.test", `${strongPassword}-next`, fakeRequest()).success).toBe(false);
  });

  it("never replaces an unreadable users file, with or without credentials", () => {
    const { dataDir } = production({ ADMIN_EMAIL: "owner@unit.buzzard.test", ADMIN_PASSWORD: strongPassword });
    vi.spyOn(console, "error").mockImplementation(() => {});
    const file = path.join(dataDir, "admin-users.json");
    writeFileSync(file, '[{"id":"usr-1","email":');
    const auth = lib.load("auth.js");
    expect(auth.adminBootstrapStatus()).toEqual({ state: "store_unreadable" });
    expect(auth.seedProductionAdmin()).toEqual({ state: "store_unreadable" });
    expect(auth.login("owner@unit.buzzard.test", strongPassword, fakeRequest()).success).toBe(false);
    expect(readFileSync(file, "utf8")).toBe('[{"id":"usr-1","email":');
  });

  it.each([
    ["RENDER", "true"],
    ["BUZZARD_ENV", "production"],
  ])("creates no demo accounts on a hosted runtime that only sets %s", (key, value) => {
    const { dataDir } = setup({ NODE_ENV: "development", [key]: value, ADMIN_EMAIL: undefined, ADMIN_PASSWORD: undefined }, { accounts: false });
    vi.spyOn(console, "error").mockImplementation(() => {});
    const auth = lib.load("auth.js");
    for (const entry of seed) {
      expect(auth.login(entry.email, entry.password, fakeRequest()).success).toBe(false);
    }
    expect(existsSync(path.join(dataDir, "admin-users.json"))).toBe(false);
  });

  it("seeds the demo accounts only in development", () => {
    const { dataDir } = setup({ NODE_ENV: "development" }, { accounts: false });
    const auth = lib.load("auth.js");
    expect(auth.loadUsers().map((user) => user.id).sort()).toEqual(seed.map((entry) => entry.id).sort());
    const stored = readFileSync(path.join(dataDir, "admin-users.json"), "utf8");
    for (const entry of seed) expect(stored).not.toContain(entry.password);
  });
});

describe("password verification", () => {
  it("accepts an existing scrypt hash unchanged", () => {
    const { dataDir, accounts } = setup();
    const before = readFileSync(path.join(dataDir, "admin-users.json"), "utf8");
    const auth = lib.load("auth.js");
    expect(auth.login(accounts.administrator.email, accounts.administrator.password, fakeRequest()).success).toBe(true);
    expect(readFileSync(path.join(dataDir, "admin-users.json"), "utf8")).toBe(before);
  });

  it("upgrades a legacy SHA-256 hash to scrypt on the first successful login and keeps the session", () => {
    const { dataDir, accounts } = setup();
    const file = path.join(dataDir, "admin-users.json");
    const users = JSON.parse(readFileSync(file, "utf8"));
    const admin = accounts.administrator;
    users.find((user) => user.id === admin.id).password_hash = crypto.createHash("sha256").update(admin.password).digest("hex");
    writeFileSync(file, JSON.stringify(users));
    const auth = lib.load("auth.js");
    const result = auth.login(admin.email, admin.password, fakeRequest());
    expect(result.success).toBe(true);
    const stored = JSON.parse(readFileSync(file, "utf8")).find((user) => user.id === admin.id);
    expect(stored.password_hash).toMatch(/^scrypt:/);
    expect(auth.getSession(result.token)).toMatchObject({ userId: admin.id });
    expect(auth.login(admin.email, admin.password, fakeRequest("198.51.100.8")).success).toBe(true);
  });

  it("runs one scrypt comparison for an unknown address, as for a wrong password", () => {
    const { accounts } = setup();
    vi.spyOn(console, "log").mockImplementation(() => {});
    const auth = lib.load("auth.js");
    auth.login("warmup@unit.buzzard.test", "x", fakeRequest("198.51.100.50"));
    const scrypt = vi.spyOn(crypto, "scryptSync");
    auth.login("nobody@unit.buzzard.test", "some-wrong-value", fakeRequest("198.51.100.51"));
    const unknownCalls = scrypt.mock.calls.length;
    scrypt.mockClear();
    auth.login(accounts.read_only.email, "some-wrong-value", fakeRequest("198.51.100.52"));
    expect(unknownCalls).toBe(1);
    expect(scrypt.mock.calls.length).toBe(1);
  });

  it.each([
    ["no password", undefined],
    ["an empty password", ""],
    ["a number", 12345678],
    ["an object", { $ne: null }],
    ["an array", ["x"]],
    ["an oversized password", "x".repeat(5000)],
  ])("rejects %s without throwing", (_label, password) => {
    const { accounts } = setup({ BUZZARD_TEST_MODE: "1" });
    vi.spyOn(console, "log").mockImplementation(() => {});
    const auth = lib.load("auth.js");
    expect(auth.login(accounts.administrator.email, password, fakeRequest()).errorKey).toBe("admin.auth.invalid");
  });

  it.each([
    ["an object as address", { $gt: "" }],
    ["an array as address", ["a@b.c"]],
    ["no address", undefined],
    ["an oversized address", `${"a".repeat(5000)}@unit.buzzard.test`],
  ])("rejects %s without throwing", (_label, email) => {
    setup({ BUZZARD_TEST_MODE: "1" });
    vi.spyOn(console, "log").mockImplementation(() => {});
    const auth = lib.load("auth.js");
    expect(auth.login(email, "whatever-value", fakeRequest()).errorKey).toBe("admin.auth.invalid");
  });

  it("answers a wrong password, an unknown address and a malformed request identically", () => {
    const { accounts } = setup({ BUZZARD_TEST_MODE: "1" });
    vi.spyOn(console, "log").mockImplementation(() => {});
    const auth = lib.load("auth.js");
    const answers = [
      auth.login(accounts.administrator.email, "wrong-value", fakeRequest()),
      auth.login("nobody@unit.buzzard.test", "wrong-value", fakeRequest()),
      auth.login(null, null, fakeRequest()),
    ];
    for (const answer of answers) expect(answer).toEqual({ success: false, errorKey: "admin.auth.invalid" });
  });
});

describe("brute-force protection", () => {
  it("limits one address that walks through many accounts", () => {
    setup();
    vi.spyOn(console, "log").mockImplementation(() => {});
    const auth = lib.load("auth.js");
    const req = fakeRequest("198.51.100.60");
    const results = [];
    for (let index = 0; index < 42; index += 1) {
      results.push(auth.login(`spray-${index}@unit.buzzard.test`, "wrong-value", req).errorKey);
    }
    expect(results.slice(0, 40)).toEqual(Array(40).fill("admin.auth.invalid"));
    expect(results.slice(40)).toEqual(["admin.auth.rateLimited", "admin.auth.rateLimited"]);
    expect(auth.login("spray-x@unit.buzzard.test", "wrong-value", fakeRequest("198.51.100.61")).errorKey).toBe("admin.auth.invalid");
  });

  it("keeps the account locked for thirty minutes and then counts from zero", () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-11-18T08:00:00.000Z"));
    const { accounts } = setup({ BUZZARD_TEST_MODE: "1" });
    vi.spyOn(console, "log").mockImplementation(() => {});
    const auth = lib.load("auth.js");
    const target = accounts.read_only;
    for (let attempt = 0; attempt < 5; attempt += 1) auth.login(target.email, "wrong-value", fakeRequest());
    const locked = auth.login(target.email, target.password, fakeRequest());
    expect(locked.errorKey).toBe("admin.auth.locked");
    expect(locked.retryAfterSec).toBe(1800);

    vi.setSystemTime(Date.now() + 30 * 60 * 1000 - 1000);
    expect(auth.login(target.email, target.password, fakeRequest()).errorKey).toBe("admin.auth.locked");
    vi.setSystemTime(Date.now() + 1000);
    expect(auth.login(target.email, "wrong-value", fakeRequest()).errorKey).toBe("admin.auth.invalid");
    expect(auth.login(target.email, target.password, fakeRequest()).success).toBe(true);
  });

  it("locks an address that does not exist the same way, so locking reveals nothing", () => {
    setup({ BUZZARD_TEST_MODE: "1" });
    vi.spyOn(console, "log").mockImplementation(() => {});
    const auth = lib.load("auth.js");
    const results = [];
    for (let attempt = 0; attempt < 6; attempt += 1) {
      results.push(auth.login("ghost@unit.buzzard.test", "wrong-value", fakeRequest()).errorKey);
    }
    expect(results).toEqual([...Array(4).fill("admin.auth.invalid"), "admin.auth.locked", "admin.auth.locked"]);
  });

  it("a successful login clears the failure counter", () => {
    const { accounts } = setup({ BUZZARD_TEST_MODE: "1" });
    vi.spyOn(console, "log").mockImplementation(() => {});
    const auth = lib.load("auth.js");
    const target = accounts.read_only;
    for (let attempt = 0; attempt < 4; attempt += 1) auth.login(target.email, "wrong-value", fakeRequest());
    expect(auth.login(target.email, target.password, fakeRequest()).success).toBe(true);
    for (let attempt = 0; attempt < 4; attempt += 1) {
      expect(auth.login(target.email, "wrong-value", fakeRequest()).errorKey).toBe("admin.auth.invalid");
    }
  });
});

describe("lockout store", () => {
  it("is written atomically with private permissions and stays valid JSON", () => {
    const { dataDir } = setup();
    vi.spyOn(console, "log").mockImplementation(() => {});
    const lockout = lib.load("accountLockout.js");
    for (let index = 0; index < 50; index += 1) lockout.recordFailure("admin", `user-${index}@unit.buzzard.test`, {});
    const file = path.join(dataDir, "account-lockouts.json");
    expect(Object.keys(JSON.parse(readFileSync(file, "utf8")))).toHaveLength(50);
    expect(statSync(file).mode & 0o777).toBe(0o600);
  });

  it("drops counters after a day without a failure and locks after their time", () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-11-18T08:00:00.000Z"));
    const { dataDir } = setup();
    vi.spyOn(console, "log").mockImplementation(() => {});
    const lockout = lib.load("accountLockout.js");
    lockout.recordFailure("admin", "counter@unit.buzzard.test", {});
    for (let attempt = 0; attempt < 5; attempt += 1) lockout.recordFailure("admin", "locked@unit.buzzard.test", {});
    expect(lockout.isLocked("admin", "locked@unit.buzzard.test")).toBe(true);

    vi.setSystemTime(Date.now() + 24 * 60 * 60 * 1000 + 1000);
    expect(lockout.getLockoutInfo("admin", "counter@unit.buzzard.test")).toEqual({ locked: false, failures: 0 });
    expect(lockout.isLocked("admin", "locked@unit.buzzard.test")).toBe(false);
    lockout.recordFailure("admin", "fresh@unit.buzzard.test", {});
    expect(Object.keys(JSON.parse(readFileSync(path.join(dataDir, "account-lockouts.json"), "utf8")))).toEqual(["admin:fresh@unit.buzzard.test"]);
  });

  it("is capped and keeps active locks when identifiers are sprayed", () => {
    const { dataDir } = setup();
    vi.spyOn(console, "log").mockImplementation(() => {});
    const lockout = lib.load("accountLockout.js");
    lockout.DEFAULTS.maxEntries = 20;
    for (let attempt = 0; attempt < 5; attempt += 1) lockout.recordFailure("admin", "victim@unit.buzzard.test", {});
    for (let index = 0; index < 60; index += 1) lockout.recordFailure("admin", `spray-${index}@unit.buzzard.test`, {});
    const state = JSON.parse(readFileSync(path.join(dataDir, "account-lockouts.json"), "utf8"));
    expect(Object.keys(state).length).toBeLessThanOrEqual(21);
    expect(lockout.isLocked("admin", "victim@unit.buzzard.test")).toBe(true);
  });

  it("an unreadable lockout file does not stop logins and is kept", () => {
    const { dataDir, accounts } = setup();
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
    writeFileSync(path.join(dataDir, "account-lockouts.json"), "{broken");
    const auth = lib.load("auth.js");
    expect(auth.login(accounts.administrator.email, accounts.administrator.password, fakeRequest()).success).toBe(true);
    expect(auth.login(accounts.read_only.email, "wrong-value", fakeRequest()).errorKey).toBe("admin.auth.invalid");
    const { readdirSync } = require("node:fs");
    expect(readdirSync(dataDir).some((name) => name.startsWith("account-lockouts.json.corrupt-"))).toBe(true);
  });
});

describe("client address", () => {
  const request = (forwarded, socket = "10.0.0.9") => ({
    headers: forwarded === undefined ? {} : { "x-forwarded-for": forwarded },
    socket: { remoteAddress: socket },
  });

  it.each([
    [undefined, "203.0.113.5, 10.0.0.1", "203.0.113.5"],
    [undefined, undefined, "10.0.0.9"],
    ["0", "203.0.113.5", "10.0.0.9"],
    ["1", "198.51.100.99, 203.0.113.5", "203.0.113.5"],
    ["1", "203.0.113.5", "203.0.113.5"],
    ["2", "198.51.100.99, 203.0.113.5, 10.0.0.1", "203.0.113.5"],
    ["2", "203.0.113.5", "10.0.0.9"],
    ["1", "<script>alert(1)</script>", "unknown"],
    ["1", ["198.51.100.99", "203.0.113.5"], "203.0.113.5"],
  ])("with BUZZARD_TRUSTED_PROXY_HOPS=%s and X-Forwarded-For %j the address is %s", (hops, forwarded, expected) => {
    setup({ BUZZARD_TRUSTED_PROXY_HOPS: hops }, { accounts: false });
    expect(lib.load("security.js").getClientIp(request(forwarded))).toBe(expected);
  });

  it("strips the IPv4-mapped prefix from the socket address", () => {
    setup({ BUZZARD_TRUSTED_PROXY_HOPS: "0" }, { accounts: false });
    expect(lib.load("security.js").getClientIp(request(undefined, "::ffff:127.0.0.1"))).toBe("127.0.0.1");
  });

  it("a forged X-Forwarded-For does not reset the login limiter once the proxy count is configured", () => {
    const { accounts } = setup({ BUZZARD_TRUSTED_PROXY_HOPS: "1" });
    vi.spyOn(console, "log").mockImplementation(() => {});
    const auth = lib.load("auth.js");
    const admin = accounts.administrator;
    const results = [];
    for (let attempt = 0; attempt < 10; attempt += 1) {
      // The client invents a new first entry every time; the proxy appends the real address.
      const req = { headers: { "x-forwarded-for": `198.51.100.${attempt}, 203.0.113.77` }, socket: { remoteAddress: "10.0.0.1" } };
      results.push(auth.login(admin.email, admin.password, req).errorKey || "ok");
    }
    expect(results).toEqual([...Array(8).fill("ok"), "admin.auth.rateLimited", "admin.auth.rateLimited"]);
  });
});

describe("credentials never leave the server", () => {
  it("keeps hashes, passwords and tokens out of login answers, the security log and the console", () => {
    const { dataDir, accounts } = setup({ BUZZARD_TEST_MODE: "1" });
    const logs = vi.spyOn(console, "log").mockImplementation(() => {});
    const errors = vi.spyOn(console, "error").mockImplementation(() => {});
    const auth = lib.load("auth.js");
    const admin = accounts.administrator;
    const ok = auth.login(admin.email, admin.password, fakeRequest());
    const failed = auth.login(admin.email, "Wrong-Secret-Value-77", fakeRequest());
    const hash = JSON.parse(readFileSync(path.join(dataDir, "admin-users.json"), "utf8")).find((user) => user.id === admin.id).password_hash;

    const answers = JSON.stringify([ok, failed]);
    expect(answers).not.toContain(hash);
    expect(answers).not.toContain(admin.password);

    const written = [
      readFileSync(path.join(dataDir, "security-log.json"), "utf8"),
      JSON.stringify(logs.mock.calls),
      JSON.stringify(errors.mock.calls),
    ].join("\n");
    for (const secret of [admin.password, "Wrong-Secret-Value-77", ok.token, hash]) {
      expect(written).not.toContain(secret);
    }
    expect(auth.listUsers().every((user) => !("password_hash" in user))).toBe(true);
  });
});
