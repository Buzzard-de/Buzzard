import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("Next.js artifact isolation", () => {
  it("keeps production builds out of the live next-dev cache directory", () => {
    const config = readFileSync("next.config.ts", "utf8");
    const pkg = JSON.parse(readFileSync("package.json", "utf8"));
    expect(config).toContain('distDir: process.env.NODE_ENV === "production" ? ".next" : ".next-dev"');
    expect(pkg.scripts.build).toContain("next build");
    expect(pkg.scripts.build).not.toContain("NEXT_DIST_DIR=");
  });
});
