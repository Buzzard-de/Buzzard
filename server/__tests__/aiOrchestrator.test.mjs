import { describe, it, expect } from "vitest";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { aiCanExecute } = require("../lib/rbac");

describe("aiOrchestrator permissions", () => {
  it("blocks AI without required permission", () => {
    expect(aiCanExecute(["ai.read"], "ai.execute")).toBe(false);
  });

  it("allows AI with matching permission", () => {
    expect(aiCanExecute(["ai.read", "ai.execute"], "ai.execute")).toBe(true);
  });

  it("wildcard AI permissions pass any check", () => {
    expect(aiCanExecute(["*"], "system.configure")).toBe(true);
  });
});
