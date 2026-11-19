import { createRequire } from "node:module";
import { describe, expect, it } from "vitest";

const require = createRequire(import.meta.url);
const { resolveRoutePermission, ADMIN_MODULE_PREFIX } = require("../lib/routePermissions.js");
const { can } = require("../lib/rbac.js");

const MODULES = [
  ["master-admin-v40", "system.read", "system.configure"],
  ["security-v38", "security.read", "security.manage"],
  ["payments-v36", "orders.read", "orders.write"],
  ["order-management-v32", "orders.read", "orders.write"],
  ["marketplace-v35", "analytics.read", "integrations.manage"],
  ["logistics-v34", "logistics.read", "logistics.write"],
  ["fulfillment-v33", "logistics.read", "logistics.write"],
  ["international-v37", "products.read", "system.configure"],
  ["analytics-v39", "analytics.read", "analytics.export"],
];

describe("back-office modules outside /api/admin", () => {
  it.each(MODULES)("%s needs %s to read and %s to change", (module, read, write) => {
    expect(resolveRoutePermission("GET", `/api/${module}/records`)).toEqual({ permission: read });
    expect(resolveRoutePermission("GET", `/api/${module}/records/:code`)).toEqual({ permission: read });
    expect(resolveRoutePermission("GET", `/api/${module}/jobs`)).toEqual({ permission: read });
    expect(resolveRoutePermission("POST", `/api/${module}/records`)).toEqual({ permission: write });
    expect(resolveRoutePermission("PATCH", `/api/${module}/records/:id`)).toEqual({ permission: write });
    expect(resolveRoutePermission("POST", `/api/${module}/jobs`)).toEqual({ permission: write });
  });

  it("covers every prefix in the table", () => {
    expect(ADMIN_MODULE_PREFIX.map((entry) => entry.prefix).sort()).toEqual(
      [...MODULES.map(([module]) => `/api/${module}/`), "/api/product-catalog-pim/", "/api/supplier-integration-hub/"].sort()
    );
  });

  it("asks for the same read permission as the admin navigation entry of the module", async () => {
    const { NAV_SLUG_PERMISSIONS } = await import("../../lib/admin/navPermissions.mjs");
    for (const entry of ADMIN_MODULE_PREFIX) {
      const slug = entry.prefix.replace(/^\/api\//, "").replace(/\/$/, "");
      expect(NAV_SLUG_PERMISSIONS[slug], slug).toBe(entry.read);
    }
  });

  it("protects the product catalog PIM and the supplier integration hub", () => {
    expect(resolveRoutePermission("GET", "/api/product-catalog-pim/products/:sku")).toEqual({ permission: "products.read" });
    for (const route of ["brands", "categories", "products", "products/:sku/attributes", "products/:sku/media", "products/:sku/variants"]) {
      expect(resolveRoutePermission("POST", `/api/product-catalog-pim/${route}`)).toEqual({ permission: "products.write" });
    }
    expect(resolveRoutePermission("PUT", "/api/product-catalog-pim/products/:sku/translation/:language")).toEqual({
      permission: "products.write",
    });
    expect(resolveRoutePermission("GET", "/api/supplier-integration-hub/suppliers")).toEqual({ permission: "suppliers.read" });
    for (const route of ["suppliers", "suppliers/:code/mappings", "suppliers/:code/sync", "suppliers/:code/snapshot", "orders"]) {
      expect(resolveRoutePermission("POST", `/api/supplier-integration-hub/${route}`)).toEqual({ permission: "suppliers.write" });
    }
  });

  it.each([
    ["POST", "/api/payments-finance/intents", "orders.write"],
    ["POST", "/api/payments-finance/intents/:id/confirm", "orders.write"],
    ["POST", "/api/payments-finance/intents/:id/refunds", "orders.write"],
    ["POST", "/api/payments-finance/invoices", "orders.write"],
    ["GET", "/api/marketing-loyalty/campaigns", "analytics.read"],
    ["POST", "/api/marketing-loyalty/campaigns", "analytics.export"],
    ["POST", "/api/marketing-loyalty/points", "orders.write"],
    ["POST", "/api/suppliers/import", "imports.run"],
    ["POST", "/api/dropship/forward", "orders.write"],
    ["POST", "/api/shipping/label", "logistics.write"],
    ["POST", "/api/vehicles/seed", "products.write"],
    ["POST", "/api/tecdoc/compatibility/link", "products.write"],
    ["POST", "/api/automation/order-created", "automation.run"],
  ])("%s %s needs %s", (method, route, permission) => {
    expect(resolveRoutePermission(method, route)).toEqual({ permission });
  });

  it("keeps a read-only administrator from every write in these modules", () => {
    const writes = [
      ...ADMIN_MODULE_PREFIX.map((entry) => entry.write),
      "imports.run",
      "automation.run",
      "analytics.export",
    ];
    for (const permission of writes) {
      expect(can("read_only", permission), permission).toBe(false);
      expect(can("administrator", permission), permission).toBe(true);
    }
    expect(can("catalog_manager", "orders.write")).toBe(false);
    expect(can("order_manager", "products.write")).toBe(false);
    expect(can("order_manager", "system.configure")).toBe(false);
  });
});

describe("routes that stay without an admin policy", () => {
  it.each([
    ["GET", "/api/products"],
    ["GET", "/api/vehicles"],
    ["GET", "/api/tecdoc/compatibility/:sku"],
    ["POST", "/api/tecdoc/compatibility"],
    ["POST", "/api/commerce/cart"],
    ["POST", "/api/cart-checkout/carts"],
    ["POST", "/api/account/register"],
    ["POST", "/api/contact"],
    ["POST", "/api/marketing-loyalty/campaigns/:code/apply"],
    ["GET", "/api/master-admin-v40"],
    ["GET", "/api/product-catalog-pimx/products"],
  ])("%s %s", (method, route) => {
    expect(resolveRoutePermission(method, route)).toBeNull();
  });

  it("puts webhooks behind the signature gate, not behind a session", () => {
    expect(resolveRoutePermission("POST", "/api/payments-finance/webhook")).toEqual({ webhook: "payment" });
    expect(resolveRoutePermission("POST", "/api/webhooks/payment")).toEqual({ webhook: "payment" });
    expect(resolveRoutePermission("POST", "/api/webhooks/:provider")).toEqual({ webhook: "provider" });
    expect(resolveRoutePermission("POST", "/api/commerce/webhooks/stripe")).toEqual({ webhook: "commerce" });
  });

  it("leaves login public and the admin area authenticated", () => {
    expect(resolveRoutePermission("POST", "/api/admin/login")).toEqual({ public: true });
    expect(resolveRoutePermission("GET", "/api/admin/me")).toEqual({ authenticated: true });
    expect(resolveRoutePermission("DELETE", "/api/admin/sessions/:sessionId")).toEqual({ permission: "security.manage" });
    expect(resolveRoutePermission("POST", "/api/admin/pim-core/import")).toEqual({ permission: "products.write" });
  });
});
