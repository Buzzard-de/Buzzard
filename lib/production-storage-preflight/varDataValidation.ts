import fs from "fs";
import os from "os";
import path from "path";
import { CANONICAL_MOUNT } from "./environmentValidation";
import type { VarDataCheck } from "./types";

function loadSqlite(): { new (p: string): { close: () => void } } | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require("better-sqlite3");
  } catch {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      return require(path.join(process.cwd(), "server/node_modules/better-sqlite3"));
    } catch {
      return null;
    }
  }
}

export function validateVarDataMount(): VarDataCheck {
  const mountPath = CANONICAL_MOUNT;
  let exists = false;
  let isDirectory = false;
  let writable = false;
  let sqliteOpenable = false;
  const notes: string[] = [];

  try {
    exists = fs.existsSync(mountPath);
    if (exists) {
      const stat = fs.statSync(mountPath);
      isDirectory = stat.isDirectory();
      if (isDirectory) {
        fs.accessSync(mountPath, fs.constants.W_OK);
        writable = true;
      }
    }
  } catch (err) {
    notes.push(err instanceof Error ? err.message : "access_check_failed");
  }

  if (exists && isDirectory && writable) {
    const Database = loadSqlite();
    if (Database) {
      const testDb = path.join(mountPath, ".buzzard-preflight-test.db");
      try {
        const db = new Database(testDb);
        db.close();
        fs.unlinkSync(testDb);
        sqliteOpenable = true;
      } catch (err) {
        notes.push(`sqlite_test:${err instanceof Error ? err.message : "failed"}`);
      }
    } else {
      notes.push("sqlite_module_unavailable_for_mount_test");
    }
  } else if (!exists) {
    notes.push("MANUAL_RENDER_ACTION_REQUIRED: mount persistent disk at /var/data");
  }

  let status: VarDataCheck["status"] = "BLOCKED";
  if (exists && isDirectory && writable && sqliteOpenable) {
    status = "PASS";
  } else if (exists && isDirectory) {
    status = "WARNING";
  } else if (process.env.NODE_ENV !== "production") {
    status = "UNVERIFIED";
    notes.push("Local/dev environment — live Render disk validation required");
  }

  return {
    path: mountPath,
    exists,
    isDirectory,
    writable,
    sqliteOpenable,
    status,
    notes: notes.join("; ") || (status === "PASS" ? "Mount ready" : "Not configured on this instance"),
  };
}

export function getIsolatedPreflightDir(): string {
  return path.join(os.tmpdir(), "buzzard-storage-preflight");
}
