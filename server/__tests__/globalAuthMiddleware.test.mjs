import { describe, it, expect } from "vitest";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { resolveRoutePermission } = require("../lib/routePermissions");
const { wrapRouteHandler } = require("../lib/globalAuthMiddleware");

describe("globalAuthMiddleware", () => {
  it("wrapRouteHandler passes public routes through", () => {
    let called = false;
    const handler = wrapRouteHandler("GET", "/api/health", (_req, res) => {
      called = true;
      res.json({ ok: true });
    });
    const res = { json: () => {} };
    handler({ method: "GET", url: "/api/health", headers: {} }, res);
    expect(called).toBe(true);
  });

  it("unlisted admin GET requires authentication only", () => {
    const policy = resolveRoutePermission("GET", "/api/admin/custom-module/list");
    expect(policy?.derived).toBe(true);
    expect(policy?.permission).toBeUndefined();
  });
});
