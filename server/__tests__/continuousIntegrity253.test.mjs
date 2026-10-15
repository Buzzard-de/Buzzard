import { describe, it, expect, beforeAll } from "vitest";
import { createRequire } from "node:module";
import fs from "node:fs";
import path from "node:path";

const require = createRequire(import.meta.url);

function mockRes() {
  const res = {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    },
  };
  return res;
}

function mockReq(overrides = {}) {
  return {
    method: "POST",
    url: "/api/account/password-reset/request",
    headers: {},
    socket: { remoteAddress: "127.0.0.1" },
    body: {},
    ...overrides,
  };
}

function captureRoutes(plugin) {
  const routes = {};
  const app = {
    get(routePath, handler) {
      routes[`GET ${routePath}`] = handler;
    },
    post(routePath, handler) {
      routes[`POST ${routePath}`] = handler;
    },
    put(routePath, handler) {
      routes[`PUT ${routePath}`] = handler;
    },
    patch(routePath, handler) {
      routes[`PATCH ${routePath}`] = handler;
    },
    delete(routePath, handler) {
      routes[`DELETE ${routePath}`] = handler;
    },
  };
  plugin.register(app);
  return routes;
}

describe("KOMUT 6 password reset token and submissions authz", () => {
  let accountRoutes;
  let contactRoutes;
  let customerAuth;
  let customerStore;
  let resolveRoutePermission;
  let wrapRouteHandler;

  beforeAll(() => {
    accountRoutes = captureRoutes(require("../plugins/customerAccountPlugin.js"));
    contactRoutes = captureRoutes(require("../plugins/contactStoragePlugin.js"));
    customerAuth = require("../lib/customerAuth.js");
    customerStore = require("../lib/customerStore.js");
    resolveRoutePermission = require("../lib/routePermissions.js").resolveRoutePermission;
    wrapRouteHandler = require("../lib/globalAuthMiddleware.js").wrapRouteHandler;
  });

  it("A/B/C request response never includes a reset token and does not vary by account existence", () => {
    const existing = mockRes();
    accountRoutes["POST /api/account/password-reset/request"](
      mockReq({ body: { email: "kunde@buzzard.de" }, url: "/api/account/password-reset/request" }),
      existing
    );
    const missing = mockRes();
    accountRoutes["POST /api/account/password-reset/request"](
      mockReq({
        body: { email: `missing-${Date.now()}@example.invalid` },
        url: "/api/account/password-reset/request",
      }),
      missing
    );

    expect(existing.statusCode).toBe(200);
    expect(missing.statusCode).toBe(200);
    expect(existing.body).toEqual(missing.body);
    expect(existing.body.resetToken).toBeUndefined();
    expect(existing.body.token).toBeUndefined();
    expect(JSON.stringify(existing.body)).not.toMatch(/resetToken|token|secret/i);
    expect(existing.body.errorKey).toBe("account.passwordReset.requested");
    expect(resolveRoutePermission("POST", "/api/account/password-reset/request").public).toBe(true);
    expect(resolveRoutePermission("POST", "/api/account/password-reset/confirm").public).toBe(true);
  });

  it("D valid token from createResetToken still confirms a password change", () => {
    const email = `reset-valid-${Date.now()}@example.invalid`;
    const registered = customerStore.register({
      email,
      password: "OldPassw0rd!",
      firstName: "Reset",
      lastName: "Valid",
      passwordConfirm: "OldPassw0rd!",
    });
    expect(registered.success).toBe(true);
    const minted = customerAuth.createResetToken(registered.customer.id, mockReq());
    expect(minted.limited).not.toBe(true);
    expect(minted.token).toMatch(/^[a-f0-9]{64}$/);

    const res = mockRes();
    accountRoutes["POST /api/account/password-reset/confirm"](
      mockReq({
        url: "/api/account/password-reset/confirm",
        body: { token: minted.token, password: "NewPassw0rd!", passwordConfirm: "NewPassw0rd!" },
      }),
      res
    );
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ success: true });
    expect(customerStore.verifyPassword(email, "NewPassw0rd!")).toBeTruthy();
    expect(customerStore.verifyPassword(email, "OldPassw0rd!")).toBeFalsy();
    const resetFile = path.join(__dirname, "../data/password-reset-tokens.json");
    const stored = fs.existsSync(resetFile) ? fs.readFileSync(resetFile, "utf8") : "";
    expect(stored).not.toContain(minted.token);
    expect(JSON.parse(stored || "[]").some((row) => row.token)).toBe(false);
  });

  it("E expired token is rejected", () => {
    const resetFile = path.join(__dirname, "../data/password-reset-tokens.json");
    const token = `expired-${Date.now()}`;
    const previous = fs.existsSync(resetFile) ? JSON.parse(fs.readFileSync(resetFile, "utf8") || "[]") : [];
    fs.writeFileSync(
      resetFile,
      JSON.stringify([...previous, { token, customerId: "cust-demo-001", expiresAt: Date.now() - 1000 }], null, 2)
    );
    expect(customerAuth.consumeResetToken(token)).toBeNull();
    const res = mockRes();
    accountRoutes["POST /api/account/password-reset/confirm"](
      mockReq({
        url: "/api/account/password-reset/confirm",
        body: { token, password: "Another1!", passwordConfirm: "Another1!" },
      }),
      res
    );
    expect(res.statusCode).toBe(400);
    expect(res.body.errorKey).toBe("account.passwordReset.invalidToken");
    expect(JSON.stringify(res.body)).not.toContain(token);
  });

  it("F consumed token cannot be reused", () => {
    const email = `reset-reuse-${Date.now()}@example.invalid`;
    const registered = customerStore.register({
      email,
      password: "OldPassw0rd!",
      firstName: "Reset",
      lastName: "Reuse",
    });
    const minted = customerAuth.createResetToken(registered.customer.id, mockReq());
    const first = mockRes();
    accountRoutes["POST /api/account/password-reset/confirm"](
      mockReq({
        url: "/api/account/password-reset/confirm",
        body: { token: minted.token, password: "ReusePass1!", passwordConfirm: "ReusePass1!" },
      }),
      first
    );
    expect(first.statusCode).toBe(200);
    const second = mockRes();
    accountRoutes["POST /api/account/password-reset/confirm"](
      mockReq({
        url: "/api/account/password-reset/confirm",
        body: { token: minted.token, password: "ReusePass2!", passwordConfirm: "ReusePass2!" },
      }),
      second
    );
    expect(second.statusCode).toBe(400);
    expect(second.body.errorKey).toBe("account.passwordReset.invalidToken");
    expect(JSON.stringify(second.body)).not.toContain(minted.token);
  });

  it("G HTTP reset request rate limiting remains enabled", () => {
    const prevTest = process.env.BUZZARD_TEST_MODE;
    delete process.env.BUZZARD_TEST_MODE;
    const email = `reset-limit-${Date.now()}@example.invalid`;
    let limited = null;
    try {
      for (let i = 0; i < 6; i += 1) {
        const res = mockRes();
        accountRoutes["POST /api/account/password-reset/request"](
          mockReq({ body: { email }, url: "/api/account/password-reset/request" }),
          res
        );
        if (res.statusCode === 429) {
          limited = res;
          break;
        }
      }
    } finally {
      if (prevTest === undefined) delete process.env.BUZZARD_TEST_MODE;
      else process.env.BUZZARD_TEST_MODE = prevTest;
    }
    expect(limited).not.toBeNull();
    expect(limited.body.errorKey).toBe("security.rateLimited");
    expect(JSON.stringify(limited.body)).not.toMatch(/resetToken|[a-f0-9]{64}/);
  });

  it("H request logs and identity HTTP responses do not include tokens", () => {
    const logs = [];
    const origLog = console.log;
    console.log = (...args) => logs.push(args.map(String).join(" "));
    try {
      const minted = customerAuth.createResetToken("cust-demo-001", mockReq({ url: "/api/account/password-reset/request" }));
      const res = mockRes();
      accountRoutes["POST /api/account/password-reset/request"](
        mockReq({ body: { email: "kunde@buzzard.de" }, url: "/api/account/password-reset/request" }),
        res
      );
      expect(JSON.stringify(res.body)).not.toContain(minted.token);
    } finally {
      console.log = origLog;
    }
    expect(logs.join(" ")).not.toMatch(/resetToken/);

    const identityPlugin = require("../plugins/identitySecurityPlugin.js");
    const identityRoutes = captureRoutes(identityPlugin);
    const identityRes = mockRes();
    identityRoutes["POST /api/identity-security/auth/password-reset-request"](
      mockReq({ url: "/api/identity-security/auth/password-reset-request", body: { email: "nobody@example.invalid" } }),
      identityRes
    );
    expect(identityRes.body).toEqual({ ok: true });
    expect(identityRes.body.resetTokenForDevelopment).toBeUndefined();

    const src = fs.readFileSync(path.join(__dirname, "../plugins/customerAccountPlugin.js"), "utf8");
    expect(src).not.toMatch(/resetToken:\s*reset\.token/);
    const ui = fs.readFileSync(path.join(__dirname, "../../components/account/AccountPasswordResetRequest.tsx"), "utf8");
    expect(ui).not.toMatch(/result\.resetToken/);
    expect(ui).not.toMatch(/Demo-Token/);
  });

  it("I GET /api/submissions rejects anonymous and orders.read-only staff, allows security.manage", () => {
    expect(resolveRoutePermission("GET", "/api/submissions")).toEqual({ permission: "security.manage" });
    const unauth = mockRes();
    wrapRouteHandler("GET", "/api/submissions", () => {
      throw new Error("handler must not run");
    })(mockReq({ method: "GET", url: "/api/submissions" }), unauth);
    expect(unauth.statusCode).toBe(401);

    const handler = contactRoutes["GET /api/submissions"];
    const anon = mockRes();
    handler(mockReq({ method: "GET", url: "/api/submissions", headers: {} }), anon);
    expect(anon.statusCode).toBe(401);
    expect(anon.body.errorKey).toBe("admin.auth.required");

    const auth = require("../lib/auth");
    const ordersLogin = auth.login("orders@buzzard.de", "BuzzardOrders2026!", mockReq({ url: "/api/admin/login" }));
    expect(ordersLogin.success).toBe(true);
    const forbidden = mockRes();
    handler(
      mockReq({
        method: "GET",
        url: "/api/submissions",
        headers: { authorization: `Bearer ${ordersLogin.token}` },
      }),
      forbidden
    );
    expect(forbidden.statusCode).toBe(403);
    expect(forbidden.body.errorKey).toBe("admin.auth.forbidden");

    const readonlyLogin = auth.login("readonly@buzzard.de", "BuzzardRead2026!", mockReq({ url: "/api/admin/login" }));
    expect(readonlyLogin.success).toBe(true);
    const readonlyDenied = mockRes();
    handler(
      mockReq({
        method: "GET",
        url: "/api/submissions",
        headers: { authorization: `Bearer ${readonlyLogin.token}` },
      }),
      readonlyDenied
    );
    expect(readonlyDenied.statusCode).toBe(403);

    const adminLogin = auth.login("admin@buzzard.de", "BuzzardAdmin2026!", mockReq({ url: "/api/admin/login" }));
    expect(adminLogin.success).toBe(true);
    const allowed = mockRes();
    handler(
      mockReq({
        method: "GET",
        url: "/api/submissions",
        headers: { authorization: `Bearer ${adminLogin.token}` },
      }),
      allowed
    );
    expect(allowed.statusCode).toBe(200);
    expect(Array.isArray(allowed.body.submissions)).toBe(true);

    const pluginSrc = fs.readFileSync(path.join(__dirname, "../plugins/contactStoragePlugin.js"), "utf8");
    expect(pluginSrc).toMatch(/requirePermission\(req, res, 'security\.manage'\)/);
    expect(pluginSrc).not.toMatch(/requirePermission\(req, res, 'orders\.read'\)/);
    expect(pluginSrc).not.toMatch(/requirePermission\(req, res, 'security\.read'\)/);
  });
});
