import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { describe, expect, it } from "vitest";

const root = path.resolve(__dirname, "../..");
const require = createRequire(import.meta.url);
const { logSecurityEvent } = require("../lib/securityLog");
const { aiCanExecute } = require("../lib/rbac");
const { resolveDbPath } = require("../lib/dbPaths");
const { isSalesEnabled } = require("../lib/salesMode");
const esat = require("../lib/security/esatBey");

function text(rel) {
  return readFileSync(path.join(root, rel), "utf8");
}

describe("items 183-237 local operations", () => {
  it("keeps logs, authorization, and the database path local", () => {
    expect(typeof logSecurityEvent).toBe("function");
    expect(text("server/server.js")).toContain('res.setHeader("X-Request-Id"');
    expect(aiCanExecute(["ai.read"], "ai.execute")).toBe(false);
    expect(aiCanExecute(["ai.execute"], "ai.execute")).toBe(true);
    const dbPath = resolveDbPath();
    expect(dbPath.includes(`${path.sep}tmp${path.sep}`) || dbPath.includes("buzzard-test-sqlite")).toBe(true);
    expect(isSalesEnabled()).toBe(false);
    const scanned = esat.scanText("password dump");
    expect(scanned.safe).toBe(false);
    expect(scanned.allowed).toBe(false);
  });

  it("has the operational scripts and does not claim the missing routes", () => {
    for (const rel of [
      "scripts/backup-db.mjs",
      "scripts/restore-db.mjs",
      "scripts/verify-go-live.mjs",
      "scripts/production-safety.mjs",
    ]) {
      expect(existsSync(path.join(root, rel)), rel).toBe(true);
    }
    expect(text("scripts/restore-db.mjs")).toContain("--dry-run");
    expect(text("scripts/production-safety.mjs")).toContain("sales must be off");
    expect(existsSync(path.join(root, "server/lib/externalIntegrations.js"))).toBe(false);
    expect(existsSync(path.join(root, "scripts/provider-diagnostics.mjs"))).toBe(false);
    expect(text("server/plugins/productionHealthPlugin.js")).not.toContain("/api/health/software");
  });
});
