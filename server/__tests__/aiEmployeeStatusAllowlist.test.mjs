import { afterAll, describe, expect, it } from "vitest";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import Database from "better-sqlite3";

const require = createRequire(import.meta.url);
const testDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(testDir, "../..");
const commerceDb = path.join(repoRoot, "server/data/buzzard.db");
const ordersPath = path.join(repoRoot, "server/data/orders.json");
const identityPath = path.join(repoRoot, "server/lib/buzzardNative/core/identityRegistry.js");
const aliasPath = path.join(repoRoot, "server/lib/buzzardNative/core/councilAliasMap.js");
const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "buzzard-ai-status-"));
const syntheticPath = path.join(tempDir, "employees.sqlite");
const previousAuditDir = process.env.BUZZARD_AUDIT_DIR;
process.env.BUZZARD_AUDIT_DIR = tempDir;

const OFFICIAL_SEED_IDS = [
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

const dbBefore = fileMark(commerceDb);
const ordersBefore = fileMark(ordersPath);
const identityBefore = fs.readFileSync(identityPath);
const aliasBefore = fs.readFileSync(aliasPath);

const synthetic = new Database(syntheticPath);
synthetic.exec(`
  CREATE TABLE core_ai_employees(
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    department TEXT,
    description TEXT,
    responsibility TEXT,
    permissions_json TEXT DEFAULT '[]',
    status TEXT DEFAULT 'ACTIVE',
    priority INTEGER DEFAULT 50,
    capabilities_json TEXT DEFAULT '[]',
    last_activity_at TEXT,
    error_message TEXT,
    performance_json TEXT DEFAULT '{}',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE core_ai_tasks(
    id TEXT PRIMARY KEY,
    employee_id TEXT,
    status TEXT
  );
`);
synthetic.prepare(`
  INSERT INTO core_ai_employees(
    id, name, department, description, responsibility, permissions_json, status, priority, capabilities_json, updated_at
  ) VALUES ('pusat', 'Pusat', 'Council', 'orchestrator', 'coordination', '["ai.execute"]', 'ACTIVE', 100, '[]', '2026-01-01T00:00:00.000Z')
`).run();

const writes = [];
const originalPrepare = synthetic.prepare.bind(synthetic);
synthetic.prepare = (sql) => {
  if (/^\s*(insert|update|delete)/i.test(sql)) writes.push(String(sql));
  return originalPrepare(sql);
};

function stub(resolved, exports) {
  require.cache[resolved] = {
    id: resolved,
    filename: resolved,
    loaded: true,
    exports,
  };
}

stub(require.resolve("../lib/db.js"), {
  db: synthetic,
  getDatabaseHealth() {
    return { ok: false, mocked: true };
  },
});
stub(require.resolve("../lib/auth.js"), {
  requireAuth(req, res) {
    res.status(401).json({ success: false, errorKey: "admin.auth.required" });
    return null;
  },
});

const plugin = require("../plugins/controlCenterPlugin.js");
const { updateAiEmployeeStatus } = require("../lib/controlCenter.js");
const { SEED_IDS } = require("../lib/buzzardNative/core/identityRegistry.js");
const routes = {};
plugin.register({
  get(route, handler) { routes[`GET ${route}`] = handler; },
  post(route, handler) { routes[`POST ${route}`] = handler; },
  put(route, handler) { routes[`PUT ${route}`] = handler; },
  patch(route, handler) { routes[`PATCH ${route}`] = handler; },
  delete(route, handler) { routes[`DELETE ${route}`] = handler; },
});

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

function patchStatus(id, status, role = "admin") {
  const res = mockRes();
  const req = {
    body: { status },
    headers: {},
    query: {},
    params: { id },
    url: `/api/admin/ai/employees/${id}/status`,
    adminUser: role
      ? { userId: "synthetic-admin", role, email: "admin@example.com", name: "Synthetic" }
      : undefined,
  };
  routes["PATCH /api/admin/ai/employees/:id/status"](req, res);
  return res;
}

function storedEmployee() {
  return synthetic.prepare(`
    SELECT id, name, permissions_json, status, updated_at FROM core_ai_employees WHERE id = 'pusat'
  `).get();
}

const originalRow = storedEmployee();

afterAll(() => {
  synthetic.close();
  if (previousAuditDir === undefined) delete process.env.BUZZARD_AUDIT_DIR;
  else process.env.BUZZARD_AUDIT_DIR = previousAuditDir;
});

describe("AI employee status allowlist", () => {
  it("rejects an unauthorized caller before any write", () => {
    const res = patchStatus("pusat", "PAUSED", "staff");
    expect(res.statusCode).toBe(403);
    expect(res.body.errorKey).toBe("admin.auth.forbidden");
    expect(storedEmployee()).toEqual(originalRow);
    expect(writes).toEqual([]);
    expect(fs.readdirSync(tempDir).filter((name) => name !== "employees.sqlite")).toEqual([]);
  });

  it("rejects invalid and unknown status values without writing", () => {
    for (const status of ["active", "ROOT", "", null, "SUPERUSER", "'; DROP TABLE core_ai_employees;--", "ONLINE"]) {
      const res = patchStatus("pusat", status);
      expect(res.statusCode).toBe(400);
      expect(res.body.errorCode).toBe("AI_EMPLOYEE_STATUS_INVALID");
      expect(res.body.employee).toBeUndefined();
    }
    expect(() => updateAiEmployeeStatus("pusat", "LIVE")).toThrow(/Invalid AI employee status/);
    expect(storedEmployee()).toEqual(originalRow);
    expect(writes).toEqual([]);
    expect(fs.readdirSync(tempDir).filter((name) => name !== "employees.sqlite")).toEqual([]);
  });

  it("keeps 404 for an unknown AI id", () => {
    const res = patchStatus("not_an_official_ai", "DISABLED");
    expect(res.statusCode).toBe(404);
    expect(res.body).toEqual({ success: false, errorKey: "ai.employee.notFound" });
    expect(storedEmployee()).toEqual(originalRow);
    expect(synthetic.prepare("SELECT COUNT(*) AS n FROM core_ai_employees").get().n).toBe(1);
    expect(writes).toEqual([]);
    expect(fs.readdirSync(tempDir).filter((name) => name !== "employees.sqlite")).toEqual([]);
  });

  it("accepts the existing ACTIVE, PAUSED, DISABLED, and ERROR contract", () => {
    for (const status of ["PAUSED", "DISABLED", "ERROR", "ACTIVE"]) {
      const res = patchStatus("pusat", status);
      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.employee.id).toBe("pusat");
      expect(res.body.employee.name).toBe("Pusat");
      expect(res.body.employee.status).toBe(status);
      expect(res.body.employee.permissions).toEqual(["ai.execute"]);
    }
    const row = storedEmployee();
    expect(row.id).toBe("pusat");
    expect(row.name).toBe("Pusat");
    expect(row.permissions_json).toBe('["ai.execute"]');
    expect(row.status).toBe("ACTIVE");
    expect(writes.every((sql) => /^\s*UPDATE\s+core_ai_employees\s+SET\s+status/i.test(sql))).toBe(true);
    expect(writes).toHaveLength(4);
  });

  it("keeps the 17 official identities and the commerce database unchanged", () => {
    expect([...SEED_IDS]).toEqual(OFFICIAL_SEED_IDS);
    expect(SEED_IDS).toHaveLength(17);
    expect(fs.readFileSync(identityPath).equals(identityBefore)).toBe(true);
    expect(fs.readFileSync(aliasPath).equals(aliasBefore)).toBe(true);
    expect(fileMark(commerceDb)).toEqual(dbBefore);
    expect(fileMark(ordersPath)).toEqual(ordersBefore);
    expect(ordersBefore).toBe(null);
    expect(dbBefore).toMatchObject({ ino: 615782, size: 1736704 });
    expect(process.env.BUZZARD_SALES_ENABLED).not.toBe("1");
  });
});
