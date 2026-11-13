import { afterAll, describe, expect, it } from "vitest";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const require = createRequire(import.meta.url);
const testDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(testDir, "../..");
const commerceDb = path.join(repoRoot, "server/data/buzzard.db");
const ordersPath = path.join(repoRoot, "server/data/orders.json");

function fileMark(file) {
  if (!fs.existsSync(file)) return null;
  const stat = fs.statSync(file);
  return { ino: stat.ino, size: stat.size, mtimeMs: stat.mtimeMs };
}

const dbBefore = fileMark(commerceDb);
const ordersBefore = fileMark(ordersPath);
const previousRuntime = process.env.PUSAT_RUNTIME_ENABLED;
process.env.PUSAT_RUNTIME_ENABLED = "1";

const dbResolved = require.resolve("../lib/db.js");
require.cache[dbResolved] = {
  id: dbResolved,
  filename: dbResolved,
  loaded: true,
  exports: {
    db: {
      prepare() {
        return { get() { return null; }, all() { return []; }, run() { return {}; } };
      },
      exec() {},
      transaction(fn) { return fn; },
      close() {},
    },
    getDatabaseHealth() { return { ok: false, mocked: true }; },
  },
};

const authResolved = require.resolve("../lib/auth.js");
require.cache[authResolved] = {
  id: authResolved,
  filename: authResolved,
  loaded: true,
  exports: {
    requireAuth(req, res) {
      if (!req.adminUser?.role) {
        res.status(401).json({ success: false, errorKey: "admin.auth.required" });
        return null;
      }
      return req.adminUser;
    },
  },
};

const pusat = require("../lib/pusat/runtime.js");
const { can } = require("../lib/rbac.js");
const { createApprovalCenter } = require("../lib/pusat/humanApproval.js");
const { forget } = require("../lib/pusat/orchRuntime.js");
const { SEED_IDS } = require("../lib/buzzardNative/core/identityRegistry.js");
const plugin = require("../plugins/masterIntegrationPlugin.js");
const Database = require("better-sqlite3");

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "buzzard-decider-"));
const opened = [];
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

function seed(name) {
  const file = path.join(tempDir, `${name}.sqlite`);
  const center = createApprovalCenter({ dbPath: file });
  const submitted = center.submit({
    action: "ORDER_CANCEL",
    requestedBy: "pusat",
    reason: "synthetic",
    risk: "CRITICAL",
    taskId: `task-${name}`,
  });
  center.close();
  if (!submitted.item?.id) throw new Error(`seed failed: ${name}`);
  return { file, id: submitted.item.id };
}

function stored(file, id) {
  const db = new Database(file, { readonly: true, fileMustExist: true });
  const item = db.prepare("SELECT status, decided_by, action, requested_by FROM orch_approvals WHERE id = ?").get(id);
  const tasks = db.prepare("SELECT COUNT(*) AS n FROM orch_tasks").get().n;
  const core = db.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name LIKE 'core_%'").all();
  db.close();
  return { ...item, tasks, core: core.map((row) => row.name) };
}

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

const routes = {};
plugin.register({
  get(route, handler) { routes[`GET ${route}`] = handler; },
  post(route, handler) { routes[`POST ${route}`] = handler; },
});

function dispatchHttp(adminUser, body) {
  const res = mockRes();
  const req = {
    body,
    headers: {},
    url: "/api/admin/pusat/dispatch",
    adminUser,
  };
  return Promise.resolve(routes["POST /api/admin/pusat/dispatch"](req, res)).then(() => res);
}

function closed(result) {
  expect(result.salesOpen).toBe(false);
  expect(result.egressAllowed).toBe(false);
  expect(result.productionReady).toBe(false);
  expect(result.executed).toBe(false);
  expect(result.purchased).toBe(false);
  expect(result.moneyMoved).toBe(false);
  expect(result.refunded).toBe(false);
  expect(result.shipmentCreated).toBe(false);
  expect(result.live).toBe(false);
}

afterAll(() => {
  for (const file of opened) forget(file);
  if (previousRuntime === undefined) delete process.env.PUSAT_RUNTIME_ENABLED;
  else process.env.PUSAT_RUNTIME_ENABLED = previousRuntime;
});

describe("Pusat runtime decider authority", () => {
  it("keeps the 17 official identities in order", () => {
    expect([...SEED_IDS]).toEqual(seedOrder);
  });

  it("does not treat products.read as approval authority", () => {
    for (const role of ["staff", "catalog_manager", "order_manager", "read_only"]) {
      expect(can(role, "products.read")).toBe(true);
      expect(can(role, "ai.execute")).toBe(false);
    }
    expect(can("admin", "ai.execute")).toBe(true);
    expect(can("administrator", "ai.execute")).toBe(true);
  });

  it("ignores a client deciderId from a products.read session", () => {
    const approval = seed("client-decider");
    const before = stored(approval.file, approval.id);
    for (const role of ["staff", "catalog_manager", "order_manager", "read_only"]) {
      for (const deciderId of ["human", "operator", "client-decider-token"]) {
        const result = pusat.executeReadOnly("ORCHESTRATE_APPROVE", {
          approvalId: approval.id,
          dbPath: approval.file,
          deciderId,
          approved: true,
        }, {
          actorId: "client@example.com",
          sessionRole: role,
        });
        expect(result.ok).toBe(false);
        expect(result.code).toBe("PERMISSION_DENIED");
        expect(result.actorId).toBe(null);
        expect(result.data.changed).toBe(false);
        closed(result);
      }
    }
    expect(stored(approval.file, approval.id)).toEqual(before);
  });

  it("rejects human and operator impersonation without ai.execute", () => {
    const approval = seed("impersonation");
    const before = stored(approval.file, approval.id);
    for (const actorId of ["human", "operator", "pusat", "client@example.com"]) {
      const result = pusat.executeReadOnly("ORCHESTRATE_APPROVE", {
        approvalId: approval.id,
        dbPath: approval.file,
        deciderId: actorId,
        approved: true,
      }, {
        actorId,
        sessionRole: actorId,
      });
      expect(result.ok).toBe(false);
      expect(result.code).toBe("PERMISSION_DENIED");
      closed(result);
    }
    expect(stored(approval.file, approval.id)).toEqual(before);
    expect(before.status).toBe("WAITING_APPROVAL");
    expect(before.decided_by).toBe(null);
  });

  it("lets a server-verified admin session decide as operator", () => {
    const approval = seed("operator");
    opened.push(approval.file);
    const result = pusat.executeReadOnly("ORCHESTRATE_APPROVE", {
      approvalId: approval.id,
      dbPath: approval.file,
      deciderId: "human",
      approved: true,
      email: "client@example.com",
    }, {
      actorId: "client@example.com",
      sessionRole: "admin",
    });
    expect(result.ok).toBe(true);
    expect(result.actorId).toBe("operator");
    expect(result.data.item.decided_by).toBe("operator");
    expect(result.data.item.status).toBe("APPROVED");
    closed(result);
    forget(approval.file);
    const row = stored(approval.file, approval.id);
    expect(row.status).toBe("APPROVED");
    expect(row.decided_by).toBe("operator");
    expect(row.requested_by).toBe("pusat");
    expect(row.tasks).toBe(0);
    expect(row.core).toEqual([]);
  });

  it("applies the same rule on POST /api/admin/pusat/dispatch", async () => {
    const held = seed("http-held");
    const approved = seed("http-approved");
    opened.push(approved.file);
    const heldBefore = stored(held.file, held.id);

    const staff = await dispatchHttp(
      { role: "staff", email: "staff@example.com", userId: "staff-user" },
      {
        action: "ORCHESTRATE_APPROVE",
        deciderId: "operator",
        payload: {
          approvalId: held.id,
          dbPath: held.file,
          deciderId: "human",
          approved: true,
        },
      },
    );
    expect(staff.statusCode).toBe(400);
    expect(staff.body.success).toBe(false);
    expect(staff.body.code).toBe("PERMISSION_DENIED");
    expect(staff.body.actorId).toBe(null);
    closed(staff.body);
    expect(stored(held.file, held.id)).toEqual(heldBefore);

    const reader = await dispatchHttp(
      { role: "ai_agent", email: "agent@example.com", userId: "agent-user" },
      {
        action: "ORCHESTRATE_APPROVE",
        payload: { approvalId: held.id, dbPath: held.file, deciderId: "operator", approved: true },
      },
    );
    expect(reader.statusCode).toBe(403);
    expect(stored(held.file, held.id)).toEqual(heldBefore);

    const admin = await dispatchHttp(
      { role: "administrator", email: "admin@example.com", userId: "admin-user" },
      {
        action: "ORCHESTRATE_APPROVE",
        deciderId: "human",
        payload: {
          approvalId: approved.id,
          dbPath: approved.file,
          deciderId: "human",
          approved: true,
        },
      },
    );
    expect(admin.statusCode).toBe(200);
    expect(admin.body.success).toBe(true);
    expect(admin.body.actorId).toBe("operator");
    expect(admin.body.actorId).not.toBe("admin@example.com");
    expect(admin.body.data.item.decided_by).toBe("operator");
    closed(admin.body);
    forget(approved.file);
    const row = stored(approved.file, approved.id);
    expect(row.status).toBe("APPROVED");
    expect(row.decided_by).toBe("operator");
    expect(row.tasks).toBe(0);
    expect(stored(held.file, held.id)).toEqual(heldBefore);
  });

  it("does not decide while the runtime flag is off", () => {
    const approval = seed("disabled");
    const before = stored(approval.file, approval.id);
    delete process.env.PUSAT_RUNTIME_ENABLED;
    const result = pusat.executeReadOnly("ORCHESTRATE_APPROVE", {
      approvalId: approval.id,
      dbPath: approval.file,
      deciderId: "operator",
      approved: true,
    }, {
      actorId: "operator",
      sessionRole: "administrator",
    });
    process.env.PUSAT_RUNTIME_ENABLED = "1";
    expect(result.code).toBe("PUSAT_DISABLED");
    expect(stored(approval.file, approval.id)).toEqual(before);
  });

  it("refuses a protected database path", () => {
    const result = pusat.executeReadOnly("ORCHESTRATE_APPROVE", {
      approvalId: "apr-protected",
      dbPath: commerceDb,
      deciderId: "operator",
      approved: true,
    }, {
      actorId: "client@example.com",
      sessionRole: "administrator",
    });
    expect(result.ok).toBe(false);
    expect(result.code).toBe("DATA_PATH_REFUSED");
    expect(result.data.changed).toBe(false);
    closed(result);
  });

  it("keeps Pusat read dispatch and blocks commerce writes", () => {
    const ping = pusat.executeReadOnly("PING", {});
    expect(ping.ok).toBe(true);
    const denied = pusat.executeReadOnly("CREATE_ORDER", { deciderId: "operator" }, { sessionRole: "administrator" });
    expect(denied.code).toBe("PERMISSION_DENIED");
    expect(process.env.BUZZARD_SALES_ENABLED).not.toBe("1");
  });

  it("does not read the client decider from the runtime source", () => {
    const runtimeSource = fs.readFileSync(path.join(repoRoot, "server/lib/pusat/runtime.js"), "utf8");
    const pluginSource = fs.readFileSync(path.join(repoRoot, "server/plugins/masterIntegrationPlugin.js"), "utf8");
    expect(runtimeSource).not.toMatch(/payload\.deciderId/);
    expect(pluginSource).toMatch(/delete payload\.deciderId/);
    expect(pluginSource).toMatch(/sessionRole: req\.adminUser\?\.role/);
  });

  it("leaves the commerce database and orders file untouched", () => {
    expect(fileMark(commerceDb)).toEqual(dbBefore);
    expect(fileMark(ordersPath)).toEqual(ordersBefore);
    expect(ordersBefore).toBe(null);
    expect(dbBefore).toMatchObject({ ino: 615782, size: 1736704 });
  });
});
