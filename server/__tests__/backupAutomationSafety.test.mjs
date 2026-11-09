import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { isForbiddenRuntimeBinary } = require("../lib/security/subprocessInventory.js");

describe("backup automation subprocess", () => {
  it("runs the local backup script via execFileSync, not a shell string", () => {
    const src = readFileSync("server/lib/backupAutomation.js", "utf8");
    expect(src).toContain("execFileSync");
    expect(src).not.toMatch(/execSync\(/);
    expect(src).not.toMatch(/node "\$\{script\}"/);
    expect(isForbiddenRuntimeBinary("curl")).toBe(true);
  });
});
