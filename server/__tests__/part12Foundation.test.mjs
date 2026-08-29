import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "../..");

describe("Part 12 P1 production hardening", () => {
  it("salesGuard module exists", async () => {
    const mod = await import("../lib/commerce/salesGuard.js");
    expect(typeof mod.assertSupplierOrderAllowed).toBe("function");
    expect(typeof mod.assertCommercialTransactionAllowed).toBe("function");
  });

  it("supplier orders blocked when SALES=0 — fulfillment pipeline", async () => {
    const fp = await import("../lib/fulfillmentPipeline.js");
    const result = fp.submitSupplierOrder({ id: "test" }, { active: true, auth_type: "none" });
    expect(result.ok).toBe(false);
    expect(result.blocked).toBe(true);
  });

  it("dbPaths centralizes database path", async () => {
    const dbPaths = await import("../lib/dbPaths.js");
    expect(dbPaths.resolveDbPath()).toMatch(/\.db$/);
    expect(dbPaths.getPersistenceInfo().mode).toBeTruthy();
  });

  it("53-category taxonomy validates", async () => {
    const taxonomy = await import("../lib/taxonomyCanonical.js");
    const validation = taxonomy.validateCanonicalTaxonomy();
    expect(validation.ok).toBe(true);
    expect(validation.count).toBe(53);
  });

  it("Part 12 scripts wired in package.json", () => {
    const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, "package.json"), "utf8"));
    expect(pkg.scripts["test:part12"]).toBe("node scripts/part12-smoke.mjs");
    expect(pkg.scripts["backup:db"]).toBeTruthy();
    expect(pkg.scripts["restore:db"]).toBeTruthy();
  });

  it("go-live lock prevents sales activation", async () => {
    const goLive = await import("../lib/commerce/goLiveApproval.js");
    expect(goLive.PRODUCTION_SAFETY_LOCK).toBe(true);
    expect(goLive.canActivateSales().allowed).toBe(false);
  });
});
