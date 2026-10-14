import { describe, it, expect, afterAll } from "vitest";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const Database = require("better-sqlite3");
const { assertRestoreAllowed } = require("../lib/software/restoreGuard");

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const scratch = path.join(root, "server", "data", "test-scratch", "phase11-backup");
const sourceDb = path.join(scratch, "source.db");
const backupDir = path.join(scratch, "backups");
const restoredDb = path.join(scratch, "restored.db");
const defaultDb = path.join(root, "server", "data", "buzzard.db");
const MARKER = "phase11-integrity-token";

function resetScratch() {
  fs.rmSync(scratch, { recursive: true, force: true });
  fs.mkdirSync(backupDir, { recursive: true });
}

function writeMarker(dbPath) {
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  const db = new Database(dbPath);
  db.exec("CREATE TABLE IF NOT EXISTS phase11_marker (id TEXT PRIMARY KEY, value TEXT NOT NULL)");
  db.prepare("INSERT OR REPLACE INTO phase11_marker(id, value) VALUES (?, ?)").run("p11", MARKER);
  db.close();
}

describe("backup and restore integrity (isolated local fixtures)", () => {
  afterAll(() => {
    fs.rmSync(scratch, { recursive: true, force: true });
  });

  it("does not target the default local database or /var/data", () => {
    expect(sourceDb).not.toBe(defaultDb);
    expect(restoredDb).not.toBe(defaultDb);
    expect(sourceDb.includes("/var/data")).toBe(false);
    expect(restoredDb.startsWith("/tmp")).toBe(false);
    expect(() => assertRestoreAllowed("/var/data/buzzard.db", { NODE_ENV: "production" })).toThrow(
      /production target/,
    );
  });

  it("backup PRAGMA is ok and restore recovers the marker across processes", () => {
    resetScratch();
    writeMarker(sourceDb);

    const backup = spawnSync(process.execPath, ["scripts/db-backup.mjs"], {
      cwd: root,
      encoding: "utf8",
      env: {
        ...process.env,
        BUZZARD_DB_PATH: sourceDb,
        BUZZARD_BACKUP_DIR: backupDir,
        NODE_ENV: "test",
      },
    });
    expect(backup.status, backup.stderr).toBe(0);
    const payload = JSON.parse(backup.stdout);
    expect(payload.ok).toBe(true);
    expect(payload.meta.integrityCheck).toBe("ok");
    expect(payload.meta.sourcePath).toBe(sourceDb);
    expect(payload.backup.startsWith(backupDir)).toBe(true);
    expect(payload.backup).not.toBe(defaultDb);
    expect(fs.readFileSync(payload.backup).equals(fs.readFileSync(sourceDb))).toBe(true);

    const restore = spawnSync(
      process.execPath,
      ["scripts/restore-db.mjs", "--from", payload.backup],
      {
        cwd: root,
        encoding: "utf8",
        env: {
          ...process.env,
          BUZZARD_DB_PATH: restoredDb,
          NODE_ENV: "test",
        },
      },
    );
    expect(restore.status, restore.stderr + restore.stdout).toBe(0);
    expect(restore.stdout).toContain(restoredDb);
    expect(fs.existsSync(restoredDb)).toBe(true);

    const first = spawnSync(
      process.execPath,
      [
        "-e",
        "const Database=require('better-sqlite3'); const db=new Database(process.env.BUZZARD_DB_PATH,{readonly:true}); const row=db.prepare('SELECT value FROM phase11_marker WHERE id=?').get('p11'); const check=db.prepare('PRAGMA integrity_check').get(); process.stdout.write(JSON.stringify({pid:process.pid,value:row.value,integrity:check.integrity_check})); db.close();",
      ],
      { cwd: path.join(root, "server"), encoding: "utf8", env: { ...process.env, BUZZARD_DB_PATH: restoredDb } },
    );
    expect(first.status, first.stderr).toBe(0);
    const a = JSON.parse(first.stdout);
    expect(a.value).toBe(MARKER);
    expect(a.integrity).toBe("ok");

    const second = spawnSync(
      process.execPath,
      [
        "-e",
        "const Database=require('better-sqlite3'); const db=new Database(process.env.BUZZARD_DB_PATH,{readonly:true}); const row=db.prepare('SELECT value FROM phase11_marker WHERE id=?').get('p11'); process.stdout.write(JSON.stringify({pid:process.pid,value:row.value})); db.close();",
      ],
      { cwd: path.join(root, "server"), encoding: "utf8", env: { ...process.env, BUZZARD_DB_PATH: restoredDb } },
    );
    expect(second.status, second.stderr).toBe(0);
    const b = JSON.parse(second.stdout);
    expect(b.value).toBe(MARKER);
    expect(b.pid).not.toBe(a.pid);
  });
});
