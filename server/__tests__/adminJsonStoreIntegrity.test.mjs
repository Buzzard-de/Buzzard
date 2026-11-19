import { chmodSync, existsSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { freshServerLib, tempDataDir } from "./support/freshServerLib.mjs";

let lib;

function setup(env = {}) {
  const dataDir = tempDataDir("json");
  lib = freshServerLib({ BUZZARD_DATA_DIR: dataDir, ...env });
  return dataDir;
}

function readStore(dataDir, name) {
  return JSON.parse(readFileSync(path.join(dataDir, name), "utf8"));
}

afterEach(() => {
  lib?.restore();
  lib = null;
  vi.restoreAllMocks();
});

describe("data directory", () => {
  it("keeps automated tests out of server/data unless a directory is configured", () => {
    lib = freshServerLib({ BUZZARD_DATA_DIR: undefined });
    const { resolveDataDir, defaultDataDir, getDataDirInfo } = lib.load("dataDir.js");
    expect(resolveDataDir()).not.toBe(defaultDataDir);
    expect(resolveDataDir().startsWith(defaultDataDir)).toBe(false);
    expect(getDataDirInfo().mode).toBe("test_isolated");
  });

  it("keeps the database and its backups of automated tests out of server/data", () => {
    lib = freshServerLib({ BUZZARD_DB_PATH: undefined, BUZZARD_BACKUP_DIR: undefined });
    const { resolveDbPath, resolveBackupDir, defaultDbPath, defaultBackupDir } = lib.load("dbPaths.js");
    const real = path.dirname(defaultDbPath) + path.sep;
    expect(resolveDbPath()).not.toBe(defaultDbPath);
    expect(resolveDbPath().startsWith(real)).toBe(false);
    expect(resolveBackupDir()).not.toBe(defaultBackupDir);
    expect(resolveBackupDir().startsWith(real)).toBe(false);
  });

  it("uses BUZZARD_DATA_DIR for every admin security store", () => {
    const dataDir = setup();
    lib.load("securityLog.js").logSecurityEvent({ type: "permission_denied", success: false });
    lib.load("audit.js").logAudit({ action: "unit.test", actor: "synthetic" });
    lib.load("automationEngine.js").emit("new_customer", { customerId: "SYN-1" }, { isolate: false });
    lib.load("accountLockout.js").recordFailure("admin", "synthetic@unit.buzzard.test", {});
    expect(readdirSync(dataDir).sort()).toEqual(
      expect.arrayContaining(["account-lockouts.json", "audit-log.json", "automation-events.json", "security-log.json"])
    );
  });
});

describe("atomic JSON writes", () => {
  it("replaces the file in one step and leaves no temporary file", () => {
    const dataDir = setup();
    const { writeJsonAtomic, readJsonArray } = lib.load("jsonFileStore.js");
    const file = path.join(dataDir, "sample.json");
    writeJsonAtomic(file, [{ n: 1 }]);
    const firstInode = statSync(file).ino;
    writeJsonAtomic(file, [{ n: 1 }, { n: 2 }]);
    expect(statSync(file).ino).not.toBe(firstInode);
    expect(readJsonArray(file)).toEqual([{ n: 1 }, { n: 2 }]);
    // Besides the file itself only the previous version remains, no temporary file.
    expect(readdirSync(dataDir).sort()).toEqual(["sample.json", "sample.json.bak"]);
    expect(JSON.parse(readFileSync(`${file}.bak`, "utf8"))).toEqual([{ n: 1 }]);
    expect(statSync(file).mode & 0o777).toBe(0o600);
    expect(statSync(`${file}.bak`).mode & 0o777).toBe(0o600);
  });

  it("keeps the previous content when a write fails", () => {
    const dataDir = setup();
    const { writeJsonAtomic } = lib.load("jsonFileStore.js");
    const file = path.join(dataDir, "sample.json");
    writeJsonAtomic(file, [{ n: 1 }]);
    const circular = [];
    circular.push(circular);
    expect(() => writeJsonAtomic(file, circular)).toThrow();
    expect(JSON.parse(readFileSync(file, "utf8"))).toEqual([{ n: 1 }]);
    expect(readdirSync(dataDir)).toEqual(["sample.json"]);
  });

  it("refuses to write when the directory is read-only instead of truncating the file", () => {
    if (process.getuid?.() === 0) return;
    const dataDir = setup();
    const { writeJsonAtomic } = lib.load("jsonFileStore.js");
    const file = path.join(dataDir, "sample.json");
    writeJsonAtomic(file, [{ n: 1 }]);
    chmodSync(dataDir, 0o500);
    try {
      expect(() => writeJsonAtomic(file, [{ n: 2 }])).toThrow();
      expect(JSON.parse(readFileSync(file, "utf8"))).toEqual([{ n: 1 }]);
    } finally {
      chmodSync(dataDir, 0o700);
    }
  });
});

describe("malformed store files", () => {
  it.each([
    ["security-log.json", (l) => l.load("securityLog.js").logSecurityEvent({ type: "permission_denied", success: false })],
    ["audit-log.json", (l) => l.load("audit.js").logAudit({ action: "unit.test", actor: "synthetic" })],
    ["audit-log.json", (l) => l.load("coreAudit.js").logAudit({ action: "unit.test", actor: "synthetic" })],
    ["automation-events.json", (l) => l.load("automationEngine.js").emit("new_customer", { customerId: "SYN-1" })],
  ])("keeps a copy of an unparseable %s before the next append", (name, append) => {
    const dataDir = setup();
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(console, "log").mockImplementation(() => {});
    const damaged = '[{"id":"history-1"},{"id":"history-2"';
    writeFileSync(path.join(dataDir, name), damaged);

    append(lib);

    const copies = readdirSync(dataDir).filter((entry) => entry.startsWith(`${name}.corrupt-`));
    expect(copies).toHaveLength(1);
    expect(readFileSync(path.join(dataDir, copies[0]), "utf8")).toBe(damaged);
    expect(readStore(dataDir, name)).toHaveLength(1);

    append(lib);
    expect(readdirSync(dataDir).filter((entry) => entry.startsWith(`${name}.corrupt-`))).toHaveLength(1);
    expect(readStore(dataDir, name)).toHaveLength(2);
  });

  it("treats a JSON object where a list is expected as damaged", () => {
    const dataDir = setup();
    vi.spyOn(console, "error").mockImplementation(() => {});
    const { readJsonArray } = lib.load("jsonFileStore.js");
    const file = path.join(dataDir, "audit-log.json");
    writeFileSync(file, '{"not":"a list"}');
    expect(readJsonArray(file)).toEqual([]);
    expect(readdirSync(dataDir).some((entry) => entry.startsWith("audit-log.json.corrupt-"))).toBe(true);
  });

  it("does not replace a damaged users file with the demo seed accounts", () => {
    const dataDir = setup();
    vi.spyOn(console, "error").mockImplementation(() => {});
    const file = path.join(dataDir, "admin-users.json");
    writeFileSync(file, "[{");
    const auth = lib.load("auth.js");
    const seed = JSON.parse(readFileSync(new URL("../../data/buzzard_admin_users.seed.json", import.meta.url), "utf8"));
    const result = auth.login(seed[0].email, seed[0].password, { headers: {}, socket: { remoteAddress: "198.51.100.9" } });
    expect(result.success).toBe(false);
    expect(readFileSync(file, "utf8")).toBe("[{");
  });

  it("returns the fallback for a missing or empty file without creating anything", () => {
    const dataDir = setup();
    const { readJsonArray } = lib.load("jsonFileStore.js");
    expect(readJsonArray(path.join(dataDir, "missing.json"))).toEqual([]);
    writeFileSync(path.join(dataDir, "empty.json"), "");
    expect(readJsonArray(path.join(dataDir, "empty.json"))).toEqual([]);
    expect(readdirSync(dataDir)).toEqual(["empty.json"]);
  });
});

describe("log records", () => {
  it("writes every one of 300 back-to-back security events", () => {
    const dataDir = setup();
    vi.spyOn(console, "log").mockImplementation(() => {});
    const { logSecurityEvent } = lib.load("securityLog.js");
    for (let index = 0; index < 300; index += 1) {
      logSecurityEvent({ type: "permission_denied", success: false, detail: { index } });
    }
    const entries = readStore(dataDir, "security-log.json");
    expect(entries.map((entry) => entry.detail.index)).toEqual(Array.from({ length: 300 }, (_, index) => index));
    expect(new Set(entries.map((entry) => entry.id)).size).toBe(300);
  });

  it("redacts secrets in security event details", () => {
    const dataDir = setup();
    vi.spyOn(console, "log").mockImplementation(() => {});
    const { logSecurityEvent } = lib.load("securityLog.js");
    logSecurityEvent({
      type: "admin_login_failed",
      success: false,
      detail: {
        password: "synthetic-password-value",
        nested: { accessToken: "synthetic-token-value", apiKey: "synthetic-key-value", authorization: "Bearer synthetic" },
        remainingAttempts: 4,
      },
    });
    const raw = readFileSync(path.join(dataDir, "security-log.json"), "utf8");
    expect(raw).not.toMatch(/synthetic-(password|token|key)-value|Bearer synthetic/);
    expect(JSON.parse(raw)[0].detail.remainingAttempts).toBe(4);
  });

  it("gives every security and audit entry an id, a timestamp and a type or action", () => {
    const dataDir = setup();
    vi.spyOn(console, "log").mockImplementation(() => {});
    lib.load("securityLog.js").logSecurityEvent({ type: "session_revoked", success: true, userId: "usr-synthetic" });
    lib.load("audit.js").logAudit({ action: "unit.test", actor: "synthetic", entityId: "E-1" });
    const [security] = readStore(dataDir, "security-log.json");
    const [audit] = readStore(dataDir, "audit-log.json");
    expect(security).toMatchObject({ type: "session_revoked", severity: "INFO", success: true, userId: "usr-synthetic" });
    expect(Number.isNaN(Date.parse(security.timestamp))).toBe(false);
    expect(security.id).toMatch(/^sec-/);
    expect(audit.action).toBe("unit.test");
    expect(Number.isNaN(Date.parse(audit.timestamp || audit.at || audit.createdAt))).toBe(false);
  });

  it("records a repeated automation event again with the same key and never marks it sent", () => {
    const dataDir = setup();
    const engine = lib.load("automationEngine.js");
    engine.emit("new_customer", { customerId: "SYN-42" });
    engine.emit("new_customer", { customerId: "SYN-42" });
    const events = readStore(dataDir, "automation-events.json");
    expect(events).toHaveLength(2);
    expect(events[0].idempotencyKey).toBe(events[1].idempotencyKey);
    expect(events[0].id).not.toBe(events[1].id);
    for (const event of events) {
      expect(event).toMatchObject({ dryRun: true, sent: false, executed: false, providerCalled: false });
    }
    expect(existsSync(path.join(dataDir, "automation-deliveries.json"))).toBe(false);
  });
});
