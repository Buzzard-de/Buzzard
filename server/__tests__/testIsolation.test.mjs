import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdtempSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";
import { freshServerLib } from "./support/freshServerLib.mjs";

const repoRoot = fileURLToPath(new URL("../..", import.meta.url));
const repoData = path.join(repoRoot, "data");
const tmp = os.tmpdir() + path.sep;

function hashOfCatalogFiles() {
  const hash = createHash("sha256");
  for (const name of readdirSync(repoData).sort()) {
    if (!name.endsWith(".json")) continue;
    hash.update(name).update(readFileSync(path.join(repoData, name)));
  }
  return hash.digest("hex");
}

let lib;
afterEach(() => {
  lib?.restore();
  lib = null;
});

describe("catalog files the API rewrites", () => {
  it("are working copies outside the checkout in an automated test process", () => {
    lib = freshServerLib({ BUZZARD_CATALOG_DIR: undefined });
    const { runtimeCatalogFile, getRuntimeCatalogInfo, RUNTIME_CATALOG_FILES } = lib.load("catalogFiles.js");
    expect(getRuntimeCatalogInfo().mode).toBe("test_isolated");
    for (const name of RUNTIME_CATALOG_FILES) {
      const file = runtimeCatalogFile(name);
      expect(file.startsWith(tmp), file).toBe(true);
      expect(readFileSync(file, "utf8")).toBe(readFileSync(path.join(repoData, name), "utf8"));
    }
  });

  it("leave the checkout untouched when suppliers, products, SEO data and visibility are changed", () => {
    lib = freshServerLib({ BUZZARD_CATALOG_DIR: undefined });
    const before = hashOfCatalogFiles();

    const suppliers = lib.load("supplierStore.js");
    suppliers.upsertSupplier({ supplier_id: "SYN-ISOLATION", name: "Synthetic supplier" });
    suppliers.writeMappings([]);
    expect(suppliers.getSupplier("SYN-ISOLATION")?.name).toBe("Synthetic supplier");

    const visibility = lib.load("categoryVisibility.js");
    visibility.setCategoryStatus("cat-synthetic", "DRAFT", { updatedBy: "synthetic@unit.buzzard.test" });
    expect(visibility.getCategoryStatus("cat-synthetic").status).toBe("DRAFT");

    const products = lib.load("productStore.js");
    products.upsertProduct({ id: "syn-isolation", sku: "SYN-ISOLATION-1", title: "Synthetic" });
    expect(products.getProductById("syn-isolation")?.sku).toBe("SYN-ISOLATION-1");
    products.deleteProduct("syn-isolation");

    const seo = lib.load("seoStore.js");
    seo.upsertOverride("products", "syn-isolation", { title: "Synthetic" });
    expect(seo.loadOverrides().products["syn-isolation"].title).toBe("Synthetic");

    expect(hashOfCatalogFiles()).toBe(before);
    expect(readFileSync(path.join(repoData, "buzzard_suppliers.json"), "utf8")).not.toContain("SYN-ISOLATION");
  });

  it("keeps one working copy for the whole process, also when the module is loaded again", () => {
    lib = freshServerLib({ BUZZARD_CATALOG_DIR: undefined });
    lib.load("supplierStore.js").upsertSupplier({ supplier_id: "SYN-RELOAD", name: "Synthetic supplier" });
    lib.restore();
    lib = freshServerLib({ BUZZARD_CATALOG_DIR: undefined });
    expect(lib.load("supplierStore.js").getSupplier("SYN-RELOAD")?.name).toBe("Synthetic supplier");
  });

  it("uses BUZZARD_CATALOG_DIR and keeps what is already there", () => {
    const dir = mkdtempSync(path.join(os.tmpdir(), "buzzard-catalog-"));
    writeFileSync(path.join(dir, "buzzard_seo_overrides.json"), '{"kept":true}');
    lib = freshServerLib({ BUZZARD_CATALOG_DIR: dir });
    const { runtimeCatalogFile, getRuntimeCatalogInfo } = lib.load("catalogFiles.js");
    expect(getRuntimeCatalogInfo()).toEqual({ dir, mode: "custom_path" });
    expect(readFileSync(runtimeCatalogFile("buzzard_seo_overrides.json"), "utf8")).toBe('{"kept":true}');
    const suppliers = runtimeCatalogFile("buzzard_suppliers.json");
    expect(suppliers).toBe(path.join(dir, "buzzard_suppliers.json"));
    expect(readFileSync(suppliers, "utf8")).toBe(readFileSync(path.join(repoData, "buzzard_suppliers.json"), "utf8"));
    expect(readdirSync(dir).filter((name) => name.endsWith(".tmp"))).toEqual([]);
  });

  it("refuses names that are not runtime catalog files", () => {
    lib = freshServerLib({});
    const { runtimeCatalogFile } = lib.load("catalogFiles.js");
    for (const name of ["../server/data/admin-users.json", "buzzard_categories.json", "", "/etc/passwd"]) {
      expect(() => runtimeCatalogFile(name), name).toThrow(/not a runtime catalog file/);
    }
  });

  it("uses data/ itself outside tests when nothing is configured", () => {
    const script =
      'const c = require("./server/lib/catalogFiles"); process.stdout.write(JSON.stringify({ info: c.getRuntimeCatalogInfo(), file: c.runtimeCatalogFile("buzzard_suppliers.json") }));';
    const env = { ...process.env };
    for (const name of ["VITEST", "VITEST_POOL_ID", "VITEST_WORKER_ID", "BUZZARD_CATALOG_DIR"]) delete env[name];
    const out = JSON.parse(execFileSync(process.execPath, ["-e", script], { cwd: repoRoot, env, encoding: "utf8" }));
    expect(out.info).toEqual({ dir: repoData.replace(/[\\/]$/, ""), mode: "repository" });
    expect(out.file).toBe(path.join(repoData, "buzzard_suppliers.json"));
  });
});

describe("where an automated test process keeps its data", () => {
  it("is never the checkout: admin stores, database, backups and catalog copies are below the temp directory", () => {
    lib = freshServerLib({
      BUZZARD_DATA_DIR: undefined,
      BUZZARD_DB_PATH: undefined,
      BUZZARD_BACKUP_DIR: undefined,
      BUZZARD_CATALOG_DIR: undefined,
    });
    const places = {
      data: lib.load("dataDir.js").resolveDataDir(),
      database: lib.load("dbPaths.js").resolveDbPath(),
      backups: lib.load("dbPaths.js").resolveBackupDir(),
      catalog: lib.load("catalogFiles.js").getRuntimeCatalogInfo().dir,
    };
    for (const [name, place] of Object.entries(places)) {
      expect(place.startsWith(tmp), `${name}: ${place}`).toBe(true);
      expect(place.startsWith(repoRoot), `${name}: ${place}`).toBe(false);
    }
  });

  // Reported as skipped outside scripts/isolated/run.sh, where there is nothing to check.
  it.runIf(process.env.BUZZARD_ISOLATED === "1")("an isolated run hides the real server/data and makes data/ read-only", () => {
    expect(existsSync(path.join(repoRoot, "server", "data", ".buzzard-isolated"))).toBe(true);
    expect(existsSync(path.join(repoRoot, "server", "data", "buzzard.db"))).toBe(false);
    expect(() => writeFileSync(path.join(repoData, ".write-probe"), "x")).toThrow(/EROFS/);
    expect(process.env.BUZZARD_ISOLATED_NETWORK).toBe("loopback-only");
  });
});
