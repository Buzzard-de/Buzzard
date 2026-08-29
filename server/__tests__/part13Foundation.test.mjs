import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "../..");

describe("Part 13 production deployment foundation", () => {
  it("health/version route module exists", async () => {
    const mod = await import("../plugins/productionHealthPlugin.js");
    expect(typeof mod.register).toBe("function");
  });

  it("deploymentIdentity returns version payload shape", async () => {
    const di = await import("../lib/deploymentIdentity.js");
    const id = di.getDeploymentIdentity();
    expect(id.service).toBe("buzzard-api");
    expect(typeof id.salesEnabled).toBe("boolean");
  });

  it("db integrity check runs ok on dev db", async () => {
    const { runIntegrityCheck } = await import("../lib/dbIntegrity.js");
    const result = runIntegrityCheck();
    expect(result.integrityCheck).toBe("ok");
  });

  it("Part 13 scripts wired", () => {
    const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, "package.json"), "utf8"));
    expect(pkg.scripts["test:part13"]).toBe("node scripts/part13-smoke.mjs");
    expect(pkg.scripts["test:production-smoke"]).toBe("node scripts/production-smoke.mjs");
  });
});
