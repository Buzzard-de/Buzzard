import { describe, it, expect } from "vitest";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { resolveRoutePermission, PUBLIC_ROUTES } = require("../lib/routePermissions");

describe("routePermissions", () => {
  it("public routes do not require auth", () => {
    expect(resolveRoutePermission("GET", "/api/health")).toEqual({ public: true });
    expect(resolveRoutePermission("POST", "/api/admin/login")).toEqual({ public: true });
    expect(PUBLIC_ROUTES.has("GET /api/security/health")).toBe(true);
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
});
