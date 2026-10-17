import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

describe("Playwright software coverage", () => {
  it("attaches every e2e/*.spec.ts to at least one project", () => {
    const specDir = path.join(process.cwd(), "e2e");
    const specs = fs
      .readdirSync(specDir)
      .filter((name) => name.endsWith(".spec.ts"))
      .sort();
    expect(specs.length).toBeGreaterThan(0);

    const configText = fs.readFileSync(path.join(process.cwd(), "playwright.config.ts"), "utf8");
    const matchers = [...configText.matchAll(/testMatch:\s*\/([^/\n]+)\/,/g)].map((row) => new RegExp(row[1]));
    expect(matchers.length).toBeGreaterThan(0);
    const unmatched = specs.filter((spec) => !matchers.some((re) => re.test(spec)));
    expect(unmatched, `unmatched Playwright specs: ${unmatched.join(", ")}`).toEqual([]);
  });

  it("does not skip the whole suite when API URL is unset in config bootstrap", () => {
    const cfg = fs.readFileSync(path.join(process.cwd(), "playwright.config.ts"), "utf8");
    expect(cfg).toContain("BUZZARD_API_URL");
    expect(cfg).toContain("127.0.0.1:3001");
    expect(cfg).toContain("listE2eSpecs");
  });

  it("package scripts expose Playwright without enabling sales", () => {
    const pkg = JSON.parse(fs.readFileSync(path.join(process.cwd(), "package.json"), "utf8"));
    expect(pkg.scripts["test:e2e"]).toBe("playwright test");
    expect(pkg.scripts["test:e2e:api"]).toContain("PLAYWRIGHT_SKIP_WEBSERVER=1");
  });
});
