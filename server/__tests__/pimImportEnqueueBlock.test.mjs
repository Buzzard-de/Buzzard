import { afterAll, describe, expect, it } from "vitest";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import fs from "node:fs";
import path from "node:path";

const require = createRequire(import.meta.url);
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const commerceDb = path.join(repoRoot, "server/data/buzzard.db");
const ordersPath = path.join(repoRoot, "server/data/orders.json");

function fileMark(file) {
  if (!fs.existsSync(file)) return null;
  const stat = fs.statSync(file);
  return { ino: stat.ino, size: stat.size, mtimeMs: stat.mtimeMs };
}

const dbBefore = fileMark(commerceDb);
const ordersBefore = fileMark(ordersPath);

function stub(rel, exports) {
  const resolved = require.resolve(rel);
  require.cache[resolved] = {
    id: resolved,
    filename: resolved,
    loaded: true,
    exports,
  };
}

const calls = { enqueue: 0, safety: 0, audit: 0, coreAudit: 0, pipeline: 0 };

stub("../lib/db.js", {
  db: {
    prepare() {
      throw new Error("commerce database must stay closed");
    },
  },
});
stub("../lib/auth.js", {
  requireAuth(req, res) {
    if (!req.session) {
      res.status(401).json({ success: false, errorKey: "admin.auth.required" });
      return null;
    }
    return req.session;
  },
});
stub("../lib/coreAudit.js", {
  logAuditFromRequest() {
    calls.coreAudit += 1;
    throw new Error("audit must not be written");
  },
});
stub("../lib/operations/adminSafetyGate.js", {
  requireAdminAction() {
    calls.safety += 1;
    throw new Error("safety gate must not run");
  },
});
stub("../lib/operations/operationsAudit.js", {
  recordFromRequest() {
    calls.audit += 1;
    throw new Error("operations audit must not be written");
  },
});
stub("../lib/jobQueue.js", {
  enqueueJob() {
    calls.enqueue += 1;
    throw new Error("legacy enqueue must not run");
  },
});
for (const rel of [
  "../lib/pim/productCore.js",
  "../lib/pim/brandService.js",
  "../lib/pim/supplierMapping.js",
  "../lib/pim/productValidation.js",
  "../lib/pim/categoryEngine.js",
  "../lib/pim/attributeSchema.js",
  "../lib/pim/variantService.js",
  "../lib/pim/mediaService.js",
  "../lib/pim/seoService.js",
  "../lib/pim/productSearch.js",
  "../lib/pim/productAudit.js",
  "../lib/pim/qualityScore.js",
  "../lib/pim/bulkOperations.js",
  "../lib/pim/productAiFoundation.js",
]) {
  stub(rel, {});
}
stub("../lib/pim/importPipeline.js", {
  runPipeline() {
    calls.pipeline += 1;
    throw new Error("import pipeline must not run");
  },
});

const pluginPath = require.resolve("../plugins/pimCorePlugin.js");
delete require.cache[pluginPath];
const plugin = require("../plugins/pimCorePlugin.js");
const routes = {};
plugin.register({
  get(route, handler) {
    routes[`GET ${route}`] = handler;
  },
  post(route, handler) {
    routes[`POST ${route}`] = handler;
  },
  patch(route, handler) {
    routes[`PATCH ${route}`] = handler;
  },
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

function postEnqueue(session, body = { dryRun: false, raw: { sku: "SYNTH-1" } }) {
  const res = mockRes();
  routes["POST /api/admin/pim-core/import/enqueue"]({
    body,
    headers: { "idempotency-key": "must-not-store" },
    query: {},
    params: {},
    session,
    correlationId: "corr-synthetic",
  }, res);
  return res;
}

describe("pim import enqueue block", () => {
  it("returns 403 for an authorized caller before enqueue", () => {
    const res = postEnqueue({
      userId: "catalog-1",
      role: "catalog_manager",
      email: "catalog@example.com",
      name: "Catalog",
    });
    expect(res.statusCode).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.errorCode).toBe("LEGACY_JOB_ENQUEUE_BLOCKED");
    expect(res.body.queued).toBe(false);
    expect(res.body.executed).toBe(false);
    expect(res.body.salesOpen).toBe(false);
    expect(res.body.egressAllowed).toBe(false);
    expect(res.body.productionReady).toBe(false);
    expect(res.body.job).toBeUndefined();
    expect(calls).toEqual({ enqueue: 0, safety: 0, audit: 0, coreAudit: 0, pipeline: 0 });
  });

  it("keeps the unauthenticated and unauthorized responses unchanged", () => {
    const anon = postEnqueue(null);
    expect(anon.statusCode).toBe(401);
    expect(anon.body.errorKey).toBe("admin.auth.required");
    expect(anon.body.errorCode).toBeUndefined();

    const staff = postEnqueue({
      userId: "staff-1",
      role: "admin",
      email: "admin@example.com",
      name: "Admin",
    });
    expect(staff.statusCode).toBe(403);
    expect(staff.body.errorKey).toBe("admin.auth.forbidden");
    expect(staff.body.errorCode).toBeUndefined();
    expect(calls.enqueue).toBe(0);
  });
});

afterAll(() => {
  expect(fileMark(commerceDb)).toEqual(dbBefore);
  expect(fileMark(ordersPath)).toEqual(ordersBefore);
  expect(dbBefore).toMatchObject({ ino: 615782, size: 1736704 });
  expect(ordersBefore).toBe(null);
});
