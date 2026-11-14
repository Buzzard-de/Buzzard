import { afterAll, describe, expect, it } from "vitest";
import { createRequire } from "node:module";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const require = createRequire(import.meta.url);
const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "buzzard-cc-bridge-"));
const previousAuditDir = process.env.BUZZARD_AUDIT_DIR;
const previousFacade = process.env.BUZZARD_ORCHESTRATION_FACADE;
process.env.BUZZARD_AUDIT_DIR = tempDir;
delete process.env.BUZZARD_ORCHESTRATION_FACADE;

const { SEED_IDS } = require("../lib/buzzardNative/core/identityRegistry.js");
const { createOrchestrationFacade } = require("../lib/orchestrationFacade.js");
const { createControlCenterHandlers } = require("../plugins/controlCenterPlugin.js");
const orchestrator = require("../lib/aiOrchestrator.js");
const Database = require("better-sqlite3");

const repoRoot = path.resolve(__dirname, "../..");
const dbPath = path.join(repoRoot, "server/data/buzzard.db");
const ordersPath = path.join(repoRoot, "server/data/orders.json");
const approvalPath = path.join(tempDir, "approvals.sqlite");
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

function mockRes() {
  return {
    statusCode: 200,
    body: null,
    headersSent: false,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      this.headersSent = true;
      return this;
    },
  };
}

function adminReq(body, params = {}, role = "admin") {
  return {
    body,
    params,
    query: {},
    headers: {},
    adminUser: {
      userId: "synthetic-admin",
      role,
      email: "client@example.com",
      name: "Synthetic",
    },
  };
}

function counts(file) {
  if (!fs.existsSync(file)) return { approvals: 0, tasks: 0, dead: 0, core: [] };
  const db = new Database(file, { readonly: true, fileMustExist: true });
  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type = 'table'").all().map((row) => row.name);
  const countOf = (name) => (tables.includes(name) ? db.prepare(`SELECT COUNT(*) AS n FROM ${name}`).get().n : 0);
  const result = {
    approvals: countOf("orch_approvals"),
    tasks: countOf("orch_tasks"),
    dead: countOf("orch_dead"),
    core: tables.filter((name) => name.startsWith("core_")),
  };
  db.close();
  return result;
}

function approvalRow(file, id) {
  const db = new Database(file, { readonly: true, fileMustExist: true });
  const row = db.prepare("SELECT status, decided_by, requested_by, action FROM orch_approvals WHERE id = ?").get(id);
  db.close();
  return row;
}

const facade = createOrchestrationFacade({ enabled: true, approvalDbPath: approvalPath });
const handlers = createControlCenterHandlers({ facade });
const disabled = createControlCenterHandlers({
  facade: createOrchestrationFacade({ enabled: false, approvalDbPath: path.join(tempDir, "disabled.sqlite") }),
});

afterAll(() => {
  facade.close();
  if (previousAuditDir === undefined) delete process.env.BUZZARD_AUDIT_DIR;
  else process.env.BUZZARD_AUDIT_DIR = previousAuditDir;
  if (previousFacade === undefined) delete process.env.BUZZARD_ORCHESTRATION_FACADE;
  else process.env.BUZZARD_ORCHESTRATION_FACADE = previousFacade;
});

describe("control center facade bridge", () => {
  it("keeps the 17 official identities in SEED_IDS order", () => {
    expect([...SEED_IDS]).toEqual(seedOrder);
    expect(SEED_IDS).toHaveLength(17);
  });

  it("assigns one official task through Pusat and does not enqueue work", async () => {
    const res = mockRes();
    await handlers.postTask(adminReq({
      title: "Synthetic stock check",
      description: "isolated",
      employeeId: "sinan_bey",
      priority: "NORMAL",
      permissionsRequired: ["ai.read"],
    }), res);
    expect(res.statusCode).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.task.employeeId).toBe("sinan_bey");
    expect(res.body.task.status).toBe("ASSIGNED");
    expect(res.body.task.payload).toEqual({});
    const history = facade.router.history();
    expect(history).toHaveLength(1);
    expect(history[0].requestedBy).toBe("pusat");
    expect(history[0].assignees).toEqual(["sinan_bey"]);
    expect(history[0].state).toBe("ASSIGNED");
    expect(history[0].completed).toBe(false);
    expect(counts(approvalPath).tasks).toBe(0);
  });

  it("rejects identities outside the 17 official ids", async () => {
    for (const employeeId of ["product_ai", "price_ai", "finance_ai", "order_ai", "security_ai", ""]) {
      const res = mockRes();
      await handlers.postTask(adminReq({ title: "no", employeeId }), res);
      expect(res.statusCode).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.errorCode).toBe("UNKNOWN_AGENT");
    }
    expect(facade.router.history()).toHaveLength(1);
  });

  it("refuses client COMPLETED and RUNNING without writing a task status", async () => {
    const before = facade.router.history()[0];
    for (const status of ["COMPLETED", "RUNNING", "CANCELLED"]) {
      const res = mockRes();
      await handlers.patchTaskStatus(adminReq({ status }, { id: before.taskId }), res);
      expect(res.statusCode).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.errorCode).toBe("HUMAN_GATE_REQUIRED");
      expect(res.body.executed).toBe(false);
    }
    expect(facade.router.history()[0]).toEqual(before);
  });

  it("accepts only a human-required action and stores one approval", async () => {
    const reports = mockRes();
    await handlers.postApproval(adminReq({
      action: "CREATE_REPORTS",
      riskLevel: "LOW",
      idempotencyKey: "reports-should-not-run",
    }), reports);
    expect(reports.statusCode).toBe(501);
    expect(reports.body.success).toBe(false);
    expect(reports.body.auto).toBe(false);

    const smoke = mockRes();
    await handlers.postApproval(adminReq({
      resourceType: "smoke_test",
      riskLevel: "LOW",
      idempotencyKey: "smoke-should-not-run",
    }), smoke);
    expect(smoke.statusCode).toBe(501);
    expect(smoke.body.errorCode).toBe("NOT_IMPLEMENTED");

    const created = mockRes();
    await handlers.postApproval(adminReq({
      action: "REAL_PAYMENT_CAPTURE",
      resourceType: "payment",
      riskLevel: "LOW",
      idempotencyKey: "payment-gate-001",
      reason: "synthetic gate",
    }), created);
    expect(created.statusCode).toBe(201);
    expect(created.body.success).toBe(true);
    expect(created.body.approval.status).toBe("PENDING");
    expect(created.body.approval.riskLevel).toBe("CRITICAL");
    expect(created.body.approval.decidedBy).toBe(null);

    const replay = mockRes();
    await handlers.postApproval(adminReq({
      action: "REAL_PAYMENT_CAPTURE",
      idempotencyKey: "payment-gate-001",
    }), replay);
    expect(replay.statusCode).toBe(200);
    expect(replay.body.approval.id).toBe(created.body.approval.id);

    const stored = counts(approvalPath);
    expect(stored.approvals).toBe(1);
    expect(stored.tasks).toBe(0);
    expect(stored.core).toEqual([]);
  });

  it("decides as operator and does not start payment or a task", async () => {
    const pending = facade.router.history();
    const created = mockRes();
    await handlers.postApproval(adminReq({
      action: "REAL_PAYMENT_CAPTURE",
      idempotencyKey: "payment-gate-001",
    }), created);
    const res = mockRes();
    await handlers.decideApproval(adminReq({
      decision: "approve",
      actorId: "human",
      decidedBy: "client@example.com",
      email: "client@example.com",
    }, { id: created.body.approval.id }), res);
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.approval.status).toBe("APPROVED");
    expect(res.body.approval.decidedBy).toBe("operator");
    expect(res.body.approval.decidedBy).not.toBe("client@example.com");
    const row = approvalRow(approvalPath, created.body.approval.id);
    expect(row.decided_by).toBe("operator");
    expect(row.requested_by).toBe("pusat");
    expect(row.status).toBe("APPROVED");
    expect(counts(approvalPath)).toMatchObject({ approvals: 1, tasks: 0, dead: 0, core: [] });
    expect(facade.router.history()).toEqual(pending);

    const resumed = orchestrator.resumeAfterApproval(created.body.approval.taskId);
    const queued = orchestrator.enqueueTaskProcessing(created.body.approval.taskId);
    const processed = await orchestrator.processTask(created.body.approval.taskId);
    for (const result of [resumed, queued, processed]) {
      expect(result.ok).toBe(false);
      expect(result.code).toBe("HUMAN_GATE_REQUIRED");
      expect(result.executed).toBe(false);
      expect(result.purchased).toBe(false);
      expect(result.moneyMoved).toBe(false);
      expect(result.refunded).toBe(false);
      expect(result.shipmentCreated).toBe(false);
      expect(result.salesOpen).toBe(false);
      expect(result.egressAllowed).toBe(false);
      expect(result.productionReady).toBe(false);
    }
    expect(orchestrator.selectEmployeeForTask()).toBe(null);
    expect(counts(approvalPath).tasks).toBe(0);
    expect(facade.router.history()[0].state).toBe("ASSIGNED");
    expect(facade.router.history()[0].completed).toBe(false);
  });

  it("returns 503 and does not fall back to core writes when the facade is off", async () => {
    const task = mockRes();
    await disabled.postTask(adminReq({ title: "x", employeeId: "sinan_bey" }), task);
    const status = mockRes();
    await disabled.patchTaskStatus(adminReq({ status: "COMPLETED" }, { id: "task-x" }), status);
    const approval = mockRes();
    await disabled.postApproval(adminReq({ action: "CANCEL_ORDER", idempotencyKey: "cancel-disabled" }), approval);
    const decision = mockRes();
    await disabled.decideApproval(adminReq({ decision: "approve", email: "client@example.com" }, { id: "appr-x" }), decision);
    for (const res of [task, status, approval, decision]) {
      expect(res.statusCode).toBe(503);
      expect(res.body.success).toBe(false);
      expect(res.body.errorCode).toBe("ORCHESTRATION_FACADE_DISABLED");
      expect(res.body.executed).toBe(false);
    }
    expect(fs.existsSync(path.join(tempDir, "disabled.sqlite"))).toBe(false);
    expect(facade.router.history()).toHaveLength(1);
  });

  it("uses the shared facade and returns 503 while the flag is off", async () => {
    delete process.env.BUZZARD_ORCHESTRATION_FACADE;
    const shared = createControlCenterHandlers();
    const res = mockRes();
    await shared.postTask(adminReq({ title: "shared", employeeId: "sinan_bey" }), res);
    expect(res.statusCode).toBe(503);
    expect(res.body.errorCode).toBe("ORCHESTRATION_FACADE_DISABLED");
    expect(facade.router.history()).toHaveLength(1);
  });

  it("keeps historical list responses on the injected read path", () => {
    const readers = {
      listAiTasks(filter) {
        expect(filter.employeeId).toBe("sinan_bey");
        return [{ id: "legacy-task", title: "historical", employeeId: "sinan_bey", status: "PENDING" }];
      },
      listApprovals(status) {
        expect(status).toBe("PENDING");
        return [{ id: "legacy-approval", status: "PENDING" }];
      },
    };
    const routes = {};
    createControlCenterHandlers({ facade, readers }).register({
      get(route, handler) { routes[`GET ${route}`] = handler; },
      post(route, handler) { routes[`POST ${route}`] = handler; },
      patch(route, handler) { routes[`PATCH ${route}`] = handler; },
      put(route, handler) { routes[`PUT ${route}`] = handler; },
    });
    const tasks = mockRes();
    routes["GET /api/admin/ai/tasks"]({ ...adminReq({}), query: { employeeId: "sinan_bey" } }, tasks);
    expect(tasks.body).toEqual({
      success: true,
      tasks: [{ id: "legacy-task", title: "historical", employeeId: "sinan_bey", status: "PENDING" }],
    });
    const approvals = mockRes();
    routes["GET /api/admin/approvals"]({ ...adminReq({}), query: { status: "PENDING" } }, approvals);
    expect(approvals.body).toEqual({
      success: true,
      approvals: [{ id: "legacy-approval", status: "PENDING" }],
    });
    expect(routes["POST /api/admin/ai/tasks"]).toBeTypeOf("function");
    expect(routes["PATCH /api/admin/ai/tasks/:id/status"]).toBeTypeOf("function");
    expect(routes["POST /api/admin/approvals"]).toBeTypeOf("function");
    expect(routes["POST /api/admin/approvals/:id/decide"]).toBeTypeOf("function");
  });

  it("does not open the commerce database or orders file", () => {
    expect(fileMark(dbPath)).toEqual(dbBefore);
    expect(fileMark(ordersPath)).toEqual(ordersBefore);
    expect(ordersBefore).toBe(null);
    const loadedDb = Object.keys(require.cache).some((key) => key.endsWith(`${path.sep}server${path.sep}lib${path.sep}db.js`));
    expect(loadedDb).toBe(false);
    expect(process.env.BUZZARD_SALES_ENABLED).not.toBe("1");
  });

  it("blocks the orchestrator module from provider and database imports", () => {
    const source = fs.readFileSync(path.join(repoRoot, "server/lib/aiOrchestrator.js"), "utf8");
    expect(source).not.toMatch(/require\(["']\.\/db["']\)|require\(["']\.\/controlCenter["']\)|require\(["']\.\/aiProviders["']\)|executeWithProvider/);
    const pluginSource = fs.readFileSync(path.join(repoRoot, "server/plugins/controlCenterPlugin.js"), "utf8");
    expect(pluginSource).not.toMatch(/createAiTask|updateTaskStatus|createApproval|enqueueTaskProcessing|resumeAfterApproval|executeWithProvider/);
  });
});
