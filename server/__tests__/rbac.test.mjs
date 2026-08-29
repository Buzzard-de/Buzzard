import { describe, it, expect } from "vitest";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { can, aiCanExecute, PERMISSIONS } = require("../lib/rbac");

describe("rbac", () => {
  it("administrator has wildcard permission", () => {
    expect(can("administrator", "system.configure")).toBe(true);
    expect(can("super_admin", "orders.write")).toBe(true);
  });

  it("read_only cannot write", () => {
    expect(can("read_only", "products.read")).toBe(true);
    expect(can("read_only", "products.write")).toBe(false);
    expect(can("read_only", "system.configure")).toBe(false);
  });

  it("catalog_manager has catalog permissions", () => {
    expect(can("catalog_manager", "products.write")).toBe(true);
    expect(can("catalog_manager", "orders.write")).toBe(false);
  });

  it("order_manager has order permissions", () => {
    expect(can("order_manager", "orders.write")).toBe(true);
    expect(can("order_manager", "categories.publish")).toBe(false);
  });

  it("aiCanExecute respects employee permissions", () => {
    expect(aiCanExecute(["ai.read", "ai.execute"], "ai.read")).toBe(true);
    expect(aiCanExecute(["ai.read"], "ai.execute")).toBe(false);
    expect(aiCanExecute(["*"], "system.configure")).toBe(true);
  });

  it("PERMISSIONS includes expected roles", () => {
    expect(PERMISSIONS.read_only).toBeDefined();
    expect(PERMISSIONS.catalog_manager).toBeDefined();
  });
});
