import { createRequire } from "node:module";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";

const require = createRequire(import.meta.url);
const { createCopies, isKeyMaterial, statusOfScheme, snapshotLocalAreas } = require("../lib/survival/copies32110.js");
const { proveRestore, assertSafePath } = require("../lib/survival/proveBackupRestore.js");

describe("3-2-1-1-0 survival copies", () => {
  it("refuses production restore paths", () => {
    expect(() => assertSafePath("/var/data/buzzard.db")).toThrow(/REFUSE_PRODUCTION_RESTORE/);
  });

  it("excludes key material from data copies", () => {
    expect(isKeyMaterial("vault.pem")).toBe(true);
    expect(isKeyMaterial("catalog.json")).toBe(false);
  });

  it("creates three local copies, alt media, immutable, and proves restore", () => {
    const result = proveRestore();
    expect(result.ok).toBe(true);
    expect(result.consistent).toBe(true);
    expect(result.productionTouched).toBe(false);
    expect(result.copies.verification.zeroVerifyErrors).toBe(true);
    expect(result.copies.verification.gzipMatches).toBe(true);
    expect(result.copies.offsite.configured).toBe(false);
    expect(statusOfScheme(result.copies)).toBe("CODE_READY");
    expect(result.copies.copies.map((c) => c.slot)).toEqual(
      expect.arrayContaining(["copy1-primary", "copy2-archive", "copy3-mirror", "copy-immutable"])
    );
  });

  it("snapshots multiple local areas without touching /var/data", () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "bz-areas-"));
    const snap = snapshotLocalAreas({ repoRoot: process.cwd(), workRoot: root });
    expect(snap.offsiteConfigured).toBe(false);
    expect(snap.areas.find((a) => a.area === "catalog")?.ok).toBe(true);
    expect(snap.note).toMatch(/Offsite remains unconfigured/);
  });

  it("copies offsite only when configured", () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "bz-offsite-"));
    const source = path.join(root, "src.bin");
    fs.writeFileSync(source, "hello-buzzard-backup");
    const offsite = path.join(root, "offsite");
    process.env.BUZZARD_OFFSITE_BACKUP_DIR = offsite;
    const copies = createCopies({ sourcePath: source, workRoot: path.join(root, "work"), area: "catalog" });
    delete process.env.BUZZARD_OFFSITE_BACKUP_DIR;
    expect(copies.offsite.configured).toBe(true);
    expect(copies.offsite.status).toBe("COPIED");
    expect(fs.existsSync(copies.offsite.path)).toBe(true);
  });
});
