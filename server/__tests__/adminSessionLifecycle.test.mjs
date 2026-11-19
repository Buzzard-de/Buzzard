import crypto from "node:crypto";
import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { fakeRequest, freshServerLib, seedSyntheticAdmins, tempDataDir } from "./support/freshServerLib.mjs";

const ROLES = ["administrator", "admin", "catalog_manager", "read_only"];
const sha256 = (value) => crypto.createHash("sha256").update(value).digest("hex");

let lib;
let dataDir;
let accounts;

function setup(env = {}) {
  dataDir = tempDataDir("lifecycle");
  accounts = seedSyntheticAdmins(dataDir, ROLES);
  lib = freshServerLib({ BUZZARD_DATA_DIR: dataDir, BUZZARD_TEST_MODE: "1", ...env });
  vi.spyOn(console, "log").mockImplementation(() => {});
  return lib.load("auth.js");
}

function loginAs(auth, role, ip = "198.51.100.7") {
  const account = accounts[role];
  const result = auth.login(account.email, account.password, fakeRequest(ip));
  expect(result.success, `login ${role}`).toBe(true);
  return result.token;
}

const sessionsFile = () => path.join(dataDir, "admin-sessions.json");
const usersFile = () => path.join(dataDir, "admin-users.json");
const readSessions = () => JSON.parse(readFileSync(sessionsFile(), "utf8"));
const securityLog = () => JSON.parse(readFileSync(path.join(dataDir, "security-log.json"), "utf8"));

function editUsers(mutate) {
  const users = JSON.parse(readFileSync(usersFile(), "utf8"));
  mutate(users);
  writeFileSync(usersFile(), JSON.stringify(users, null, 2));
}

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  lib?.restore();
  lib = null;
});

describe("token storage", () => {
  it("stores only the SHA-256 of the token, in a private file", () => {
    const auth = setup();
    const token = loginAs(auth, "administrator");
    const raw = readFileSync(sessionsFile(), "utf8");
    expect(raw).not.toContain(token);
    const [entry] = JSON.parse(raw);
    expect(Object.keys(entry).sort()).toEqual(["session", "tokenHash"]);
    expect(entry.tokenHash).toBe(sha256(token));
    expect(statSync(sessionsFile()).mode & 0o777).toBe(0o600);
    for (const name of readdirSync(dataDir)) {
      expect(readFileSync(path.join(dataDir, name), "utf8"), name).not.toContain(token);
    }
  });

  it("keeps sessions from a file written before hashing and drops the clear token on the next write", () => {
    const auth = setup();
    const legacyToken = crypto.randomBytes(32).toString("hex");
    const admin = accounts.administrator;
    writeFileSync(
      sessionsFile(),
      JSON.stringify([
        {
          token: legacyToken,
          session: { userId: admin.id, email: admin.email, name: admin.name, role: "administrator", expiresAt: Date.now() + 3_600_000, createdAt: new Date().toISOString() },
        },
      ])
    );
    expect(auth.getSession(legacyToken)).toMatchObject({ userId: admin.id });
    loginAs(auth, "read_only");
    const raw = readFileSync(sessionsFile(), "utf8");
    expect(raw).not.toContain(legacyToken);
    expect(JSON.parse(raw).map((entry) => entry.tokenHash)).toContain(sha256(legacyToken));
    expect(auth.getSession(legacyToken)).toMatchObject({ userId: admin.id });
  });

  it("does not show any part of a token in the session list", () => {
    const auth = setup();
    const token = loginAs(auth, "administrator");
    const other = loginAs(auth, "administrator", "198.51.100.8");
    const rows = auth.listActiveSessions(null, { currentToken: token });
    const serialized = JSON.stringify(rows);
    for (const secret of [token, other, token.slice(0, 8), sha256(token), sha256(token).slice(0, 16)]) {
      expect(serialized).not.toContain(secret);
    }
    expect(rows.every((row) => !("tokenPreview" in row) && !("tokenHash" in row) && !("cred" in row))).toBe(true);
    expect(rows.filter((row) => row.current)).toHaveLength(1);
    expect(rows.find((row) => row.current).sessionId).toBe(auth.getSession(token).sessionId);
  });

  it("does not accept a token, a token prefix or a token hash as a session id for revocation", () => {
    const auth = setup();
    const token = loginAs(auth, "administrator");
    for (const candidate of [token, token.slice(0, 16), sha256(token), sha256(token).slice(0, 16), "", null, undefined, {}]) {
      expect(auth.revokeSession(candidate, { revokedBy: "test" })).toBe(false);
    }
    expect(auth.getSession(token)).not.toBeNull();
  });
});

describe("session creation", () => {
  it("never adopts a token chosen by the client", () => {
    const auth = setup();
    const chosen = "c".repeat(64);
    const admin = accounts.administrator;
    const result = auth.login(admin.email, admin.password, fakeRequest("198.51.100.7", { authorization: `Bearer ${chosen}` }));
    expect(result.token).not.toBe(chosen);
    expect(auth.getSession(chosen)).toBeNull();
    expect(auth.getSession(result.token)).not.toBeNull();
  });

  it("gives a second login its own session and keeps the first", () => {
    const auth = setup();
    const first = loginAs(auth, "administrator");
    const second = loginAs(auth, "administrator", "198.51.100.8");
    expect(first).not.toBe(second);
    expect(auth.getSession(first).sessionId).not.toBe(auth.getSession(second).sessionId);
    auth.logout(first, fakeRequest());
    expect(auth.getSession(first)).toBeNull();
    expect(auth.getSession(second)).not.toBeNull();
  });

  it("keeps at most ten sessions per account and ends the oldest first", () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-11-18T08:00:00.000Z"));
    const auth = setup();
    const tokens = [];
    for (let index = 0; index < 12; index += 1) {
      vi.setSystemTime(Date.now() + 1000);
      tokens.push(loginAs(auth, "administrator"));
    }
    expect(auth.listActiveSessions(accounts.administrator.id)).toHaveLength(auth.MAX_SESSIONS_PER_USER);
    expect(tokens.slice(0, 2).map((token) => auth.getSession(token))).toEqual([null, null]);
    expect(tokens.slice(2).every((token) => auth.getSession(token) !== null)).toBe(true);
    // Another account is not affected by this account's limit.
    const other = loginAs(auth, "read_only");
    expect(auth.getSession(other)).not.toBeNull();
    expect(auth.listActiveSessions(accounts.administrator.id)).toHaveLength(10);
  });

  it.each([
    ["an empty value", ""],
    ["a short value", "abc"],
    ["63 hex characters", "a".repeat(63)],
    ["65 hex characters", "a".repeat(65)],
    ["upper-case hex", "A".repeat(64)],
    ["non-hex characters", "g".repeat(64)],
    ["a number", 12345],
    ["an object", { token: "x" }],
    ["an array", ["a".repeat(64)]],
    ["null", null],
  ])("treats %s as no session", (_label, candidate) => {
    const auth = setup();
    loginAs(auth, "administrator");
    expect(auth.getSession(candidate)).toBeNull();
  });
});

describe("expiry", () => {
  it("ends a session after eight hours and removes it from the file and the list", () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-11-18T08:00:00.000Z"));
    const auth = setup();
    const token = loginAs(auth, "administrator");
    vi.setSystemTime(Date.now() + auth.SESSION_TTL_MS - 1000);
    expect(auth.getSession(token)).not.toBeNull();
    const later = loginAs(auth, "read_only");
    vi.setSystemTime(Date.now() + 2000);
    expect(auth.getSession(token)).toBeNull();
    expect(auth.getSession(later)).not.toBeNull();
    expect(auth.listActiveSessions().map((row) => row.userId)).toEqual([accounts.read_only.id]);
    expect(readSessions().map((row) => row.session.userId)).toEqual([accounts.read_only.id]);
  });

  it("does not extend a session when it is used", () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-11-18T08:00:00.000Z"));
    const auth = setup();
    const token = loginAs(auth, "administrator");
    const expiresAt = auth.getSession(token).expiresAt;
    vi.setSystemTime(Date.now() + 4 * 3_600_000);
    expect(auth.getSession(token).expiresAt).toBe(expiresAt);
    expect(expiresAt).toBe(new Date("2026-11-18T08:00:00.000Z").getTime() + 8 * 3_600_000);
  });

  it("refuses a stored session whose expiry was tampered with to a non-number", () => {
    const auth = setup();
    const token = loginAs(auth, "administrator");
    const rows = readSessions();
    rows[0].session.expiresAt = "never";
    writeFileSync(sessionsFile(), JSON.stringify(rows));
    expect(auth.getSession(token)).toBeNull();
  });
});

describe("logout", () => {
  it("ends the session, records who logged out and can be repeated", () => {
    const auth = setup();
    const token = loginAs(auth, "administrator");
    expect(auth.logout(token, fakeRequest())).toBe(true);
    expect(auth.logout(token, fakeRequest())).toBe(false);
    expect(auth.logout(token, fakeRequest())).toBe(false);
    expect(auth.getSession(token)).toBeNull();
    const logouts = securityLog().filter((entry) => entry.type === "admin_logout");
    expect(logouts).toHaveLength(1);
    expect(logouts[0]).toMatchObject({ userId: accounts.administrator.id, role: "administrator" });
  });

  it.each([[null], [undefined], [""], ["not-a-token"], ["f".repeat(64)]])("ignores logout with %s", (candidate) => {
    const auth = setup();
    const token = loginAs(auth, "administrator");
    expect(auth.logout(candidate, fakeRequest())).toBe(false);
    expect(auth.getSession(token)).not.toBeNull();
    expect(securityLog().filter((entry) => entry.type === "admin_logout")).toHaveLength(0);
  });
});

describe("sessions follow the account", () => {
  it("ends every session of an account whose password hash changed", () => {
    const auth = setup();
    const admin = loginAs(auth, "administrator");
    const target = loginAs(auth, "read_only");
    const { hashPassword } = lib.load("password.js");
    editUsers((users) => {
      users.find((user) => user.id === accounts.read_only.id).password_hash = hashPassword("Another-Value-2026-x");
    });
    expect(auth.getSession(target)).toBeNull();
    expect(auth.getSession(admin)).not.toBeNull();
    const entry = securityLog().find((row) => row.type === "session_invalidated");
    expect(entry).toMatchObject({ userId: accounts.read_only.id, detail: { reason: "password_changed" } });
    expect(readSessions().map((row) => row.session.userId)).toEqual([accounts.administrator.id]);
  });

  it("ends every session of an account whose role changed", () => {
    const auth = setup();
    const target = loginAs(auth, "catalog_manager");
    const second = loginAs(auth, "catalog_manager", "198.51.100.9");
    editUsers((users) => {
      users.find((user) => user.id === accounts.catalog_manager.id).role = "administrator";
    });
    expect(auth.getSession(target)).toBeNull();
    expect(auth.getSession(second)).toBeNull();
    expect(securityLog().filter((row) => row.type === "session_invalidated").map((row) => row.detail.reason)).toEqual([
      "role_changed",
      "role_changed",
    ]);
    // The account can sign in again and then holds the new role.
    expect(auth.getSession(loginAs(auth, "catalog_manager")).role).toBe("administrator");
  });

  it("ends the sessions of an account that was removed", () => {
    const auth = setup();
    const target = loginAs(auth, "read_only");
    editUsers((users) => users.splice(users.findIndex((user) => user.id === accounts.read_only.id), 1));
    expect(auth.getSession(target)).toBeNull();
    expect(securityLog().find((row) => row.type === "session_invalidated").detail.reason).toBe("account_removed");
  });

  it("ends all sessions when the users file becomes unreadable and keeps the file", () => {
    const auth = setup();
    vi.spyOn(console, "error").mockImplementation(() => {});
    const token = loginAs(auth, "administrator");
    writeFileSync(usersFile(), "[{");
    expect(auth.getSession(token)).toBeNull();
    expect(readFileSync(usersFile(), "utf8")).toBe("[{");
  });

  it("ignores an account entry with an unknown role instead of granting anything", () => {
    const auth = setup();
    vi.spyOn(console, "error").mockImplementation(() => {});
    editUsers((users) => {
      users.find((user) => user.id === accounts.read_only.id).role = "root";
    });
    const account = accounts.read_only;
    expect(auth.login(account.email, account.password, fakeRequest()).success).toBe(false);
  });
});

describe("password change", () => {
  const next = "Fresh-Lifecycle-Value-83";

  it("ends every session of the account, returns a new one and switches the password", () => {
    const auth = setup();
    const first = loginAs(auth, "admin");
    const second = loginAs(auth, "admin", "198.51.100.8");
    const bystander = loginAs(auth, "read_only");
    const result = auth.changePassword(auth.getSession(first), accounts.admin.password, next, fakeRequest());
    expect(result.success).toBe(true);
    expect(result.token).toMatch(/^[0-9a-f]{64}$/);
    expect([first, second].map((token) => auth.getSession(token))).toEqual([null, null]);
    expect(auth.getSession(result.token)).toMatchObject({ userId: accounts.admin.id });
    expect(auth.getSession(bystander)).not.toBeNull();
    expect(auth.login(accounts.admin.email, accounts.admin.password, fakeRequest()).success).toBe(false);
    expect(auth.login(accounts.admin.email, next, fakeRequest()).success).toBe(true);
    const written = readdirSync(dataDir).map((name) => readFileSync(path.join(dataDir, name), "utf8")).join("\n");
    expect(written).not.toContain(next);
    expect(securityLog().some((row) => row.type === "admin_password_changed" && row.userId === accounts.admin.id)).toBe(true);
  });

  it("requires the current password and locks after five wrong attempts", () => {
    const auth = setup();
    const token = loginAs(auth, "admin");
    const session = auth.getSession(token);
    const results = [];
    for (let attempt = 0; attempt < 6; attempt += 1) {
      results.push(auth.changePassword(session, "Wrong-Current-Value", next, fakeRequest()).status);
    }
    expect(results).toEqual([401, 401, 401, 401, 401, 429]);
    expect(auth.changePassword(session, accounts.admin.password, next, fakeRequest()).status).toBe(429);
    expect(auth.getSession(token)).not.toBeNull();
    expect(auth.login(accounts.admin.email, accounts.admin.password, fakeRequest()).success).toBe(true);
  });

  it.each([
    ["Short-1x", "admin.password.weak"],
    ["onlylowercaseabc", "admin.password.weak"],
    [12345678901234, "admin.password.weak"],
    [undefined, "admin.password.weak"],
  ])("refuses the new password %s", (candidate, errorKey) => {
    const auth = setup();
    const token = loginAs(auth, "admin");
    const result = auth.changePassword(auth.getSession(token), accounts.admin.password, candidate, fakeRequest());
    expect(result).toMatchObject({ success: false, status: 400, errorKey });
    expect(auth.getSession(token)).not.toBeNull();
  });

  it("refuses the same password again", () => {
    const auth = setup();
    const token = loginAs(auth, "admin");
    const strong = "Initial-Lifecycle-Value-12";
    const changed = auth.changePassword(auth.getSession(token), accounts.admin.password, strong, fakeRequest());
    const again = auth.changePassword(auth.getSession(changed.token), strong, strong, fakeRequest());
    expect(again).toMatchObject({ success: false, status: 400, errorKey: "admin.password.unchanged" });
  });
});

describe("role change", () => {
  it("lets an administrator change another account's role and ends that account's sessions", () => {
    const auth = setup();
    const admin = auth.getSession(loginAs(auth, "administrator"));
    const target = loginAs(auth, "read_only");
    const result = auth.changeUserRole(admin, accounts.read_only.id, "catalog_manager", fakeRequest());
    expect(result).toMatchObject({ success: true, changed: true, previousRole: "read_only", user: { role: "catalog_manager" } });
    expect(auth.getSession(target)).toBeNull();
    expect(auth.getSession(loginAs(auth, "read_only")).role).toBe("catalog_manager");
    expect(securityLog().some((row) => row.type === "admin_role_changed" && row.detail.to === "catalog_manager")).toBe(true);
  });

  it("refuses to change one's own role", () => {
    const auth = setup();
    const token = loginAs(auth, "administrator");
    const result = auth.changeUserRole(auth.getSession(token), accounts.administrator.id, "read_only", fakeRequest());
    expect(result).toMatchObject({ success: false, status: 403, errorKey: "admin.users.ownRole" });
    expect(auth.getSession(token).role).toBe("administrator");
  });

  it("refuses a role above the actor's own and records the attempt", () => {
    const auth = setup();
    const admin = auth.getSession(loginAs(auth, "admin"));
    for (const role of ["administrator", "super_admin", "catalog_manager", "order_manager"]) {
      const result = auth.changeUserRole(admin, accounts.read_only.id, role, fakeRequest());
      expect(result, role).toMatchObject({ success: false, status: 403, errorKey: "admin.users.roleAboveOwn" });
    }
    expect(auth.changeUserRole(admin, accounts.read_only.id, "staff", fakeRequest()).success).toBe(true);
    expect(securityLog().filter((row) => row.type === "privilege_escalation_attempt")).toHaveLength(4);
  });

  it("does not let a lower role demote an administrator", () => {
    const auth = setup();
    const admin = auth.getSession(loginAs(auth, "admin"));
    const result = auth.changeUserRole(admin, accounts.administrator.id, "staff", fakeRequest());
    expect(result).toMatchObject({ success: false, status: 403, errorKey: "admin.users.roleAboveOwn" });
  });

  it.each(["read_only", "catalog_manager"])("refuses %s, which has no users.write", (role) => {
    const auth = setup();
    const actor = auth.getSession(loginAs(auth, role));
    const result = auth.changeUserRole(actor, accounts.admin.id, "staff", fakeRequest());
    expect(result).toMatchObject({ success: false, status: 403, errorKey: "admin.auth.forbidden" });
  });

  it("keeps the last administrator", () => {
    const auth = setup();
    editUsers((users) => {
      users.push({ ...users.find((user) => user.id === accounts.administrator.id), id: "usr-synthetic-second", email: "second@unit.buzzard.test" });
    });
    const admin = auth.getSession(loginAs(auth, "administrator"));
    expect(auth.changeUserRole(admin, "usr-synthetic-second", "staff", fakeRequest()).success).toBe(true);
    // Only the acting administrator is left with full rights; it cannot demote itself either.
    expect(auth.changeUserRole(admin, accounts.administrator.id, "staff", fakeRequest()).errorKey).toBe("admin.users.ownRole");
    expect(auth.loadUsers().filter((user) => user.role === "administrator")).toHaveLength(1);
  });

  it("answers unknown roles and unknown accounts without changing anything", () => {
    const auth = setup();
    const admin = auth.getSession(loginAs(auth, "administrator"));
    const before = readFileSync(usersFile(), "utf8");
    expect(auth.changeUserRole(admin, accounts.read_only.id, "root", fakeRequest())).toMatchObject({ status: 400, errorKey: "admin.users.unknownRole" });
    expect(auth.changeUserRole(admin, accounts.read_only.id, "__proto__", fakeRequest())).toMatchObject({ status: 400 });
    expect(auth.changeUserRole(admin, "usr-missing", "staff", fakeRequest())).toMatchObject({ status: 404, errorKey: "admin.users.notFound" });
    expect(readFileSync(usersFile(), "utf8")).toBe(before);
  });
});

describe("several API processes on the same data", () => {
  function secondInstance() {
    const second = freshServerLib({});
    return second.load("auth.js");
  }

  it("a session created by one process is valid in the other", () => {
    const first = setup();
    const second = secondInstance();
    const token = loginAs(first, "administrator");
    expect(second.getSession(token)).toMatchObject({ userId: accounts.administrator.id });
  });

  it("a revocation, logout or expiry in one process ends the session in the other", () => {
    const first = setup();
    const second = secondInstance();
    const revoked = loginAs(first, "administrator");
    const loggedOut = loginAs(first, "read_only");
    expect(second.revokeSession(second.getSession(revoked).sessionId, { revokedBy: "second" })).toBe(true);
    second.logout(loggedOut, fakeRequest());
    expect(first.getSession(revoked)).toBeNull();
    expect(first.getSession(loggedOut)).toBeNull();
  });

  it("logins in both processes do not overwrite each other", () => {
    const first = setup();
    const second = secondInstance();
    const tokens = [];
    for (let index = 0; index < 4; index += 1) {
      tokens.push(loginAs(index % 2 ? second : first, index < 2 ? "administrator" : "read_only", `198.51.100.${index}`));
    }
    for (const token of tokens) {
      expect(first.getSession(token)).not.toBeNull();
      expect(second.getSession(token)).not.toBeNull();
    }
    expect(readSessions()).toHaveLength(4);
  });
});

describe("two-factor challenge", () => {
  it("is refused when the account was removed while the challenge was open", () => {
    const auth = setup();
    const twoFactor = lib.load("adminTwoFactor.js");
    const account = accounts.read_only;
    const challenge = twoFactor.createChallenge({ id: account.id, email: account.email, name: account.name, role: "read_only" });
    editUsers((users) => users.splice(users.findIndex((user) => user.id === account.id), 1));
    expect(auth.verifyTwoFactor(challenge, "000000", fakeRequest())).toEqual({ success: false, errorKey: "admin.2fa.invalidCode" });
    expect(existsSync(sessionsFile()) ? readSessions() : []).toEqual([]);
  });

  it("cannot be replayed", () => {
    const auth = setup();
    const twoFactor = lib.load("adminTwoFactor.js");
    const account = accounts.read_only;
    const challenge = twoFactor.createChallenge({ id: account.id, email: account.email, name: account.name, role: "read_only" });
    expect(auth.verifyTwoFactor(challenge, "000000", fakeRequest()).errorKey).toBe("admin.2fa.invalidCode");
    expect(auth.verifyTwoFactor(challenge, "000000", fakeRequest()).errorKey).toBe("admin.2fa.challengeExpired");
  });
});
