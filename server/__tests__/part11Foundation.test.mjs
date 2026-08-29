import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "../..");

describe("Part 11 final audit foundation", () => {
  it("final-audit script exists and is wired in package.json", () => {
    const scriptPath = path.join(ROOT, "scripts/final-audit.mjs");
    expect(fs.existsSync(scriptPath)).toBe(true);
    const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, "package.json"), "utf8"));
    expect(pkg.scripts["test:final-audit"]).toBe("node scripts/final-audit.mjs");
  });

  it("Part 11 documentation set exists", () => {
    const docs = [
      "FINAL_SYSTEM_ARCHITECTURE.md",
      "FINAL_SECURITY_AUDIT.md",
      "FINAL_API_INVENTORY.md",
      "FINAL_DEPLOYMENT_REQUIREMENTS.md",
      "FINAL_RISK_REGISTER.md",
      "PART11_FINAL_REPORT.md",
    ];
    for (const doc of docs) {
      expect(fs.existsSync(path.join(ROOT, "docs", doc))).toBe(true);
    }
  });

  it("coupon_tampering is CRITICAL in security log", async () => {
    const mod = await import("../lib/securityLog.js");
    expect(mod.EVENT_SEVERITY?.coupon_tampering).toBe("CRITICAL");
  });
});
