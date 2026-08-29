import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

describe("Part 10 foundation", () => {
  it("production safety script exists", () => {
    expect(fs.existsSync(path.join(process.cwd(), "scripts/production-safety.mjs"))).toBe(true);
  });

  it("part10 smoke script exists", () => {
    expect(fs.existsSync(path.join(process.cwd(), "scripts/part10-smoke.mjs"))).toBe(true);
  });

  it("e2e webserver script exists", () => {
    expect(fs.existsSync(path.join(process.cwd(), "scripts/e2e-webserver.mjs"))).toBe(true);
  });

  it("commerce coupon service exists", () => {
    expect(fs.existsSync(path.join(process.cwd(), "server/lib/commerce/commerceCouponService.js"))).toBe(true);
  });

  it("legacy commerce helper exists", () => {
    expect(fs.existsSync(path.join(process.cwd(), "server/lib/legacyCommerce.js"))).toBe(true);
  });

  it("customer journey e2e spec exists", () => {
    expect(fs.existsSync(path.join(process.cwd(), "e2e/customer-journey.spec.ts"))).toBe(true);
  });

  it("playwright config starts webserver by default", () => {
    const cfg = fs.readFileSync(path.join(process.cwd(), "playwright.config.ts"), "utf8");
    expect(cfg).toContain("e2e-webserver.mjs");
  });

  it("package.json defines test:production-safety", () => {
    const pkg = JSON.parse(fs.readFileSync(path.join(process.cwd(), "package.json"), "utf8"));
    expect(pkg.scripts["test:production-safety"]).toBeDefined();
    expect(pkg.scripts["test:part10"]).toBeDefined();
  });
});
