import { describe, it, expect } from "vitest";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { resolveRoutePermission, PUBLIC_ROUTES } = require("../lib/routePermissions");

describe("routePermissions", () => {
  it("public routes do not require auth", () => {
    expect(resolveRoutePermission("GET", "/api/health")).toEqual({ public: true });
    expect(resolveRoutePermission("POST", "/api/admin/login")).toEqual({ public: true });
    expect(resolveRoutePermission("GET", "/api/security/health")).toEqual({
      permission: "security.read",
    });
    expect(resolveRoutePermission("GET", "/api/commerce/readiness")).toEqual({
      permission: "system.read",
    });
    expect(resolveRoutePermission("GET", "/api/health/commerce")).toEqual({
      permission: "system.read",
    });
  });

  it("admin control-center requires system.read", () => {
    expect(resolveRoutePermission("GET", "/api/admin/control-center/status")).toEqual({
      permission: "system.read",
    });
  });

  it("config write requires system.configure", () => {
    expect(resolveRoutePermission("PUT", "/api/admin/control-center/config/sales")).toEqual({
      permission: "system.configure",
    });
  });

  it("session revoke requires security.manage", () => {
    expect(resolveRoutePermission("DELETE", "/api/admin/sessions/sess_abc")).toEqual({
      permission: "security.manage",
    });
  });

  it("job enqueue requires system.configure", () => {
    expect(resolveRoutePermission("POST", "/api/admin/control-center/jobs")).toEqual({
      permission: "system.configure",
    });
  });

  it("prefix routes derive read vs write", () => {
    expect(resolveRoutePermission("GET", "/api/admin/products/list")).toEqual({
      permission: "products.read",
    });
    expect(resolveRoutePermission("POST", "/api/admin/products/import")).toEqual({
      permission: "products.write",
    });
  });

  it("alternate product-catalog-pim writes require products.write", () => {
    expect(resolveRoutePermission("POST", "/api/product-catalog-pim/brands")).toEqual({
      permission: "products.write",
    });
    expect(resolveRoutePermission("POST", "/api/product-catalog-pim/products")).toEqual({
      permission: "products.write",
    });
    expect(resolveRoutePermission("GET", "/api/product-catalog-pim/brands")).toBeNull();
    expect(resolveRoutePermission("GET", "/api/p1/i18n/gaps")).toEqual({
      permission: "system.read",
    });
  });

  it("privileged non-admin finance and engine prefixes require admin permissions", () => {
    expect(resolveRoutePermission("POST", "/api/payments-finance/intents")).toEqual({
      permission: "orders.write",
    });
    expect(resolveRoutePermission("POST", "/api/payments-finance/intents/12/confirm")).toEqual({
      permission: "orders.write",
    });
    expect(resolveRoutePermission("POST", "/api/payments-finance/intents/12/refunds")).toEqual({
      permission: "orders.write",
    });
    expect(resolveRoutePermission("POST", "/api/payments-finance/invoices")).toEqual({
      permission: "orders.write",
    });
    expect(resolveRoutePermission("GET", "/api/payments-v36/records")).toEqual({
      permission: "orders.read",
    });
    expect(resolveRoutePermission("POST", "/api/supplier-integration-hub/suppliers")).toEqual({
      permission: "suppliers.write",
    });
    expect(resolveRoutePermission("POST", "/api/marketing-loyalty/points")).toEqual({
      permission: "analytics.export",
    });
  });

  it("intended public payment-method and unsigned webhook sinks stay public", () => {
    expect(resolveRoutePermission("GET", "/api/payments-finance/methods")).toEqual({ public: true });
    expect(resolveRoutePermission("POST", "/api/payments-finance/webhook")).toEqual({ public: true });
    expect(resolveRoutePermission("POST", "/api/webhooks/payment")).toEqual({ public: true });
    expect(resolveRoutePermission("POST", "/api/marketing-loyalty/campaigns/SUMMER/apply")).toEqual({
      public: true,
    });
    expect(resolveRoutePermission("POST", "/api/commerce/cart")).toEqual({ public: true });
    expect(resolveRoutePermission("POST", "/api/commerce/payments/abc/fail").permission).toBe("orders.write");
  });
});
