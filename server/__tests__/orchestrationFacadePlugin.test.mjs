import { afterAll, afterEach, describe, expect, it } from "vitest";
import { createRequire } from "node:module";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const require = createRequire(import.meta.url);
const { SEED_IDS } = require("../lib/buzzardNative/core/identityRegistry.js");
const { resolveRoutePermission } = require("../lib/routePermissions.js");
const phoneAssistant = require("../lib/phoneAssistantService.js");

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "buzzard-facade-http-"));
process.env.BUZZARD_AUDIT_DIR = tempDir;
const pluginModule = require("../plugins/orchestrationFacadePlugin.js");

const dbPath = path.join(process.cwd(), "server/data/buzzard.db");
const ordersPath = path.join(process.cwd(), "server/data/orders.json");
const securityLogPath = path.join(process.cwd(), "server/data/security-log.json");
const originalRead = phoneAssistant.getVerifiedOrderStatus;
const seedOrder = [
  "pusat",
  "sinan_bey",
  "esat_bey",
  "dogu_bey",
  "nedim_bey",
  "tuncay_bey",
  "amelia",
  "adrian",
  "mira",
  "leon",
  "stock_ai",
  "category_ai",
  "pricing_ai",
  "seo_ai",
  "banu_hanim",
  "sales_analysis_ai",
  "zeynep_hanim",
];

function fileMark(file) {
  if (!fs.existsSync(file)) return null;
  const stat = fs.statSync(file);
  return { ino: stat.ino, size: stat.size, mtimeMs: stat.mtimeMs };
}

const dbBefore = fileMark(dbPath);
const ordersBefore = fileMark(ordersPath);
const securityBefore = fs.existsSync(securityLogPath) ? fs.readFileSync(securityLogPath) : null;

function mockRes() {
  return {
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
}

function adminReq(body, role = "admin") {
  return {
    body,
    headers: {},
    url: "/api/admin/orchestration/dispatch",
    adminUser: { userId: "synthetic-admin", role, name: "Synthetic" },
  };
}

function enabledPlugin() {
  return pluginModule.createOrchestrationFacadePlugin({
    enabled: true,
    approvalDbPath: path.join(tempDir, "approvals.sqlite"),
  });
}

afterEach(() => {
  phoneAssistant.getVerifiedOrderStatus = originalRead;
});

afterAll(() => {
  if (securityBefore === null) {
    if (fs.existsSync(securityLogPath)) fs.unlinkSync(securityLogPath);
  } else {
    fs.writeFileSync(securityLogPath, securityBefore);
  }
});

describe("orchestrationFacadePlugin", () => {
  it("is picked up by the plugin directory and registers the dispatch route", () => {
    const names = fs.readdirSync(path.join(process.cwd(), "server/plugins")).filter((name) => name.endsWith(".js"));
    expect(names).toContain("orchestrationFacadePlugin.js");
    expect(typeof pluginModule.register).toBe("function");
    const routes = [];
    pluginModule.register({
      post(routePath, handler) {
        routes.push({ routePath, handler });
      },
    });
    expect(routes.map((route) => route.routePath)).toContain("/api/admin/orchestration/dispatch");
  });

  it("requires ai.assign on the exact admin route", () => {
    expect(resolveRoutePermission("POST", "/api/admin/orchestration/dispatch")).toEqual({
      permission: "ai.assign",
    });
  });

  it("returns 503 while the facade flag is off and does not read an order", async () => {
    let calls = 0;
    phoneAssistant.getVerifiedOrderStatus = () => {
      calls += 1;
      return { ok: true };
    };
    const plugin = pluginModule.createOrchestrationFacadePlugin({
      enabled: false,
      approvalDbPath: path.join(tempDir, "disabled.sqlite"),
    });
    const res = mockRes();
    await plugin.handleDispatch(adminReq({
      action: "GET_ORDER",
      agentId: "pusat",
      payload: { orderNumber: "B-1001", email: "buyer@example.com" },
    }), res);
    plugin.close();
    expect(res.statusCode).toBe(503);
    expect(res.body.errorCode).toBe("ORCHESTRATION_FACADE_DISABLED");
    expect(res.body.productionReady).toBe(false);
    expect(res.body.salesOpen).toBe(false);
    expect(calls).toBe(0);
    expect(fs.existsSync(path.join(tempDir, "disabled.sqlite"))).toBe(false);
  });

  it("rejects a missing session and a role without ai.assign", async () => {
    const plugin = enabledPlugin();
    const anonymous = mockRes();
    await plugin.handleDispatch({ body: { action: "GET_ORDER" }, headers: {}, url: "/api/admin/orchestration/dispatch" }, anonymous);
    const staff = mockRes();
    await plugin.handleDispatch(adminReq({ action: "GET_ORDER", agentId: "pusat" }, "staff"), staff);
    plugin.close();
    expect(anonymous.statusCode).toBe(401);
    expect(staff.statusCode).toBe(403);
    expect(staff.body.errorKey).toBe("admin.auth.forbidden");
  });

  it("reads GET_ORDER only through the policy adapter", async () => {
    const seen = [];
    phoneAssistant.getVerifiedOrderStatus = (input) => {
      seen.push(input);
      return {
        ok: true,
        verified: true,
        orderNumber: input.orderNumber,
        status: "paid",
        statusLabel: "Bezahlt",
        message: "Bestellung B-1001: Bezahlt",
        escalate: false,
        paymentStatus: "captured",
      };
    };
    const plugin = enabledPlugin();
    const res = mockRes();
    await plugin.handleDispatch(adminReq({
      action: "GET_ORDER",
      agentId: "pusat",
      payload: { orderNumber: "B-1001", email: "buyer@example.com", postalCode: "10115", locale: "de" },
    }), res);
    plugin.close();
    expect(res.statusCode).toBe(200);
    expect(res.body.status).toBe("SUCCESS");
    expect(res.body.result.paymentStatus).toBeUndefined();
    expect(res.body.moneyMoved).toBe(false);
    expect(res.body.salesOpen).toBe(false);
    expect(res.body.egressAllowed).toBe(false);
    expect(res.body.productionReady).toBe(false);
    expect(seen).toHaveLength(1);
  });

  it("reports a missed order as GET_ORDER_FAILED", async () => {
    const plugin = enabledPlugin();
    const res = mockRes();
    await plugin.handleDispatch(adminReq({
      action: "GET_ORDER",
      agentId: "zeynep_hanim",
      payload: { orderNumber: "B-MISSING", email: "nobody@example.com" },
    }), res);
    plugin.close();
    expect(res.statusCode).toBe(404);
    expect(res.body.errorCode).toBe("GET_ORDER_FAILED");
    expect(res.body.orderChanged).toBe(false);
  });

  it("allows ASSIGN_TASK only from Pusat", async () => {
    const plugin = enabledPlugin();
    const allowed = mockRes();
    await plugin.handleDispatch(adminReq({
      action: "ASSIGN_TASK",
      fromId: "pusat",
      assigneeId: "sinan_bey",
      title: "synthetic assignment",
    }), allowed);
    const denied = mockRes();
    await plugin.handleDispatch(adminReq({
      action: "ASSIGN_TASK",
      fromId: "sinan_bey",
      assigneeId: "esat_bey",
    }), denied);
    const listed = plugin.facade.router.list();
    plugin.close();
    expect(allowed.statusCode).toBe(200);
    expect(allowed.body.status).toBe("ASSIGNED");
    expect(allowed.body.agentId).toBe("pusat");
    expect(allowed.body.assigneeId).toBe("sinan_bey");
    expect(denied.statusCode).toBe(403);
    expect(denied.body.errorCode).toBe("ASSIGN_TASK_DENIED");
    expect(listed).toHaveLength(1);
    expect(listed[0].requestedBy).toBe("pusat");
    expect([...SEED_IDS]).toEqual(seedOrder);
  });

  it("records one Human Approval Center row and replays the same key", async () => {
    const plugin = enabledPlugin();
    const first = mockRes();
    const second = mockRes();
    const body = {
      action: "CANCEL_ORDER",
      agentId: "pusat",
      idempotencyKey: "idem-http-01",
      payload: { email: "buyer@example.com", risk: "LOW" },
    };
    await plugin.handleDispatch(adminReq(body), first);
    await plugin.handleDispatch(adminReq(body), second);
    plugin.close();

    const Database = require("better-sqlite3");
    const db = new Database(path.join(tempDir, "approvals.sqlite"), { readonly: true });
    const approvals = db.prepare("SELECT action, status, requested_by FROM orch_approvals").all();
    const tasks = db.prepare("SELECT COUNT(*) AS n FROM orch_tasks").get().n;
    const core = db.prepare("SELECT name FROM sqlite_master WHERE name IN ('core_ai_tasks', 'core_approvals')").all();
    db.close();

    expect(first.statusCode).toBe(202);
    expect(first.body.status).toBe("WAITING_APPROVAL");
    expect(first.body.humanRequiredAction).toBe("ORDER_CANCEL");
    expect(first.body.auto).toBe(false);
    expect(first.body.moneyMoved).toBe(false);
    expect(JSON.stringify(first.body)).not.toContain("buyer@example.com");
    expect(second.statusCode).toBe(202);
    expect(second.body.replay).toBe(true);
    expect(second.body.approvalCreated).toBe(false);
    expect(approvals).toEqual([{ action: "ORDER_CANCEL", status: "WAITING_APPROVAL", requested_by: "pusat" }]);
    expect(tasks).toBe(0);
    expect(core).toEqual([]);
    expect(fileMark(dbPath)).toEqual(dbBefore);
    expect(fileMark(ordersPath)).toEqual(ordersBefore);
  });

  it("does not add a task queue, approval table, or auth system", () => {
    const source = fs.readFileSync(path.join(process.cwd(), "server/plugins/orchestrationFacadePlugin.js"), "utf8");
    expect(source).not.toMatch(/require\(["'][^"']*controlCenter|createAiTask|createApproval\(|better-sqlite3|buzzard\.db/);
    expect(source).toMatch(/policyAdapter\.assignmentAuthority/);
    expect(source).toMatch(/facade\.dispatch/);
    expect(fileMark(dbPath)).toEqual(dbBefore);
    expect(fileMark(ordersPath)).toEqual(ordersBefore);
  });
});
