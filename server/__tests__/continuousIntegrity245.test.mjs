import { describe, it, expect } from "vitest";
import { createRequire } from "node:module";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";

const require = createRequire(import.meta.url);

describe("diagnostic payloads omit filesystem paths", () => {
  it("getDatabaseHealth has no path or backupDir", () => {
    const { getDatabaseHealth } = require("../lib/db.js");
    const health = getDatabaseHealth();
    expect(health).not.toHaveProperty("path");
    expect(health.persistence).not.toHaveProperty("backupDir");
    expect(health.persistence).not.toHaveProperty("renderDisk");
    expect(JSON.stringify(health)).not.toMatch(/[/\\]server[/\\]data[/\\]/);
  });

  it("pusat health omits database.path", async () => {
    const pusat = require("../lib/pusat");
    const health = await pusat.getHealth();
    expect(health.database).not.toHaveProperty("path");
    expect(JSON.stringify(health.database)).not.toMatch(/buzzard\.db/);
  });

  it("go-live DATABASE gate detail has no filesystem path", async () => {
    const { evaluateGoLiveReadiness } = require("../lib/operations/goLiveReadiness.js");
    const readiness = await evaluateGoLiveReadiness();
    const dbGate = readiness.gates.find((g) => g.gate === "DATABASE");
    expect(dbGate).toBeTruthy();
    expect(String(dbGate.detail)).not.toMatch(/path=/);
    expect(String(dbGate.detail)).not.toMatch(/[/\\]/);
  });

  it("production summary database is public-shaped", async () => {
    const { getProductionSummary } = require("../lib/productionHealth.js");
    const summary = await getProductionSummary();
    expect(summary.database).not.toHaveProperty("path");
    expect(summary.database).not.toHaveProperty("users");
    expect(summary.database.persistence).not.toHaveProperty("backupDir");
    expect(summary.backup).not.toHaveProperty("backupDir");
    if (summary.database.startup) {
      expect(summary.database.startup).not.toHaveProperty("dbPath");
    }
    expect(JSON.stringify(summary.database)).not.toMatch(/[/\\]server[/\\]data[/\\]/);
  });

  it("security audit config findings use codes as message", () => {
    const src = fs.readFileSync(path.join(__dirname, "../lib/security/securityAudit.js"), "utf8");
    expect(src).not.toMatch(/err\.message/);
    expect(src).not.toMatch(/warn\.message/);
    expect(src).toMatch(/err\.code \|\| "config\.invalid"/);
  });

  it("restoreGuard target is a class, not a path", () => {
    const { assertRestoreAllowed } = require("../lib/software/restoreGuard.js");
    try {
      assertRestoreAllowed(path.join(os.tmpdir(), "buzzard-restore.db"), {
        NODE_ENV: "production",
        BUZZARD_ALLOW_PRODUCTION_RESTORE: "1",
      });
      throw new Error("expected throw");
    } catch (err) {
      expect(err.code).toBe("PRODUCTION_EPHEMERAL_PATH");
      expect(err.target).toBe("ephemeral");
      expect(String(err.target)).not.toContain(os.tmpdir());
    }
  });

  it("startup logs and payload-too-large use codes", () => {
    const src = fs.readFileSync(path.join(__dirname, "../server.js"), "utf8");
    expect(src).toMatch(/PAYLOAD_TOO_LARGE/);
    expect(src).toMatch(/publicTaskError/);
    expect(src).not.toMatch(/console\.error\(err\.message\)/);
    expect(src).not.toMatch(/errors\.map\(\(e\) => e\.message\)/);
  });
});
