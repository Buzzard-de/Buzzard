import { spawn, spawnSync } from "node:child_process";
import { createHash, randomBytes } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { fakeRequest, freshServerLib, seedSyntheticAdmins, tempDataDir } from "./support/freshServerLib.mjs";
import { createRequire } from "node:module";
import { ALL_ROLES, startIsolatedApi } from "./support/isolatedApi.mjs";

const require = createRequire(import.meta.url);

/**
 * Integrity of the five JSON stores: admin-users.json, admin-sessions.json,
 * audit-log.json, security-log.json and automation-events.json.
 * Everything here runs on synthetic files in throwaway directories.
 */

const libDir = fileURLToPath(new URL("../lib/", import.meta.url));
const FIVE = ["admin-users.json", "admin-sessions.json", "audit-log.json", "security-log.json", "automation-events.json"];

let lib;

function setup(env = {}) {
  const dataDir = tempDataDir("integrity");
  lib = freshServerLib({ BUZZARD_DATA_DIR: dataDir, BUZZARD_TEST_MODE: "1", ...env });
  return dataDir;
}

const read = (dataDir, name) => JSON.parse(readFileSync(path.join(dataDir, name), "utf8"));
const write = (dataDir, name, value) => writeFileSync(path.join(dataDir, name), typeof value === "string" ? value : JSON.stringify(value, null, 2));
const archiveLines = (dataDir, name) =>
  readdirSync(dataDir)
    .filter((file) => file.startsWith(`${path.parse(name).name}.archive`) && file.endsWith(".jsonl"))
    .sort()
    .flatMap((file) => readFileSync(path.join(dataDir, file), "utf8").split("\n").filter(Boolean).map((line) => JSON.parse(line)));

afterEach(() => {
  lib?.restore();
  lib = null;
  vi.restoreAllMocks();
  vi.useRealTimers();
});

/** Stores as an installation from before this change left them: no chain, raw tokens in the session file. */
function writeLegacyStores(dataDir) {
  const legacyToken = randomBytes(32).toString("hex");
  const liveToken = randomBytes(32).toString("hex");
  const accounts = seedSyntheticAdmins(dataDir, ["administrator", "read_only"]);
  write(dataDir, "admin-sessions.json", [
    {
      token: legacyToken,
      session: { userId: accounts.administrator.id, email: accounts.administrator.email, name: "Synthetic", role: "administrator", expiresAt: Date.now() - 3_600_000, createdAt: "2026-11-17T16:52:15.000Z", ip: "127.0.0.1" },
    },
    {
      token: liveToken,
      session: { userId: accounts.administrator.id, email: accounts.administrator.email, name: "Synthetic", role: "administrator", expiresAt: Date.now() + 3_600_000, createdAt: new Date().toISOString(), ip: "127.0.0.1" },
    },
  ]);
  const audit = Array.from({ length: 12 }, (_, i) => ({ id: `audit-legacy-${i}`, userId: "usr-synthetic", userEmail: "synthetic@unit.buzzard.test", action: "legacy.action", entityType: "product", entityId: `SYN-${i}`, field: null, oldValue: null, newValue: null, timestamp: new Date(Date.UTC(2026, 10, 1, 0, i)).toISOString() }));
  const security = Array.from({ length: 15 }, (_, i) => ({ id: `sec-legacy-${i}`, timestamp: new Date(Date.UTC(2026, 10, 2, 0, i)).toISOString(), type: "admin_login", severity: "INFO", source: "api", success: true, ip: "127.0.0.1", path: "/api/admin/login", userId: "usr-synthetic", email: "synthetic@unit.buzzard.test", role: "administrator", resource: null, status: "ok", detail: null }));
  const events = Array.from({ length: 5 }, (_, i) => ({ id: `evt-legacy-${i}`, type: "new_customer", idempotencyKey: `new_customer:SYN-L${i}`, createdAt: new Date(Date.UTC(2026, 10, 3, 0, i)).toISOString(), status: "dry_run", dryRun: true, sent: false, executed: false, providerCalled: false }));
  write(dataDir, "audit-log.json", audit);
  write(dataDir, "security-log.json", security);
  write(dataDir, "automation-events.json", events);
  return { accounts, legacyToken, liveToken, audit, security, events };
}

describe("record lists (audit log, security log, automation events)", () => {
  it("links every entry to the one before it", () => {
    const dataDir = setup();
    const log = lib.load("securityLog.js");
    for (let i = 0; i < 5; i += 1) log.logSecurityEvent({ type: "permission_denied", success: false, userId: `usr-${i}` });
    const entries = read(dataDir, "security-log.json");
    expect(entries[0].prev).toBeNull();
    for (let i = 1; i < entries.length; i += 1) expect(entries[i].prev).toBe(entries[i - 1].hash);
    expect(lib.load("recordStore.js").verifyChain(entries)).toMatchObject({ ok: true, chained: 5, legacy: 0, brokenAt: null });
  });

  it.each([
    ["a changed field", (entries) => { entries[2].userId = "usr-other"; }, 2, "entry_changed"],
    ["a removed entry", (entries) => { entries.splice(2, 1); }, 2, "link_broken"],
    ["an inserted entry", (entries) => { entries.splice(2, 0, { id: "sec-forged", type: "admin_login", timestamp: new Date().toISOString() }); }, 2, "unchained_entry_after_chain_start"],
    ["two swapped entries", (entries) => { [entries[1], entries[2]] = [entries[2], entries[1]]; }, 1, "link_broken"],
    ["a forged entry with its own hash", (entries) => {
      const forged = { ...entries[3], success: true, status: "ok" };
      entries[3] = forged;
    }, 3, "entry_changed"],
  ])("detects %s", (_label, tamper, brokenAt, reason) => {
    const dataDir = setup();
    const log = lib.load("securityLog.js");
    for (let i = 0; i < 6; i += 1) log.logSecurityEvent({ type: "permission_denied", success: false, userId: `usr-${i}` });
    const entries = read(dataDir, "security-log.json");
    tamper(entries);
    expect(lib.load("recordStore.js").verifyChain(entries)).toMatchObject({ ok: false, brokenAt, reason });
  });

  it("moves entries beyond the limit to the archive instead of dropping them", () => {
    const dataDir = setup();
    const { appendRecord, verifyRecordFile, readArchive } = lib.load("recordStore.js");
    const file = path.join(dataDir, "audit-log.json");
    for (let i = 0; i < 57; i += 1) appendRecord(file, { id: `audit-${i}`, action: "unit.test", timestamp: new Date().toISOString() }, { keep: 20 });
    const working = read(dataDir, "audit-log.json");
    const archived = readArchive(file);
    expect(working).toHaveLength(20);
    expect(archived).toHaveLength(37);
    expect([...archived, ...working].map((entry) => entry.id)).toEqual(Array.from({ length: 57 }, (_, i) => `audit-${i}`));
    expect(verifyRecordFile(file)).toMatchObject({ ok: true, entries: 20, archived: 37 });
    expect(statSync(path.join(dataDir, "audit-log.archive.jsonl")).mode & 0o777).toBe(0o600);
  });

  it("keeps every entry when the three real logs pass their limits", () => {
    const dataDir = setup();
    const log = lib.load("securityLog.js");
    const audit = lib.load("coreAudit.js");
    const engine = lib.load("automationEngine.js");
    // Start close to the limits, as a long-running installation would be.
    write(dataDir, "security-log.json", Array.from({ length: log.MAX_ENTRIES - 3 }, (_, i) => ({ id: `sec-old-${i}`, type: "admin_login", timestamp: "2026-11-01T00:00:00.000Z" })));
    write(dataDir, "audit-log.json", Array.from({ length: audit.MAX_ENTRIES - 3 }, (_, i) => ({ id: `audit-old-${i}`, action: "legacy", timestamp: "2026-11-01T00:00:00.000Z" })));
    write(dataDir, "automation-events.json", Array.from({ length: 1998 }, (_, i) => ({ id: `evt-old-${i}`, type: "new_customer", idempotencyKey: `k${i}`, createdAt: "2026-11-01T00:00:00.000Z" })));
    for (let i = 0; i < 10; i += 1) {
      log.logSecurityEvent({ type: "permission_denied", success: false, userId: `usr-${i}` });
      audit.logAudit({ userId: "usr-synthetic", action: "unit.test", entityType: "product", entityId: `SYN-${i}` });
      engine.emit("new_customer", { customerId: `SYN-NEW-${i}` });
    }
    for (const [name, limit, oldCount] of [["security-log.json", log.MAX_ENTRIES, log.MAX_ENTRIES - 3], ["audit-log.json", audit.MAX_ENTRIES, audit.MAX_ENTRIES - 3], ["automation-events.json", 2000, 1998]]) {
      const working = read(dataDir, name);
      const archived = archiveLines(dataDir, name);
      expect(working, name).toHaveLength(limit);
      expect(archived.length + working.length, name).toBe(oldCount + 10);
      expect(archived[0].id, name).toMatch(/-old-0$/);
      expect(new Set([...archived, ...working].map((entry) => entry.id)).size, name).toBe(oldCount + 10);
    }
  });

  it("leaves an entry in both places, never in neither, when the write after archiving fails", () => {
    const dataDir = setup();
    const store = lib.load("recordStore.js");
    const jsonFileStore = lib.load("jsonFileStore.js");
    const file = path.join(dataDir, "audit-log.json");
    for (let i = 0; i < 5; i += 1) store.appendRecord(file, { id: `audit-${i}`, action: "unit.test", timestamp: new Date().toISOString() }, { keep: 5 });
    const before = readFileSync(file, "utf8");
    const fs = require("node:fs");
    const rename = vi.spyOn(fs, "renameSync").mockImplementation(() => {
      throw Object.assign(new Error("disk full"), { code: "ENOSPC" });
    });
    expect(() => store.appendRecord(file, { id: "audit-5", action: "unit.test", timestamp: new Date().toISOString() }, { keep: 5 })).toThrow(/disk full/);
    rename.mockRestore();
    expect(readFileSync(file, "utf8")).toBe(before);
    expect(readdirSync(dataDir).filter((name) => name.endsWith(".tmp"))).toEqual([]);
    expect(existsSync(`${file}.lock`)).toBe(false);
    // The oldest entry was archived before the failed write and is still in the working file.
    expect(store.readArchive(file).map((entry) => entry.id)).toEqual(["audit-0"]);
    store.appendRecord(file, { id: "audit-5", action: "unit.test", timestamp: new Date().toISOString() }, { keep: 5 });
    expect(store.verifyRecordFile(file).ok).toBe(true);
    const ids = new Set([...store.readArchive(file), ...read(dataDir, "audit-log.json")].map((entry) => entry.id));
    expect([...ids].sort()).toEqual(["audit-0", "audit-1", "audit-2", "audit-3", "audit-4", "audit-5"]);
    expect(jsonFileStore.readJsonArray(file)).toHaveLength(5);
  });

  it("continues a list written before the chain existed without touching the old entries", () => {
    const dataDir = setup();
    const legacy = writeLegacyStores(dataDir);
    lib.load("securityLog.js").logSecurityEvent({ type: "permission_denied", success: false });
    lib.load("coreAudit.js").logAudit({ userId: "usr-synthetic", action: "unit.test" });
    lib.load("audit.js").logAudit({ userId: "usr-synthetic", action: "unit.legacy-writer" });
    lib.load("automationEngine.js").emit("new_customer", { customerId: "SYN-NEW" });
    const { verifyChain } = lib.load("recordStore.js");

    const security = read(dataDir, "security-log.json");
    expect(security.slice(0, 15)).toEqual(legacy.security);
    expect(verifyChain(security)).toMatchObject({ ok: true, legacy: 15, chained: 1 });

    const audit = read(dataDir, "audit-log.json");
    expect(audit.slice(0, 12)).toEqual(legacy.audit);
    expect(verifyChain(audit)).toMatchObject({ ok: true, legacy: 12, chained: 2 });

    const events = read(dataDir, "automation-events.json");
    expect(events.slice(0, 5)).toEqual(legacy.events);
    expect(verifyChain(events)).toMatchObject({ ok: true, legacy: 5, chained: 1 });

    // Changing the last old entry is noticed by the first new one.
    security[14].success = false;
    expect(verifyChain(security)).toMatchObject({ ok: false, brokenAt: 15, reason: "link_broken" });
  });

  it("both audit writers share one file, one lock and one chain", () => {
    const dataDir = setup();
    const core = lib.load("coreAudit.js");
    const legacy = lib.load("audit.js");
    for (let i = 0; i < 20; i += 1) (i % 2 ? core : legacy).logAudit({ userId: "usr-synthetic", action: `unit.${i}` });
    const entries = read(dataDir, "audit-log.json");
    expect(entries.map((entry) => entry.action)).toEqual(Array.from({ length: 20 }, (_, i) => `unit.${i}`));
    expect(lib.load("recordStore.js").verifyChain(entries)).toMatchObject({ ok: true, chained: 20 });
    expect(legacy.listAudit(3).map((entry) => entry.action)).toEqual(["unit.19", "unit.18", "unit.17"]);
  });
});

describe("concurrent writers", () => {
  const WRITERS = 6;
  const PER_WRITER = 40;

  function runWriter(dataDir, index) {
    const script = `
      const lib = ${JSON.stringify(libDir)};
      const log = require(lib + "securityLog.js");
      const core = require(lib + "coreAudit.js");
      const legacy = require(lib + "audit.js");
      const engine = require(lib + "automationEngine.js");
      for (let i = 0; i < ${PER_WRITER}; i += 1) {
        log.logSecurityEvent({ type: "permission_denied", success: false, userId: "w${index}-" + i });
        (i % 2 ? core : legacy).logAudit({ userId: "usr-synthetic", action: "w${index}-" + i });
        engine.emit("new_customer", { customerId: "W${index}-" + i });
      }
    `;
    return new Promise((resolve, reject) => {
      const child = spawn(process.execPath, ["-e", script], {
        env: { ...process.env, BUZZARD_DATA_DIR: dataDir, BUZZARD_TEST_MODE: "1", NODE_ENV: "test" },
        stdio: ["ignore", "ignore", "pipe"],
      });
      let stderr = "";
      child.stderr.on("data", (chunk) => (stderr += chunk));
      child.once("exit", (code) => (code === 0 ? resolve() : reject(new Error(`writer ${index} exited ${code}: ${stderr.slice(-400)}`))));
    });
  }

  it(`loses nothing when ${WRITERS} processes append ${PER_WRITER} entries each to all three lists at once`, async () => {
    const dataDir = tempDataDir("concurrent");
    await Promise.all(Array.from({ length: WRITERS }, (_, index) => runWriter(dataDir, index)));
    lib = freshServerLib({ BUZZARD_DATA_DIR: dataDir });
    const { verifyChain } = lib.load("recordStore.js");
    for (const [name, key] of [["security-log.json", "userId"], ["audit-log.json", "action"], ["automation-events.json", "id"]]) {
      const entries = read(dataDir, name);
      expect(entries, name).toHaveLength(WRITERS * PER_WRITER);
      expect(new Set(entries.map((entry) => entry[key])).size, name).toBe(WRITERS * PER_WRITER);
      expect(verifyChain(entries), name).toMatchObject({ ok: true, chained: WRITERS * PER_WRITER, brokenAt: null });
    }
    expect(readdirSync(dataDir).filter((name) => name.endsWith(".lock") || name.endsWith(".tmp"))).toEqual([]);
  }, 120_000);

  it("keeps every session when several processes sign in at the same time", async () => {
    const dataDir = tempDataDir("concurrent-sessions");
    const accounts = seedSyntheticAdmins(dataDir, ["administrator", "admin", "staff", "read_only"]);
    const script = `
      const auth = require(${JSON.stringify(libDir)} + "auth.js");
      const [email, password] = process.argv.slice(1);
      for (let i = 0; i < 3; i += 1) {
        const result = auth.login(email, password, { headers: {}, socket: { remoteAddress: "198.51.100." + (10 + i) } });
        if (!result.success) { console.error(result.errorKey); process.exit(2); }
      }
    `;
    await Promise.all(
      Object.values(accounts).map(
        (account) =>
          new Promise((resolve, reject) => {
            const child = spawn(process.execPath, ["-e", script, account.email, account.password], {
              env: { ...process.env, BUZZARD_DATA_DIR: dataDir, BUZZARD_TEST_MODE: "1", NODE_ENV: "test" },
              stdio: ["ignore", "ignore", "pipe"],
            });
            let stderr = "";
            child.stderr.on("data", (chunk) => (stderr += chunk));
            child.once("exit", (code) => (code === 0 ? resolve() : reject(new Error(`sign-in writer exited ${code}: ${stderr.slice(-300)}`))));
          })
      )
    );
    const sessions = read(dataDir, "admin-sessions.json");
    expect(sessions).toHaveLength(12);
    expect(new Set(sessions.map((entry) => entry.tokenHash)).size).toBe(12);
    for (const account of Object.values(accounts)) {
      expect(sessions.filter((entry) => entry.session.userId === account.id)).toHaveLength(3);
    }
  }, 120_000);
});

describe("store lock", () => {
  const lockOf = (dataDir, name) => path.join(dataDir, `${name}.lock`);

  it("is never taken from a process that is still running", () => {
    const dataDir = setup({ BUZZARD_STORE_LOCK_WAIT_MS: "300" });
    const { withFileLock, writeJsonAtomic } = lib.load("jsonFileStore.js");
    const file = path.join(dataDir, "audit-log.json");
    writeJsonAtomic(file, [{ id: "audit-0", action: "kept", timestamp: new Date().toISOString() }]);
    // Held by this very process under another identity: alive, so it must be respected.
    const fs = require("node:fs");
    const stat = fs.readFileSync(`/proc/${process.ppid}/stat`, "utf8");
    const start = stat.slice(stat.lastIndexOf(")") + 2).split(" ")[19];
    const holder = JSON.stringify({ pid: process.ppid, host: require("node:os").hostname(), start, at: Date.now() - 60_000, id: "other" });
    writeFileSync(lockOf(dataDir, "audit-log.json"), holder);
    const before = readFileSync(file, "utf8");
    let ran = false;
    expect(() => withFileLock(file, () => { ran = true; })).toThrow(/could not lock audit-log\.json/);
    expect(ran).toBe(false);
    expect(() => lib.load("coreAudit.js").logAudit({ userId: "usr-synthetic", action: "unit.test" })).toThrow(/nothing was written/);
    expect(readFileSync(file, "utf8")).toBe(before);
    expect(readFileSync(lockOf(dataDir, "audit-log.json"), "utf8")).toBe(holder);
  });

  it.each([
    ["a process that no longer exists", (os) => JSON.stringify({ pid: 2 ** 22 - 3, host: os.hostname(), start: "1", at: Date.now(), id: "dead" })],
    ["a reused process id", (os) => JSON.stringify({ pid: process.ppid, host: os.hostname(), start: "1", at: Date.now(), id: "reused" })],
  ])("is cleared when it belongs to %s", (_label, content) => {
    const dataDir = setup({ BUZZARD_STORE_LOCK_WAIT_MS: "300" });
    const { withFileLock } = lib.load("jsonFileStore.js");
    const file = path.join(dataDir, "audit-log.json");
    writeFileSync(lockOf(dataDir, "audit-log.json"), content(require("node:os")));
    expect(withFileLock(file, () => "ran")).toBe("ran");
    expect(readdirSync(dataDir).filter((name) => name.includes(".lock"))).toEqual([]);
  });

  it("is released after an error inside the locked section and can be taken again", () => {
    const dataDir = setup();
    const { withFileLock } = lib.load("jsonFileStore.js");
    const file = path.join(dataDir, "security-log.json");
    expect(() => withFileLock(file, () => { throw new Error("inside"); })).toThrow("inside");
    expect(existsSync(lockOf(dataDir, "security-log.json"))).toBe(false);
    expect(withFileLock(file, () => withFileLock(file, () => "nested"))).toBe("nested");
    expect(readdirSync(dataDir).filter((name) => name.includes(".lock"))).toEqual([]);
  });

  it("does not remove a lock that another writer holds by now", () => {
    const dataDir = setup();
    const { withFileLock } = lib.load("jsonFileStore.js");
    const file = path.join(dataDir, "security-log.json");
    const other = JSON.stringify({ pid: process.pid, host: "elsewhere", at: Date.now(), id: "other" });
    withFileLock(file, () => {
      writeFileSync(lockOf(dataDir, "security-log.json"), other);
    });
    expect(readFileSync(lockOf(dataDir, "security-log.json"), "utf8")).toBe(other);
  });
});

describe("damaged files", () => {
  const DAMAGE = [
    ["cut off in the middle", (raw) => raw.slice(0, Math.floor(raw.length / 2))],
    ["not JSON at all", () => "\u0000\u0001 not json \uFFFD"],
    ["the wrong container", () => '{"entries": []}'],
    ["a bare value", () => "null"],
  ];

  describe.each(FIVE)("%s", (name) => {
    it.each(DAMAGE)("keeps the original when it is %s, and uses the last good version", (_label, damage) => {
      const dataDir = setup();
      writeLegacyStores(dataDir);
      const jsonFileStore = lib.load("jsonFileStore.js");
      const file = path.join(dataDir, name);
      const good = read(dataDir, name);
      // One regular write so that a previous version exists, as it does after any real change.
      jsonFileStore.writeJsonAtomic(file, good);
      const damaged = damage(readFileSync(file, "utf8"));
      writeFileSync(file, damaged);
      vi.spyOn(console, "error").mockImplementation(() => {});

      const state = jsonFileStore.inspectJsonFile(file, { validate: Array.isArray });
      expect(state.state).toBe("restored");
      expect(state.value).toEqual(good);
      const copies = readdirSync(dataDir).filter((entry) => entry.startsWith(`${name}.corrupt-`));
      expect(copies).toHaveLength(1);
      expect(readFileSync(path.join(dataDir, copies[0]), "utf8")).toBe(damaged);
      expect(lib.load("storeHealth.js").describeStore(dataDir, name)).toMatchObject({ state: "restored", healthy: false, corruptCopies: 1 });
    });

    it("is reported as unusable, never as empty, when no good version exists", () => {
      const dataDir = setup();
      write(dataDir, name, "{ broken");
      vi.spyOn(console, "error").mockImplementation(() => {});
      const report = lib.load("storeHealth.js").describeStore(dataDir, name);
      expect(report).toMatchObject({ state: "corrupt", healthy: false, corruptCopies: 1, entries: 0 });
      expect(readFileSync(path.join(dataDir, name), "utf8")).toBe("{ broken");
    });
  });

  it("a damaged log is continued without losing what was in it", () => {
    const dataDir = setup();
    const legacy = writeLegacyStores(dataDir);
    const log = lib.load("securityLog.js");
    log.logSecurityEvent({ type: "permission_denied", success: false });
    const raw = readFileSync(path.join(dataDir, "security-log.json"), "utf8");
    writeFileSync(path.join(dataDir, "security-log.json"), raw.slice(0, raw.length - 40));
    vi.spyOn(console, "error").mockImplementation(() => {});
    log.logSecurityEvent({ type: "admin_logout", success: true });
    const entries = read(dataDir, "security-log.json");
    // The previous good version (15 old entries) plus the new entry; the damaged file is kept beside it.
    expect(entries.slice(0, 15)).toEqual(legacy.security);
    expect(entries.at(-1).type).toBe("admin_logout");
    const copies = readdirSync(dataDir).filter((entry) => entry.startsWith("security-log.json.corrupt-"));
    expect(copies).toHaveLength(1);
    expect(readFileSync(path.join(dataDir, copies[0]), "utf8")).toContain("permission_denied");
  });

  it("refuses to write a list whose damaged original could not be kept", () => {
    const dataDir = setup();
    write(dataDir, "audit-log.json", "{ broken");
    const fs = require("node:fs");
    const original = fs.writeFileSync;
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(fs, "writeFileSync").mockImplementation((target, ...rest) => {
      if (String(target).includes(".corrupt-")) throw Object.assign(new Error("read-only"), { code: "EROFS" });
      return original(target, ...rest);
    });
    expect(() => lib.load("coreAudit.js").logAudit({ userId: "usr-synthetic", action: "unit.test" })).toThrow(/refusing to overwrite/);
    expect(readFileSync(path.join(dataDir, "audit-log.json"), "utf8")).toBe("{ broken");
  });

  it("does not create accounts over a damaged users file, in development or production", () => {
    for (const env of [{ NODE_ENV: "test" }, { NODE_ENV: "production", ADMIN_EMAIL: "owner@unit.buzzard.test", ADMIN_PASSWORD: `Unit-${randomBytes(12).toString("base64url")}-7q` }]) {
      const dataDir = setup(env);
      write(dataDir, "admin-users.json", '[{"id": "usr-1", "email": ');
      vi.spyOn(console, "error").mockImplementation(() => {});
      const auth = lib.load("auth.js");
      expect(auth.login("owner@unit.buzzard.test", "anything", fakeRequest()).success).toBe(false);
      expect(auth.adminBootstrapStatus()).toEqual({ state: "store_unreadable" });
      expect(readFileSync(path.join(dataDir, "admin-users.json"), "utf8")).toBe('[{"id": "usr-1", "email": ');
      lib.restore();
      lib = null;
    }
  });

  it("treats a damaged session file as no sessions and keeps the file for inspection", () => {
    const dataDir = setup();
    const accounts = seedSyntheticAdmins(dataDir, ["administrator"]);
    const auth = lib.load("auth.js");
    const first = auth.login(accounts.administrator.email, accounts.administrator.password, fakeRequest());
    expect(auth.getSession(first.token)).toBeTruthy();
    writeFileSync(path.join(dataDir, "admin-sessions.json"), "[{ broken");
    writeFileSync(path.join(dataDir, "admin-sessions.json.bak"), "also broken");
    vi.spyOn(console, "error").mockImplementation(() => {});
    expect(auth.getSession(first.token)).toBeNull();
    expect(readdirSync(dataDir).some((name) => name.startsWith("admin-sessions.json.corrupt-"))).toBe(true);
  });

  it.each([
    ["damaged", (file) => writeFileSync(file, "[{ broken")],
    ["removed", (file) => rmSync(file)],
    ["emptied", (file) => writeFileSync(file, "")],
  ])("does not bring an ended session back from the previous version when the session file is %s", (_label, damage) => {
    const dataDir = setup();
    const accounts = seedSyntheticAdmins(dataDir, ["administrator"]);
    const auth = lib.load("auth.js");
    const login = auth.login(accounts.administrator.email, accounts.administrator.password, fakeRequest());
    auth.logout(login.token, fakeRequest());
    // The previous version still lists the session that the last write ended.
    expect(readFileSync(path.join(dataDir, "admin-sessions.json.bak"), "utf8")).toContain(login.session?.sessionId || "tokenHash");
    expect(read(dataDir, "admin-sessions.json")).toEqual([]);
    damage(path.join(dataDir, "admin-sessions.json"));
    vi.spyOn(console, "error").mockImplementation(() => {});
    lib.restore();
    lib = freshServerLib({ BUZZARD_DATA_DIR: dataDir, BUZZARD_TEST_MODE: "1" });
    expect(lib.load("auth.js").getSession(login.token)).toBeNull();
  });

  it.each([
    ["removed", (file) => rmSync(file)],
    ["emptied", (file) => writeFileSync(file, "")],
  ])("uses the previous version instead of starting empty when a store file is %s", (_label, damage) => {
    for (const env of [{ NODE_ENV: "test" }, { NODE_ENV: "production", ADMIN_EMAIL: "owner@unit.buzzard.test", ADMIN_PASSWORD: `Unit-${randomBytes(12).toString("base64url")}-7q` }]) {
      const dataDir = setup(env);
      const legacy = writeLegacyStores(dataDir);
      const jsonFileStore = lib.load("jsonFileStore.js");
      for (const name of ["admin-users.json", "audit-log.json", "security-log.json", "automation-events.json"]) {
        jsonFileStore.writeJsonAtomic(path.join(dataDir, name), read(dataDir, name));
        damage(path.join(dataDir, name));
      }
      vi.spyOn(console, "error").mockImplementation(() => {});
      const auth = lib.load("auth.js");
      // Accounts: the stored ones still sign in; no first-administrator account is created over them.
      expect(auth.adminBootstrapStatus()).toEqual({ state: "existing" });
      expect(auth.login(legacy.accounts.administrator.email, legacy.accounts.administrator.password, fakeRequest()).success).toBe(true);
      expect(auth.login("owner@unit.buzzard.test", env.ADMIN_PASSWORD || "x", fakeRequest()).success).toBe(false);
      // Logs: the next entry continues the old list.
      lib.load("coreAudit.js").logAudit({ userId: "usr-synthetic", action: "unit.after" });
      lib.load("automationEngine.js").emit("new_customer", { customerId: "SYN-AFTER" });
      expect(read(dataDir, "audit-log.json").slice(0, 12)).toEqual(legacy.audit);
      expect(read(dataDir, "security-log.json").slice(0, 15)).toEqual(legacy.security);
      expect(read(dataDir, "automation-events.json").slice(0, 5)).toEqual(legacy.events);
      lib.restore();
      lib = null;
      vi.restoreAllMocks();
    }
  });
});

describe("history from an earlier installation", () => {
  it("keeps old log entries, accounts and live sessions, and never writes a raw token again", () => {
    const dataDir = setup();
    const legacy = writeLegacyStores(dataDir);
    const usersBefore = read(dataDir, "admin-users.json");
    const auth = lib.load("auth.js");

    // The session that was still valid keeps working after the change of format.
    expect(auth.getSession(legacy.liveToken)).toMatchObject({ userId: legacy.accounts.administrator.id, role: "administrator" });
    expect(auth.getSession(legacy.legacyToken)).toBeNull();

    const login = auth.login(legacy.accounts.read_only.email, legacy.accounts.read_only.password, fakeRequest());
    expect(login.success).toBe(true);

    expect(read(dataDir, "admin-users.json")).toEqual(usersBefore);
    const sessions = read(dataDir, "admin-sessions.json");
    expect(sessions).toHaveLength(2);
    for (const entry of sessions) {
      expect(entry.token).toBeUndefined();
      expect(entry.tokenHash).toMatch(/^[0-9a-f]{64}$/);
    }
    const everything = readdirSync(dataDir)
      .filter((name) => !name.endsWith(".bak"))
      .map((name) => readFileSync(path.join(dataDir, name), "utf8"))
      .join("\n");
    for (const token of [legacy.legacyToken, legacy.liveToken, login.token]) expect(everything).not.toContain(token);
  });

  it("records an expired session in the session archive before it leaves the store, without its token", () => {
    const dataDir = setup();
    const legacy = writeLegacyStores(dataDir);
    const auth = lib.load("auth.js");
    auth.login(legacy.accounts.read_only.email, legacy.accounts.read_only.password, fakeRequest());
    const archived = archiveLines(dataDir, "admin-sessions.json");
    expect(archived).toHaveLength(1);
    expect(archived[0]).toMatchObject({
      userId: legacy.accounts.administrator.id,
      role: "administrator",
      createdAt: "2026-11-17T16:52:15.000Z",
      ip: "127.0.0.1",
      reason: "expired",
    });
    expect(Object.keys(archived[0]).sort()).toEqual(["createdAt", "expiresAt", "ip", "reason", "removedAt", "role", "sessionId", "userId"]);
    expect(JSON.stringify(archived)).not.toContain(legacy.legacyToken);
    // A second change does not archive it again.
    auth.login(legacy.accounts.read_only.email, legacy.accounts.read_only.password, fakeRequest());
    expect(archiveLines(dataDir, "admin-sessions.json")).toHaveLength(1);
  });

  it("the one remaining copy of a raw token, the previous-version file, is replaced by the next write", () => {
    const dataDir = setup();
    const legacy = writeLegacyStores(dataDir);
    const auth = lib.load("auth.js");
    auth.login(legacy.accounts.read_only.email, legacy.accounts.read_only.password, fakeRequest());
    expect(readFileSync(path.join(dataDir, "admin-sessions.json.bak"), "utf8")).toContain(legacy.liveToken);
    auth.login(legacy.accounts.read_only.email, legacy.accounts.read_only.password, fakeRequest());
    const bak = readFileSync(path.join(dataDir, "admin-sessions.json.bak"), "utf8");
    expect(bak).not.toContain(legacy.liveToken);
    expect(bak).not.toContain(legacy.legacyToken);
  });

  it("does not start a store empty when its file is missing but accounts exist", () => {
    const dataDir = setup({ NODE_ENV: "production", ADMIN_EMAIL: undefined, ADMIN_PASSWORD: undefined });
    vi.spyOn(console, "error").mockImplementation(() => {});
    const auth = lib.load("auth.js");
    expect(auth.adminBootstrapStatus()).toEqual({ state: "missing_credentials" });
    expect(auth.login("owner@unit.buzzard.test", "anything", fakeRequest()).success).toBe(false);
    expect(existsSync(path.join(dataDir, "admin-users.json"))).toBe(false);
  });
});

describe("shape of the stores", () => {
  it("accepts what the server itself writes", () => {
    const dataDir = setup();
    const accounts = seedSyntheticAdmins(dataDir, ["administrator", "read_only"]);
    const auth = lib.load("auth.js");
    auth.login(accounts.administrator.email, accounts.administrator.password, fakeRequest());
    auth.login(accounts.read_only.email, "wrong-value", fakeRequest());
    lib.load("coreAudit.js").logAudit({ userId: "usr-synthetic", action: "unit.test" });
    lib.load("automationEngine.js").emit("new_customer", { customerId: "SYN-1" });
    const health = lib.load("storeHealth.js").describeStores();
    expect(health.healthy, JSON.stringify(health.stores.filter((store) => !store.healthy))).toBe(true);
    for (const name of FIVE) {
      const report = health.stores.find((store) => store.store === name);
      expect(report, name).toMatchObject({ state: "ok", invalidEntries: 0, healthy: true, worldReadable: name === "admin-users.json" ? expect.any(Boolean) : false });
      expect(report.entries, name).toBeGreaterThan(0);
    }
  });

  it.each([
    ["admin-users.json", { id: "usr-1", email: "a@unit.buzzard.test", role: "administrator", password_hash: "scrypt$x" }, true],
    ["admin-users.json", { id: "usr-1", email: "a@unit.buzzard.test", role: "administrator", password_hash: "scrypt$x", password: "plain" }, false],
    ["admin-users.json", { id: "usr-1", email: "a@unit.buzzard.test", role: "owner", password_hash: "scrypt$x" }, false],
    ["admin-users.json", { id: "usr-1", email: "not-an-address", role: "administrator", password_hash: "scrypt$x" }, false],
    ["admin-users.json", { id: "usr-1", email: "a@unit.buzzard.test", role: "administrator" }, false],
    ["admin-sessions.json", { tokenHash: "a".repeat(64), session: { userId: "usr-1", role: "staff", expiresAt: 1 } }, true],
    ["admin-sessions.json", { token: "a".repeat(64), session: { userId: "usr-1", role: "staff", expiresAt: 1 } }, false],
    ["admin-sessions.json", { tokenHash: "a".repeat(64), token: "b".repeat(64), session: { userId: "usr-1", role: "staff", expiresAt: 1 } }, false],
    ["admin-sessions.json", { tokenHash: "a".repeat(64), session: { userId: "usr-1", role: "staff" } }, false],
    ["audit-log.json", { id: "audit-1", action: "x", timestamp: "2026-11-18T00:00:00.000Z" }, true],
    ["audit-log.json", { id: "audit-1", timestamp: "2026-11-18T00:00:00.000Z" }, false],
    ["audit-log.json", { id: "audit-1", action: "x", timestamp: "yesterday" }, false],
    ["security-log.json", { id: "sec-1", type: "admin_login", timestamp: "2026-11-18T00:00:00.000Z" }, true],
    ["security-log.json", { id: "sec-1", timestamp: "2026-11-18T00:00:00.000Z" }, false],
    ["security-log.json", "text", false],
    ["automation-events.json", { id: "e1", type: "new_customer", createdAt: "2026-11-18T00:00:00.000Z", sent: false }, true],
    ["automation-events.json", { id: "e1", type: "new_customer", createdAt: "2026-11-18T00:00:00.000Z", sent: true }, false],
    ["automation-events.json", { id: "e1", type: "new_customer", createdAt: "2026-11-18T00:00:00.000Z", providerCalled: true }, false],
    ["automation-events.json", { id: "e1", type: "new_customer", createdAt: "2026-11-18T00:00:00.000Z", executed: true }, false],
  ])("%s: %j → valid %s", (name, entry, valid) => {
    setup();
    const { validateStore } = lib.load("storeHealth.js");
    expect(validateStore(name, [entry])).toMatchObject({ ok: valid, entries: 1, invalidEntries: valid ? 0 : 1 });
  });

  it("rejects the wrong container for every store", () => {
    setup();
    const { validateStore } = lib.load("storeHealth.js");
    for (const name of FIVE) expect(validateStore(name, { entries: [] })).toMatchObject({ ok: false, reason: "wrong_container" });
    expect(validateStore("something-else.json", [])).toMatchObject({ ok: false, reason: "unknown_store" });
  });

  it("counts entries that do not fit and keeps them in the file", () => {
    const dataDir = setup();
    const accounts = seedSyntheticAdmins(dataDir, ["administrator"]);
    const users = read(dataDir, "admin-users.json");
    users.push({ id: "usr-odd", email: "odd@unit.buzzard.test", role: "owner", password_hash: "x" }, "text");
    write(dataDir, "admin-users.json", users);
    vi.spyOn(console, "error").mockImplementation(() => {});
    const auth = lib.load("auth.js");
    expect(lib.load("storeHealth.js").describeStore(dataDir, "admin-users.json")).toMatchObject({ state: "ok", entries: 3, invalidEntries: 2, healthy: false });
    // The unusable entries cannot sign in and are not removed by a later change to the file.
    expect(auth.login("odd@unit.buzzard.test", "x", fakeRequest()).success).toBe(false);
    const next = `Unit-${randomBytes(12).toString("base64url")}-7q`;
    const session = auth.getSession(auth.login(accounts.administrator.email, accounts.administrator.password, fakeRequest()).token);
    expect(auth.changePassword(session, accounts.administrator.password, next, fakeRequest()).success).toBe(true);
    const after = read(dataDir, "admin-users.json");
    expect(after).toHaveLength(3);
    expect(after[1]).toEqual({ id: "usr-odd", email: "odd@unit.buzzard.test", role: "owner", password_hash: "x" });
    expect(after[2]).toBe("text");
  });
});

describe("sensitive values", () => {
  it("never reach the security log, whatever key or text carries them", () => {
    const dataDir = setup();
    const token = randomBytes(32).toString("hex");
    const jwt = `eyJ${randomBytes(12).toString("base64url")}.eyJ${randomBytes(18).toString("base64url")}.${randomBytes(20).toString("base64url")}`;
    lib.load("securityLog.js").logSecurityEvent({
      type: "permission_denied",
      success: false,
      path: `/api/admin/orders?token=${token}`,
      email: "Some.Customer@Unit.Buzzard.Test",
      detail: {
        password: "Plain-Text-Value-1",
        newPassword: "Plain-Text-Value-2",
        apiKey: "sk-synthetic-key",
        sessionToken: token,
        cookie: "sid=abc",
        signature: "t=1,v1=abcdef",
        totpCode: "123456",
        note: `header was Bearer ${token}`,
        forwarded: `value ${jwt} seen`,
        stored: `scrypt$16384$8$1$${randomBytes(16).toString("hex")}$${randomBytes(32).toString("hex")}`,
        nested: { deep: { clientSecret: "synthetic-secret", plain: token } },
        sessionId: "sess-0123456789abcdef",
        reason: "kept",
      },
    });
    const raw = readFileSync(path.join(dataDir, "security-log.json"), "utf8");
    for (const secret of [token, jwt, "Plain-Text-Value", "sk-synthetic-key", "sid=abc", "v1=abcdef", "123456\"", "synthetic-secret", "some.customer"]) {
      expect(raw.toLowerCase()).not.toContain(secret.toLowerCase());
    }
    const [entry] = JSON.parse(raw);
    expect(entry.path).toBe("/api/admin/orders");
    expect(entry.email).toBe("so***@unit.buzzard.test");
    expect(entry.emailRef).toMatch(/^[0-9a-f]{16}$/);
    expect(entry.detail.reason).toBe("kept");
    expect(entry.detail.sessionId).toBe("sess-0123456789abcdef");
  });

  it("does not keep something that is not an address in the e-mail field", () => {
    const dataDir = setup();
    lib.load("securityLog.js").logSecurityEvent({ type: "admin_login_failed", success: false, email: "Typed-My-Password-Here-1" });
    const raw = readFileSync(path.join(dataDir, "security-log.json"), "utf8");
    expect(raw).not.toContain("Typed-My-Password");
    expect(JSON.parse(raw)[0]).toMatchObject({ email: "[not an address]", emailRef: null });
  });

  it("finds an account's entries by its full address although only the masked form is stored", () => {
    setup();
    const log = lib.load("securityLog.js");
    log.logSecurityEvent({ type: "admin_login_failed", success: false, email: "first@unit.buzzard.test" });
    log.logSecurityEvent({ type: "admin_login_failed", success: false, email: "fiona@unit.buzzard.test" });
    expect(log.querySecurityEvents({ user: "first@unit.buzzard.test" }).events).toHaveLength(1);
    expect(log.querySecurityEvents({ user: "fi***@unit" }).events).toHaveLength(2);
  });

  it("never reach the audit log through changed values or metadata", () => {
    const dataDir = setup();
    const token = randomBytes(32).toString("hex");
    const audit = lib.load("coreAudit.js");
    audit.logAudit({ userId: "usr-synthetic", action: "user.update", field: "password", oldValue: "Old-Plain-1", newValue: "New-Plain-2" });
    audit.logAudit({ userId: "usr-synthetic", action: "integration.update", field: "config", oldValue: { apiKey: "old-key", url: "https://example.invalid" }, newValue: { apiKey: "new-key", url: "https://example.invalid/v2" }, metadata: { authorization: `Bearer ${token}`, note: "kept" } });
    lib.load("audit.js").logAudit({ userId: "usr-synthetic", action: "user.update", field: "api_key", oldValue: "k1", newValue: "k2" });
    const raw = readFileSync(path.join(dataDir, "audit-log.json"), "utf8");
    for (const secret of ["Old-Plain-1", "New-Plain-2", "old-key", "new-key", token, '"k1"', '"k2"']) expect(raw).not.toContain(secret);
    const entries = JSON.parse(raw);
    expect(entries[0]).toMatchObject({ field: "password", oldValue: "[redacted]", newValue: "[redacted]" });
    expect(entries[1].newValue).toEqual({ apiKey: "[redacted]", url: "https://example.invalid/v2" });
    expect(entries[1].metadata).toEqual({ authorization: "[redacted]", note: "kept" });
  });

  it("the account and session files hold no password and no usable token", () => {
    const dataDir = setup();
    const accounts = seedSyntheticAdmins(dataDir, ["administrator"]);
    const auth = lib.load("auth.js");
    const login = auth.login(accounts.administrator.email, accounts.administrator.password, fakeRequest());
    const files = readdirSync(dataDir).map((name) => readFileSync(path.join(dataDir, name), "utf8")).join("\n");
    expect(files).not.toContain(accounts.administrator.password);
    expect(files).not.toContain(login.token);
    for (const user of read(dataDir, "admin-users.json")) {
      expect(user.password).toBeUndefined();
      expect(user.password_hash).toMatch(/^scrypt[:$]/);
    }
  });
});

describe("repeated events", () => {
  it("writes one entry for a limiter that keeps firing and reports the rest as a count", () => {
    const dataDir = setup();
    vi.useFakeTimers({ now: new Date("2026-11-18T08:00:00Z") });
    const log = lib.load("securityLog.js");
    for (let i = 0; i < 250; i += 1) log.logSecurityEvent({ type: "api_rate_limited", success: false, ip: "198.51.100.9", path: "/api/products" });
    log.logSecurityEvent({ type: "api_rate_limited", success: false, ip: "198.51.100.10", path: "/api/products" });
    expect(read(dataDir, "security-log.json")).toHaveLength(2);

    vi.setSystemTime(new Date("2026-11-18T08:01:05Z"));
    log.flushCoalesced();
    const entries = read(dataDir, "security-log.json");
    expect(entries).toHaveLength(3);
    expect(entries[2]).toMatchObject({ type: "api_rate_limited", ip: "198.51.100.9", detail: { repeated: 249, windowSeconds: 60 } });
    expect(lib.load("recordStore.js").verifyChain(entries).ok).toBe(true);
  });

  it("still writes every event that is not a limiter event", () => {
    const dataDir = setup();
    const log = lib.load("securityLog.js");
    for (let i = 0; i < 40; i += 1) log.logSecurityEvent({ type: "admin_login_failed", success: false, ip: "198.51.100.9", email: "a@unit.buzzard.test" });
    for (let i = 0; i < 40; i += 1) log.logSecurityEvent({ type: "permission_denied", success: false, ip: "198.51.100.9", path: "/api/admin/users" });
    expect(read(dataDir, "security-log.json")).toHaveLength(80);
  });

  it("answers a repeated automation event that names its key from the record", () => {
    const dataDir = setup();
    const engine = lib.load("automationEngine.js");
    const first = engine.emit("payment_confirmed", { orderNumber: "BZ-SYN-1" }, { idempotencyKey: "pay:BZ-SYN-1" });
    const second = engine.emit("payment_confirmed", { orderNumber: "BZ-SYN-1" }, { idempotencyKey: "pay:BZ-SYN-1" });
    expect(first.duplicate).toBe(false);
    expect(second).toMatchObject({ duplicate: true, sent: false, executed: false, dryRun: true, providerCalled: false });
    expect(second.event.id).toBe(first.event.id);
    expect(read(dataDir, "automation-events.json")).toHaveLength(1);
    // Another order is another event.
    expect(engine.emit("payment_confirmed", { orderNumber: "BZ-SYN-2" }, { idempotencyKey: "pay:BZ-SYN-2" }).duplicate).toBe(false);
    expect(read(dataDir, "automation-events.json")).toHaveLength(2);
  });

  it("records an event whose key is only derived, marked as a repetition of the earlier one", () => {
    const dataDir = setup();
    const engine = lib.load("automationEngine.js");
    const first = engine.emit("low_stock", { productId: "SYN-9" });
    const second = engine.emit("low_stock", { productId: "SYN-9" });
    expect(second.duplicate).toBe(true);
    const events = read(dataDir, "automation-events.json");
    expect(events).toHaveLength(2);
    expect(events[1].duplicateOf).toBe(first.event.id);
    expect(events[0].duplicateOf).toBeUndefined();
    for (const event of events) expect(event).toMatchObject({ sent: false, executed: false, providerCalled: false, dryRun: true });
  });
});

describe("second-factor store", () => {
  it("is written atomically with owner-only permissions", () => {
    const dataDir = setup();
    const twoFactor = lib.load("adminTwoFactor.js");
    const { generateTotp } = lib.load("totp.js");
    const setupData = twoFactor.beginSetup("a@unit.buzzard.test");
    const code = typeof generateTotp === "function" ? generateTotp(setupData.secret) : null;
    if (!code) return;
    expect(twoFactor.completeSetup("a@unit.buzzard.test", code)).toEqual({ ok: true });
    expect(statSync(path.join(dataDir, "admin-2fa.json")).mode & 0o777).toBe(0o600);
    expect(readdirSync(dataDir).filter((name) => name.endsWith(".tmp") || name.endsWith(".lock"))).toEqual([]);
    expect(twoFactor.isEnabled("a@unit.buzzard.test")).toBe(true);
  });

  it("an unreadable file stops sign-in instead of switching the second factor off", () => {
    const dataDir = setup();
    const accounts = seedSyntheticAdmins(dataDir, ["administrator"]);
    write(dataDir, "admin-2fa.json", "{ broken");
    vi.spyOn(console, "error").mockImplementation(() => {});
    const auth = lib.load("auth.js");
    const right = auth.login(accounts.administrator.email, accounts.administrator.password, fakeRequest());
    const wrong = auth.login(accounts.administrator.email, "wrong-value", fakeRequest());
    // Same answer for a right and a wrong password.
    expect(right).toEqual({ success: false, errorKey: "admin.auth.unavailable" });
    expect(wrong).toEqual(right);
    expect(readFileSync(path.join(dataDir, "admin-2fa.json"), "utf8")).toBe("{ broken");
    expect(() => lib.load("adminTwoFactor.js").beginSetup("a@unit.buzzard.test")).not.toThrow();
    expect(lib.load("storeHealth.js").describeStore(dataDir, "admin-2fa.json")).toMatchObject({ state: "corrupt", healthy: false });
  });
});

describe("store state over HTTP", () => {
  let api;
  let legacy;

  beforeAll(async () => {
    api = await startIsolatedApi({
      env: { BUZZARD_TEST_MODE: "1" },
      prepare(dataDir) {
        legacy = {
          audit: [{ id: "audit-legacy-0", action: "legacy.action", userId: "usr-synthetic", timestamp: "2026-11-01T00:00:00.000Z" }],
          security: [{ id: "sec-legacy-0", type: "admin_login", success: true, timestamp: "2026-11-02T00:00:00.000Z" }],
        };
        write(dataDir, "audit-log.json", legacy.audit);
        write(dataDir, "security-log.json", legacy.security);
      },
    });
  }, 90_000);
  afterAll(async () => api?.stop());

  it("is not available without the security permission", async () => {
    expect((await api.request("GET", "/api/admin/security/stores")).status).toBe(401);
    const { can } = require("../lib/rbac.js");
    const allowed = [];
    for (const role of ALL_ROLES) {
      const res = await api.request("GET", "/api/admin/security/stores", { token: await api.login(role) });
      expect(res.status, role).toBe(can(role, "security.read") ? 200 : 403);
      if (res.status === 200) allowed.push(role);
    }
    expect(allowed.sort()).toEqual(ALL_ROLES.filter((role) => can(role, "security.read")).sort());
    expect(allowed).toContain("administrator");
    expect(allowed).not.toContain("staff");
  });

  it("reports states and counts, no content and no host path", async () => {
    const token = await api.login("administrator");
    await api.request("POST", "/api/admin/logout", { token });
    const res = await api.request("GET", "/api/admin/security/stores", { token: await api.login("administrator") });
    expect(res.status).toBe(200);
    expect(res.json.healthy).toBe(true);
    expect(res.json.stores.map((store) => store.store)).toEqual([...FIVE, "admin-2fa.json"]);
    const byName = Object.fromEntries(res.json.stores.map((store) => [store.store, store]));
    expect(byName["admin-users.json"]).toMatchObject({ state: "ok", entries: 7, invalidEntries: 0 });
    expect(byName["admin-sessions.json"]).toMatchObject({ state: "ok", invalidEntries: 0, mode: "600" });
    expect(byName["security-log.json"].chain).toMatchObject({ ok: true, legacy: 1 });
    expect(byName["security-log.json"].chain.chained).toBeGreaterThan(0);
    expect(byName["automation-events.json"].state).toBe("missing");
    expect(res.text).not.toContain(api.root);
    expect(res.text).not.toMatch(/unit\.buzzard\.test|tokenHash|password/);
  });

  it("the running server keeps old entries and continues the lists", async () => {
    const security = api.readStore("security-log.json");
    expect(security[0]).toEqual(legacy.security[0]);
    expect(security.length).toBeGreaterThan(1);
    expect(security.at(-1).hash).toMatch(/^[0-9a-f]{64}$/);
    expect(security.at(-1).requestId).toMatch(/^req_[0-9a-f]{16}$/);
    for (const entry of security.slice(1)) {
      if (entry.email) expect(entry.email).toMatch(/^.{1,2}\*\*\*@/);
    }
  });

  it("no store file on disk contains a session token handed out by the server", async () => {
    const tokens = [];
    for (const role of ["administrator", "admin", "read_only"]) tokens.push(await api.login(role));
    const files = readdirSync(api.dataDir).map((name) => readFileSync(path.join(api.dataDir, name), "utf8")).join("\n");
    for (const token of tokens) expect(files).not.toContain(token);
    expect(api.output()).not.toContain(tokens[0]);
    // Everything the server wrote for the admin stores is owner-only. (admin-users.json was seeded by the test.)
    // security-log.json was put there by the test with default permissions and is tightened by the first write.
    const written = readdirSync(api.dataDir).filter((name) => /^(admin-sessions|security-log)\./.test(name));
    expect(written).toEqual(expect.arrayContaining(["admin-sessions.json", "admin-sessions.json.bak", "security-log.json", "security-log.json.bak"]));
    for (const name of written) expect(statSync(path.join(api.dataDir, name)).mode & 0o077, name).toBe(0);
  });
});

describe("storage location", () => {
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

  async function refusal(env, pattern) {
    api = await startIsolatedApi({ env: { ...production, ...env }, seed: false, expectExit: true });
    const exit = await Promise.race([api.exited, new Promise((resolve) => setTimeout(() => resolve("still running"), 45_000))]);
    expect(exit, api.output().slice(-600)).not.toBe("still running");
    expect(exit.code).toBe(1);
    expect(api.output()).toMatch(pattern);
    expect(api.output()).not.toContain(jwtSecret);
    expect(api.output()).not.toContain(adminPassword);
  }

  const migrateScript = fileURLToPath(new URL("../../scripts/migrate-json-stores.mjs", import.meta.url));
  function migrate(from, to, ...flags) {
    const run = spawnSync(process.execPath, [migrateScript, "--from", from, "--to", to, ...flags], { encoding: "utf8" });
    return { status: run.status, output: `${run.stdout}\n${run.stderr}` };
  }
  const snapshot = (dir) =>
    Object.fromEntries(readdirSync(dir).sort().map((name) => [name, createHash("sha256").update(readFileSync(path.join(dir, name))).digest("hex")]));

  function sourceWithHistory() {
    const dataDir = setup();
    const legacy = writeLegacyStores(dataDir);
    lib.load("securityLog.js").logSecurityEvent({ type: "permission_denied", success: false });
    lib.load("coreAudit.js").logAudit({ userId: "usr-synthetic", action: "unit.test" });
    lib.load("auth.js").login(legacy.accounts.read_only.email, legacy.accounts.read_only.password, fakeRequest());
    // Everything else the server keeps in the same directory.
    writeFileSync(path.join(dataDir, "customers.json"), JSON.stringify([{ id: "cus-synthetic-1" }]));
    writeFileSync(path.join(dataDir, "orders.json"), "[]");
    writeFileSync(path.join(dataDir, "submissions.json"), "[]");
    return { dataDir, legacy };
  }

  describe("migration tool", () => {
    it("reports and writes nothing without --apply", () => {
      const { dataDir } = sourceWithHistory();
      const target = path.join(tempDataDir("target"), "state");
      const before = snapshot(dataDir);
      const result = migrate(dataDir, target);
      expect(result.status, result.output).toBe(0);
      expect(result.output).toMatch(/dry run: nothing was written/);
      expect(existsSync(target)).toBe(false);
      expect(snapshot(dataDir)).toEqual(before);
    });

    it("copies the stores with their backups and archives, verified by hash, owner-only, source untouched", () => {
      const { dataDir, legacy } = sourceWithHistory();
      const target = path.join(tempDataDir("target"), "state");
      const before = snapshot(dataDir);
      const result = migrate(dataDir, target, "--apply");
      expect(result.status, result.output).toBe(0);
      expect(snapshot(dataDir)).toEqual(before);
      const after = snapshot(target);
      const manifest = Object.keys(after).find((name) => name.endsWith(".manifest.json"));
      expect(manifest).toBeTruthy();
      for (const name of [...FIVE, "security-log.json.bak", "admin-sessions.json.bak", "admin-sessions.archive.jsonl"]) {
        expect(after[name], name).toBe(before[name]);
      }
      // BUZZARD_DATA_DIR moves every data file, so the customer and order files come along.
      for (const name of ["customers.json", "orders.json", "submissions.json"]) expect(after[name], name).toBe(before[name]);
      expect(Object.keys(after).filter((name) => name !== manifest).sort()).toEqual(Object.keys(before).sort());
      expect(statSync(target).mode & 0o777).toBe(0o700);
      for (const name of Object.keys(after)) expect(statSync(path.join(target, name)).mode & 0o777, name).toBe(0o600);
      // The report names files and hashes, never content.
      expect(result.output).not.toContain(legacy.accounts.read_only.email);
      expect(result.output).not.toContain(legacy.liveToken);
      expect(readFileSync(path.join(target, manifest), "utf8")).not.toContain("password_hash");
    });

    it("leaves the database, directories and working files behind and says so", () => {
      const { dataDir } = sourceWithHistory();
      writeFileSync(path.join(dataDir, "buzzard.db"), "synthetic, not a database");
      writeFileSync(path.join(dataDir, "buzzard.db-wal"), "synthetic");
      writeFileSync(path.join(dataDir, "build-info.json"), "{}");
      writeFileSync(path.join(dataDir, ".audit-log.json.123.abcdef.tmp"), "[");
      mkdirSync(path.join(dataDir, "backups"));
      const target = path.join(tempDataDir("target"), "state");
      const result = migrate(dataDir, target, "--apply");
      expect(result.status, result.output).toBe(0);
      const copied = readdirSync(target);
      for (const name of ["buzzard.db", "buzzard.db-wal", "build-info.json", ".audit-log.json.123.abcdef.tmp", "backups"]) {
        expect(copied, name).not.toContain(name);
      }
      const report = JSON.parse(result.output.slice(result.output.indexOf("{"), result.output.lastIndexOf("}") + 1));
      const reasons = Object.fromEntries(report.notCopied.map((entry) => [entry.name, entry.reason]));
      expect(reasons["buzzard.db"]).toMatch(/BUZZARD_DB_PATH/);
      expect(reasons["buzzard.db-wal"]).toMatch(/database/);
      expect(reasons.backups).toMatch(/directory/);
      expect(reasons["build-info.json"]).toMatch(/build artefact/);
      expect(reasons[".audit-log.json.123.abcdef.tmp"]).toMatch(/temporary/);
      expect(copied).toContain("customers.json");
    });

    it("refuses a source in which any data file is unreadable, not only an administrator store", () => {
      const { dataDir } = sourceWithHistory();
      writeFileSync(path.join(dataDir, "customers.json"), "[{ broken");
      const target = path.join(tempDataDir("target"), "state");
      const result = migrate(dataDir, target, "--apply");
      expect(result.status).toBe(1);
      expect(result.output).toMatch(/not valid JSON: customers\.json/);
      expect(existsSync(target)).toBe(false);
    });

    it("stops before copying anything when the target already holds a store", () => {
      const { dataDir } = sourceWithHistory();
      const target = path.join(tempDataDir("target"), "state");
      mkdirSync(target, { recursive: true });
      writeFileSync(path.join(target, "admin-users.json"), "[]");
      const result = migrate(dataDir, target, "--apply");
      expect(result.status).toBe(1);
      expect(result.output).toMatch(/target already has: admin-users\.json — nothing was copied/);
      expect(readdirSync(target)).toEqual(["admin-users.json"]);
      expect(readFileSync(path.join(target, "admin-users.json"), "utf8")).toBe("[]");
    });

    it("refuses a source with an unreadable store or a store in use", () => {
      const { dataDir } = sourceWithHistory();
      const target = path.join(tempDataDir("target"), "state");
      writeFileSync(path.join(dataDir, "audit-log.json.lock"), "{}");
      expect(migrate(dataDir, target, "--apply").output).toMatch(/a store is locked/);
      rmSync(path.join(dataDir, "audit-log.json.lock"));
      writeFileSync(path.join(dataDir, "audit-log.json"), "{ broken");
      const result = migrate(dataDir, target, "--apply");
      expect(result.status).toBe(1);
      expect(result.output).toMatch(/not valid JSON: audit-log\.json/);
      expect(existsSync(target)).toBe(false);
    });

    it("refuses the same or nested directories", () => {
      const { dataDir } = sourceWithHistory();
      expect(migrate(dataDir, dataDir, "--apply").status).toBe(1);
      expect(migrate(dataDir, path.join(dataDir, "state"), "--apply").status).toBe(1);
      expect(existsSync(path.join(dataDir, "state"))).toBe(false);
    });
  });

  it("production does not start without a configured data directory", async () => {
    await refusal({ BUZZARD_DATA_DIR: undefined }, /BUZZARD_DATA_DIR must point to persistent storage/);
  }, 60_000);

  it("production does not start when the data directory cannot be used", async () => {
    const blocker = path.join(tempDataDir("blocked"), "a-file");
    writeFileSync(blocker, "x");
    await refusal({ BUZZARD_DATA_DIR: path.join(blocker, "state") }, /BUZZARD_DATA_DIR cannot be used/);
  }, 60_000);

  it("stores copied to a new directory are picked up complete, with history and working sign-in", async () => {
    // First location: an installation with history.
    const first = await startIsolatedApi({ env: { BUZZARD_TEST_MODE: "1" } });
    const token = await first.login("administrator");
    await first.request("GET", "/api/admin/users", { token: await first.login("read_only") });
    await first.request("POST", "/api/admin/logout", { token });
    const before = Object.fromEntries(["admin-users.json", "security-log.json", "admin-sessions.json"].map((name) => [name, first.readStore(name)]));
    const accounts = first.accounts;
    await first.stop();

    // Second location: the plan's copy step, then a start that reads from there.
    const target = path.join(tempDataDir("migrated"), "state");
    const sourceBefore = snapshot(first.dataDir);
    const result = migrate(first.dataDir, target, "--apply");
    expect(result.status, result.output).toBe(0);
    expect(snapshot(first.dataDir)).toEqual(sourceBefore);
    api = await startIsolatedApi({ env: { BUZZARD_TEST_MODE: "1", BUZZARD_DATA_DIR: target }, seed: false });
    const login = await api.request("POST", "/api/admin/login", { body: { email: accounts.administrator.email, password: accounts.administrator.password } });
    expect(login.status).toBe(200);
    const stores = await api.request("GET", "/api/admin/security/stores", { token: login.json.token });
    expect(stores.json.healthy).toBe(true);
    const after = (name) => JSON.parse(readFileSync(path.join(target, name), "utf8"));
    expect(after("admin-users.json")).toEqual(before["admin-users.json"]);
    expect(after("security-log.json").slice(0, before["security-log.json"].length)).toEqual(before["security-log.json"]);
    lib = freshServerLib({});
    expect(lib.load("recordStore.js").verifyChain(after("security-log.json")).ok).toBe(true);
    // The original directory is untouched by the second server.
    expect(JSON.parse(readFileSync(path.join(first.dataDir, "security-log.json"), "utf8"))).toEqual(before["security-log.json"]);
  }, 120_000);
});
