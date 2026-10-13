import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("Next.js artifact isolation", () => {
  it("keeps production builds out of the live next-dev .next directory", () => {
    const config = readFileSync("next.config.ts", "utf8");
    const pkg = JSON.parse(readFileSync("package.json", "utf8"));
    expect(config).toContain('distDir: process.env.NEXT_DIST_DIR || ".next"');
    expect(pkg.scripts.build).toContain("NEXT_DIST_DIR=.next-prod");
    expect(pkg.scripts.build).toContain("next build");
  });
});
