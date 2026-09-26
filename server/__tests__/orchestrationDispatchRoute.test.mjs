import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { createRequire } from "node:module";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const require = createRequire(import.meta.url);

function uniqueKey(prefix) {
  return `${prefix}_${crypto.randomBytes(8).toString("hex")}`;
}

function mockRes() {
  return {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(data) {
      this.body = data;
      return this;
    },
  };
}

function adminReq(overrides = {}) {
  return {
    method: "POST",
    url: "/api/admin/orchestration/dispatch",
    headers: {},
    correlationId: overrides.correlationId || `corr_${crypto.randomBytes(4).toString("hex")}`,
    adminUser: overrides.adminUser === undefined
      ? { email: "admin@test.buzzard", role: "admin", userId: "u_admin" }
      : overrides.adminUser,
    body: overrides.body || {},
  };
}

describe("POST /api/admin/orchestration/dispatch", () => {
  const envBackup = { ...process.env };

  beforeEach(() => {
    process.env.PUSAT_RUNTIME_ENABLED = "0";
    process.env.BUZZARD_SALES_ENABLED = "0";
    delete process.env.BUZZARD_ORCHESTRATION_FACADE;
    delete process.env.BUZZARD_CSRF_ENFORCE;
  });

  afterEach(() => {
    process.env = { ...envBackup };
    const { db } = require("../lib/db.js");
    const controlCenter = require("../lib/controlCenter.js");
    const rows = db
      .prepare(
        `SELECT id FROM core_approvals
         WHERE status = 'PENDING' AND reason LIKE 'HUMAN_APPROVAL_REQUIRED:%'`
      )
      .all();
    for (const row of rows) {
      controlCenter.decideApproval(row.id, "reject", "orchestration-route-tests");
    }
  });

  it("route is registered by the plugin", () => {
    const registered = [];
    const plugin = require("../plugins/orchestrationFacadePlugin.js");
    plugin.register({
      post(routePath, handler) {
        registered.push({ routePath, handler });
      },
    });
    expect(registered).toHaveLength(1);
    expect(registered[0].routePath).toBe("/api/admin/orchestration/dispatch");
    expect(typeof registered[0].handler).toBe("function");
  });

  it("default flag OFF guards execution (503 DISABLED, no task)", async () => {
    delete process.env.BUZZARD_ORCHESTRATION_FACADE;
    const { handleDispatch } = require("../plugins/orchestrationFacadePlugin.js");
    const { db } = require("../lib/db.js");
    const key = uniqueKey("idemp");
    const res = mockRes();
    await handleDispatch(
      adminReq({
        body: {
          action: "GET_ORDER",
          idempotencyKey: key,
          payload: { orderNumber: "X", email: "a@b.c" },
        },
      }),
      res
    );
    expect(res.statusCode).toBe(503);
    expect(res.body.status).toBe("DISABLED");
    expect(res.body.errorCode).toBe("ORCHESTRATION_FACADE_DISABLED");
    const created = db
      .prepare(`SELECT COUNT(*) n FROM core_ai_tasks WHERE json_extract(payload_json, '$.idempotencyKey') = ?`)
      .get(key);
    expect(created.n).toBe(0);
  });

  it("enabled facade routes GET_ORDER through the composer", async () => {
    process.env.BUZZARD_ORCHESTRATION_FACADE = "1";
    const { handleDispatch } = require("../plugins/orchestrationFacadePlugin.js");
    const res = mockRes();
    await handleDispatch(
      adminReq({
        body: {
          action: "GET_ORDER",
          idempotencyKey: uniqueKey("idemp"),
          payload: { orderNumber: "NO-SUCH-ORDER-ROUTE", email: "nobody@test.buzzard" },
        },
      }),
      res
    );
    expect(res.statusCode).toBe(404);
    expect(res.body.errorCode).toBe("GET_ORDER_FAILED");
    expect(res.body.taskId).toMatch(/^task_/);
    expect(res.body.result.ok).toBe(false);
  });

  it("unauthorized request is rejected by wrapRouteHandler", () => {
    const { wrapRouteHandler } = require("../lib/globalAuthMiddleware.js");
    const { handleDispatch } = require("../plugins/orchestrationFacadePlugin.js");
    const handler = wrapRouteHandler("POST", "/api/admin/orchestration/dispatch", handleDispatch);
    const res = mockRes();
    handler({ method: "POST", url: "/api/admin/orchestration/dispatch", headers: {}, body: {} }, res);
    expect(res.statusCode).toBe(401);
    expect(res.body.errorKey).toBe("admin.auth.required");
  });

  it("staff without ai.assign is rejected", () => {
    const { wrapRouteHandler } = require("../lib/globalAuthMiddleware.js");
    const { handleDispatch } = require("../plugins/orchestrationFacadePlugin.js");
    const handler = wrapRouteHandler("POST", "/api/admin/orchestration/dispatch", handleDispatch);
    const res = mockRes();
    handler(
      adminReq({
        adminUser: { email: "staff@test.buzzard", role: "staff", userId: "u_staff" },
        body: { action: "GET_ORDER", idempotencyKey: uniqueKey("idemp"), payload: {} },
      }),
      res
    );
    expect(res.statusCode).toBe(403);
    expect(res.body.errorKey).toBe("admin.auth.forbidden");
  });

  it("authorized admin reaches the facade (permission + handler)", async () => {
    process.env.BUZZARD_ORCHESTRATION_FACADE = "1";
    const { wrapRouteHandler } = require("../lib/globalAuthMiddleware.js");
    const { handleDispatch } = require("../plugins/orchestrationFacadePlugin.js");
    const { can } = require("../lib/rbac.js");
    expect(can("admin", "ai.assign")).toBe(true);
    const handler = wrapRouteHandler("POST", "/api/admin/orchestration/dispatch", handleDispatch);
    const res = mockRes();
    await handler(
      adminReq({
        body: {
          action: "GET_PRODUCT",
          idempotencyKey: uniqueKey("idemp"),
          payload: {},
        },
      }),
      res
    );
    expect(res.statusCode).toBe(501);
    expect(res.body.status).toBe("NOT_IMPLEMENTED");
  });

  it("PUSAT_RUNTIME_ENABLED stays OFF and is not required", async () => {
    delete process.env.PUSAT_RUNTIME_ENABLED;
    process.env.BUZZARD_ORCHESTRATION_FACADE = "1";
    const facade = require("../lib/orchestrationFacade.js");
    const bridge = require("../lib/pusatRuntimeBridge.js");
    expect(facade.isPusatRuntimeEnabled()).toBe(false);
    expect(bridge.isPusatRuntimeEnabled()).toBe(false);
    const { handleDispatch } = require("../plugins/orchestrationFacadePlugin.js");
    const res = mockRes();
    await handleDispatch(
      adminReq({
        body: {
          action: "CHECK_PRICE",
          idempotencyKey: uniqueKey("idemp"),
          payload: {},
        },
      }),
      res
    );
    expect(res.body.status).toBe("NOT_IMPLEMENTED");
    expect(bridge.isPusatRuntimeEnabled()).toBe(false);
  });

  it("plugin and route do not call the Pusat processor", () => {
    const pluginSrc = fs.readFileSync(
      path.join(process.cwd(), "server/plugins/orchestrationFacadePlugin.js"),
      "utf8"
    );
    expect(pluginSrc).toMatch(/orchestrationFacade\.dispatch/);
    expect(pluginSrc).not.toMatch(/pusatRuntimeBridge/);
    expect(pluginSrc).not.toMatch(/dispatchPusatTask/);
    expect(pluginSrc).not.toMatch(/fetchOrchestrator/);
    expect(pluginSrc).not.toMatch(/enqueueTaskProcessing/);
    expect(pluginSrc).not.toMatch(/paymentsFinance/);
    expect(pluginSrc).not.toMatch(/createOrder/);
    expect(pluginSrc).not.toMatch(/marketplaceHub/);
  });

  it("route permission map is ai.assign and not public", () => {
    const { resolveRoutePermission, PUBLIC_ROUTES } = require("../lib/routePermissions.js");
    expect(PUBLIC_ROUTES.has("POST /api/admin/orchestration/dispatch")).toBe(false);
    expect(resolveRoutePermission("POST", "/api/admin/orchestration/dispatch")).toEqual({
      permission: "ai.assign",
    });
  });
});
