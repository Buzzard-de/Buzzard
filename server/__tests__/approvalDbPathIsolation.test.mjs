import { afterAll, describe, expect, it } from "vitest";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const require = createRequire(import.meta.url);
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const commerceDb = path.join(repoRoot, "server/data/buzzard.db");
const ordersPath = path.join(repoRoot, "server/data/orders.json");
const serverRequire = createRequire(path.join(repoRoot, "server/package.json"));
const sqliteId = serverRequire.resolve("better-sqlite3");
const RealDatabase = serverRequire("better-sqlite3");

function fileMark(file) {
  if (!fs.existsSync(file)) return null;
  const stat = fs.statSync(file);
  return { ino: stat.ino, size: stat.size, mtimeMs: stat.mtimeMs };
}

const dbBefore = fileMark(commerceDb);
const ordersBefore = fileMark(ordersPath);
const dir = fs.mkdtempSync(path.join(os.tmpdir(), "buzzard-approval-path-"));
const calls = { sqlite: 0 };

function CountingDatabase(filename, options) {
  const file = String(filename);
  calls.sqlite += 1;
  if (path.basename(file) === "buzzard.db" || file.includes(`${path.sep}server${path.sep}data${path.sep}`)) {
    throw new Error("commerce database must stay closed");
  }
  return new RealDatabase(filename, options);
}
require.cache[sqliteId] = { id: sqliteId, filename: sqliteId, loaded: true, exports: CountingDatabase };

const { createApprovalCenter } = require("../lib/pusat/humanApproval.js");

function expectRefused(dbPath, commercePath) {
  const before = calls.sqlite;
  expect(() => createApprovalCenter({ dbPath, commercePath })).toThrowError(
    expect.objectContaining({ code: "APPROVAL_DB_PATH_REFUSED" })
  );
  expect(calls.sqlite).toBe(before);
}

describe("approval database path isolation", () => {
  it("accepts an isolated temporary file and keeps WAITING_APPROVAL", () => {
    const file = path.join(dir, "approvals.sqlite");
    const center = createApprovalCenter({ dbPath: file });
    const submitted = center.submit({
      action: "GIT_PUSH",
      requestedBy: "sinan_bey",
      reason: "synthetic gate",
      risk: "CRITICAL",
    });
    expect(submitted.ok).toBe(true);
    expect(submitted.auto).toBe(false);
    expect(submitted.item.status).toBe("WAITING_APPROVAL");
    expect(submitted.item.action).toBe("GIT_PUSH");
    center.close();
    expect(calls.sqlite).toBe(1);
    expect(fs.realpathSync(file)).toBe(path.resolve(file));
  });

  it("refuses the protected commerce path before SQLite opens", () => {
    expectRefused(commerceDb);
    expectRefused(path.join(repoRoot, "server/data/custom.sqlite"));
    expectRefused(path.join(dir, "buzzard_guardian_approval.sqlite"));
    expectRefused(path.join(dir, "missing-parent", "approvals.sqlite"));
  });

  it("refuses a symlink and a hard link that identify the same file", () => {
    const synthetic = path.join(dir, "synthetic-commerce.sqlite");
    fs.writeFileSync(synthetic, "");
    const viaName = path.join(dir, "linked-name.sqlite");
    fs.linkSync(synthetic, viaName);
    expectRefused(viaName, synthetic);
    expect(fs.statSync(viaName).ino).toBe(fs.statSync(synthetic).ino);

    const viaLink = path.join(dir, "linked-path.sqlite");
    fs.symlinkSync(synthetic, viaLink);
    expectRefused(viaLink, synthetic);
    expect(fs.realpathSync(viaLink)).toBe(fs.realpathSync(synthetic));

    const toCommerce = path.join(dir, "to-commerce.sqlite");
    fs.symlinkSync(commerceDb, toCommerce);
    expectRefused(toCommerce);

    const parentLink = path.join(dir, "data-parent");
    fs.symlinkSync(path.dirname(commerceDb), parentLink);
    const future = path.join(parentLink, "must-not-create.sqlite");
    expectRefused(future);
    expect(fs.existsSync(path.join(path.dirname(commerceDb), "must-not-create.sqlite"))).toBe(false);
  });
});

afterAll(() => {
  expect(fileMark(commerceDb)).toEqual(dbBefore);
  expect(fileMark(ordersPath)).toEqual(ordersBefore);
  expect(dbBefore).toMatchObject({ ino: 615782, size: 1736704 });
  expect(ordersBefore).toBe(null);
});
