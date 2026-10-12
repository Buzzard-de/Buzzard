import { afterEach, describe, expect, it, vi } from "vitest";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

const originalPimFlag = process.env.BUZZARD_PIM_CATALOG;
const originalDbFlag = process.env.BUZZARD_DB_ENABLED;

function registerPlugin(plugin) {
  const handlers = new Map();
  const app = {};
  for (const method of ["get", "post", "put", "patch", "delete"]) {
    app[method] = (path, handler) => handlers.set(`${method.toUpperCase()} ${path}`, handler);
  }
  plugin.register(app);
  return handlers;
}

describe("PIM catalog v1.9 write access", () => {
  afterEach(() => {
    if (originalPimFlag === undefined) delete process.env.BUZZARD_PIM_CATALOG;
    else process.env.BUZZARD_PIM_CATALOG = originalPimFlag;
    if (originalDbFlag === undefined) delete process.env.BUZZARD_DB_ENABLED;
    else process.env.BUZZARD_DB_ENABLED = originalDbFlag;
  });

  it("rejects anonymous product creates before persistence", async () => {
    process.env.BUZZARD_PIM_CATALOG = "1";
    delete process.env.BUZZARD_DB_ENABLED;
    vi.resetModules();
    const plugin = require("../plugins/pimCatalogPlugin.js");
    const handlers = registerPlugin(plugin);
    const handler = handlers.get("POST /api/admin/pim-catalog/products");
    expect(handler).toBeTypeOf("function");

    const response = {
      statusCode: 200,
      status(code) {
        this.statusCode = code;
        return this;
      },
      json: vi.fn(),
    };
    await handler({ headers: {}, body: { sku: "anon-sku", status: "draft" } }, response);
    expect(response.statusCode).toBe(403);
    expect(response.json).toHaveBeenCalledWith({ error: "Admin access required" });
  });
});
