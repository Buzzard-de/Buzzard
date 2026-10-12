import { afterEach, describe, expect, it, vi } from "vitest";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

const originalPimFlag = process.env.BUZZARD_PRODUCT_CATALOG_PIM;
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

describe("product catalog PIM write access", () => {
  afterEach(() => {
    if (originalPimFlag === undefined) delete process.env.BUZZARD_PRODUCT_CATALOG_PIM;
    else process.env.BUZZARD_PRODUCT_CATALOG_PIM = originalPimFlag;
    if (originalDbFlag === undefined) delete process.env.BUZZARD_DB_ENABLED;
    else process.env.BUZZARD_DB_ENABLED = originalDbFlag;
  });

  it("requires an admin for every alternate product-catalog write route", async () => {
    process.env.BUZZARD_PRODUCT_CATALOG_PIM = "1";
    delete process.env.BUZZARD_DB_ENABLED;
    vi.resetModules();
    const plugin = require("../plugins/productCatalogPimPlugin.js");
    const handlers = registerPlugin(plugin);
    const writeRoutes = [
      ["POST", "/api/product-catalog-pim/brands"],
      ["POST", "/api/product-catalog-pim/categories"],
      ["POST", "/api/product-catalog-pim/products"],
      ["PUT", "/api/product-catalog-pim/products/:sku/translation/:language"],
      ["POST", "/api/product-catalog-pim/products/:sku/attributes"],
      ["POST", "/api/product-catalog-pim/products/:sku/media"],
      ["POST", "/api/product-catalog-pim/products/:sku/variants"],
    ];

    for (const [method, path] of writeRoutes) {
      const handler = handlers.get(`${method} ${path}`);
      expect(handler, `${method} ${path} should be registered`).toBeTypeOf("function");

      const response = {
        statusCode: 200,
        status(code) {
          this.statusCode = code;
          return this;
        },
        json: vi.fn(),
      };
      await handler({ headers: {}, params: { sku: "test-sku", language: "en" }, body: {} }, response);

      expect(response.statusCode, `${method} ${path} should reject anonymous writes`).toBe(403);
      expect(response.json).toHaveBeenCalledWith({ error: "Admin access required" });
    }
  });
});
