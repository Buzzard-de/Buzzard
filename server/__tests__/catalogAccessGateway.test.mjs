import { createHash } from "node:crypto";
import { afterAll, afterEach, describe, expect, it, vi } from "vitest";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const require = createRequire(import.meta.url);
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const serverRequire = createRequire(path.join(repoRoot, "server/package.json"));
const commerceDb = path.join(repoRoot, "server/data/buzzard.db");
const workspaceDb = "/workspace/server/data/buzzard.db";
const pusatMemory = path.join(os.tmpdir(), "buzzard-pusat-orch.sqlite");

function fileMark(file) {
  if (!fs.existsSync(file)) return null;
  const stat = fs.statSync(file);
  return { ino: stat.ino, size: stat.size, mtimeMs: stat.mtimeMs };
}

const dbBefore = fileMark(commerceDb);
const workspaceBefore = fileMark(workspaceDb);
const pusatBefore = fileMark(pusatMemory);
const previousSales = process.env.BUZZARD_SALES_ENABLED;
delete process.env.BUZZARD_SALES_ENABLED;

const gateway = require("../lib/catalog/catalogAccessGateway.js");
const { createSyntheticCatalog } = require("../lib/catalog/syntheticCatalogFixture.js");
const Database = serverRequire("better-sqlite3");
const { openForPusat, getProduct, close } = gateway;

const dir = fs.mkdtempSync(path.join(os.tmpdir(), "buzzard-catalog-gateway-"));
const synthetic = path.join(dir, "synthetic-catalog.sqlite");
createSyntheticCatalog(synthetic);
const openedHandles = [];

function openPusat(dbPath = synthetic) {
  const opened = openForPusat(dbPath);
  openedHandles.push(opened.handle);
  return opened;
}

function digest(file) {
  return createHash("sha256").update(fs.readFileSync(file)).digest("hex");
}

afterEach(() => {
  vi.useRealTimers();
  while (openedHandles.length) {
    try { close(openedHandles.pop()); } catch { /* already closed */ }
  }
});

afterAll(() => {
  if (previousSales === undefined) delete process.env.BUZZARD_SALES_ENABLED;
  else process.env.BUZZARD_SALES_ENABLED = previousSales;
  fs.rmSync(dir, { recursive: true, force: true });
});

describe("catalog access gateway", () => {
  it("returns only a Pusat handle and never the catalog session", () => {
    const opened = openPusat();
    expect(opened.ok).toBe(true);
    expect(opened.handle).toMatch(/^[0-9a-f]{64}$/);
    expect(opened.expiresAt - Date.now()).toBeGreaterThan(59_000);
    expect(opened.expiresAt - Date.now()).toBeLessThanOrEqual(60_000);
    expect(Object.keys(opened).sort()).toEqual(["dryRun", "expiresAt", "handle", "live", "mock", "mode", "ok"]);
    expect(opened.mode).toBe("DRY_RUN");
    expect(opened.live).toBe(false);
    expect(opened.dryRun).toBe(true);
    expect(gateway.openForSinan).toBeUndefined();
    expect(gateway.openForEsat).toBeUndefined();
    expect(gateway.readSql).toBeUndefined();
    expect(gateway.openReadOnlyCatalog).toBeUndefined();
    expect(Object.keys(gateway).sort()).toEqual(["close", "getProduct", "openForPusat"]);
  });

  it("rejects missing handles and Sinan or Esat claims", () => {
    const opened = openPusat();
    for (const actorId of ["sinan", "esat", "pusat", "root"]) {
      const missing = getProduct(undefined, { id: "fiction-lamp-1" }, { actorId });
      const claimed = getProduct(opened.handle, { id: "fiction-lamp-1" }, { actorId });
      expect(missing.code).toBe("ACTOR_REFUSED");
      expect(claimed.code).toBe("ACTOR_REFUSED");
      expect(JSON.stringify(missing)).not.toContain(opened.handle);
      expect(JSON.stringify(claimed)).not.toContain(opened.handle);
      expect(missing.data).toBeUndefined();
      expect(claimed.data).toBeUndefined();
    }
    expect(getProduct(null, { id: "fiction-lamp-1" }).code).toBe("ACTOR_REFUSED");
  });

  it("reads a product without price, stock, path, or snapshot identity", () => {
    const priced = path.join(dir, "priced-catalog.sqlite");
    const writer = new Database(priced);
    writer.exec(`
      CREATE TABLE catalog_products (
        id TEXT PRIMARY KEY, sku TEXT NOT NULL, title TEXT NOT NULL,
        status TEXT NOT NULL, visibility TEXT NOT NULL, price REAL, stock INTEGER
      );
      INSERT INTO catalog_products VALUES ('lamp-1', 'SKU-LAMP', 'Priced Lamp', 'FIXTURE', 'NON_COMMERCIAL', 49, 7);
    `);
    writer.close();
    const fileHash = digest(priced);
    const opened = openPusat(priced);
    const result = getProduct(opened.handle, { id: "lamp-1" });
    expect(result.ok).toBe(true);
    expect(result.actorId).toBe("pusat");
    expect(result.data).toEqual({
      id: "lamp-1",
      sku: "SKU-LAMP",
      title: "Priced Lamp",
      status: "FIXTURE",
      visibility: "NON_COMMERCIAL",
      stock: null,
      price: null,
    });
    const rendered = JSON.stringify({ opened, result });
    expect(rendered).not.toContain(priced);
    expect(rendered).not.toContain(fileHash);
    expect(rendered).not.toContain("inode");
    expect(rendered).not.toContain("identity");
    expect(result.readSql).toBeUndefined();
    expect(result.getProduct).toBeUndefined();
    expect(result.path).toBeUndefined();
  });

  it("rejects a handle after close and after sixty seconds", () => {
    const opened = openPusat();
    expect(close(opened.handle).ok).toBe(true);
    expect(getProduct(opened.handle, { id: "fiction-lamp-1" }).code).toBe("ACTOR_REFUSED");
    expect(close(opened.handle).code).toBe("CATALOG_CONNECTION_REQUIRED");

    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T00:00:00.000Z"));
    const timed = openPusat();
    vi.setSystemTime(new Date("2026-01-01T00:00:59.000Z"));
    expect(getProduct(timed.handle, { id: "fiction-lamp-1" }).ok).toBe(true);
    vi.setSystemTime(new Date("2026-01-01T00:01:00.000Z"));
    const expired = getProduct(timed.handle, { id: "fiction-lamp-1" });
    expect(expired.code).toBe("CATALOG_CONNECTION_REQUIRED");
    expect(JSON.stringify(expired)).not.toContain(timed.handle);
    expect(close(timed.handle).code).toBe("CATALOG_CONNECTION_REQUIRED");
  });

  it("does not let production modules import the catalog opener", () => {
    const allowed = new Set([
      path.normalize(path.join(repoRoot, "server/lib/catalog/catalogAccessGateway.js")),
      path.normalize(path.join(repoRoot, "server/lib/catalog/readOnlyCatalog.js")),
    ]);
    const offenders = [];
    function walk(directory) {
      for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
        if (entry.name === "node_modules" || entry.name === "__tests__") continue;
        const full = path.join(directory, entry.name);
        if (entry.isDirectory()) {
          walk(full);
          continue;
        }
        if (!entry.name.endsWith(".js")) continue;
        const normalized = path.normalize(full);
        if (allowed.has(normalized)) continue;
        const source = fs.readFileSync(full, "utf8");
        if (source.includes("openReadOnlyCatalog")) offenders.push(path.relative(repoRoot, full));
      }
    }
    walk(path.join(repoRoot, "server"));
    expect(offenders).toEqual([]);
    const loaded = Object.keys(require.cache).map((id) => id.replaceAll("\\", "/"));
    expect(loaded.some((id) => id.endsWith("/lib/pusat/runtime.js"))).toBe(false);
    expect(loaded.some((id) => id.includes("/sinan"))).toBe(false);
    expect(loaded.some((id) => id.endsWith("/security/esatBey.js"))).toBe(false);
    expect(fileMark(commerceDb)).toEqual(dbBefore);
    expect(fileMark(workspaceDb)).toEqual(workspaceBefore);
    expect(fileMark(pusatMemory)).toEqual(pusatBefore);
    for (const dbPath of [commerceDb, workspaceDb]) {
      let caught = null;
      try { openForPusat(dbPath); } catch (error) { caught = error; }
      expect(caught.code).toBe("DATA_PATH_REFUSED");
      expect(caught.message).toBe("DATA_PATH_REFUSED");
      expect(caught.stack).toBeUndefined();
    }
  });
});
