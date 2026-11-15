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

const calls = { enqueue: 0, safety: 0, audit: 0, coreAudit: 0, pipeline: 0, pipelineOpts: null };

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
    throw new Error("core audit must not be written");
  },
});
stub("../lib/operations/adminSafetyGate.js", {
  requireAdminAction(action, context) {
    calls.safety += 1;
    calls.safetyAction = action;
    calls.safetyDryRun = context.dryRun;
    return { ok: true };
  },
});
stub("../lib/operations/operationsAudit.js", {
  recordFromRequest(_req, entry) {
    calls.audit += 1;
    calls.auditEntry = entry;
  },
});
stub("../lib/jobQueue.js", {
  enqueueJob() {
    calls.enqueue += 1;
    throw new Error("queue must not be written");
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
  async runPipeline(raw, options) {
    calls.pipeline += 1;
    calls.pipelineOpts = options;
    calls.pipelineRaw = raw;
    return {
      importJobId: "imp_synthetic",
      dryRun: options.dryRun,
      stages: [{ stage: "validation", status: "SKIPPED" }],
    };
  },
});

const pluginPath = require.resolve("../plugins/pimCorePlugin.js");
delete require.cache[pluginPath];
const plugin = require("../plugins/pimCorePlugin.js");
const routes = {};
plugin.register({
  get(route, handler) { routes[`GET ${route}`] = handler; },
  post(route, handler) { routes[`POST ${route}`] = handler; },
  patch(route, handler) { routes[`PATCH ${route}`] = handler; },
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

const catalogSession = {
  userId: "catalog-1",
  role: "catalog_manager",
  email: "catalog@example.com",
  name: "Catalog",
};

async function postImport(session, body) {
  const res = mockRes();
  await routes["POST /api/admin/pim-core/import"]({
    body,
    headers: {},
    query: {},
    params: {},
    session,
  }, res);
  return res;
}

describe("pim live import block", () => {
  it("rejects an authorized live import before the pipeline", async () => {
    const res = await postImport(catalogSession, {
      dryRun: false,
      supplierId: "mock",
      raw: { sku: "SYNTH-1", title: "Synthetic" },
    });
    expect(res.statusCode).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.errorCode).toBe("LEGACY_PIM_LIVE_IMPORT_BLOCKED");
    expect(res.body.executed).toBe(false);
    expect(res.body.salesOpen).toBe(false);
    expect(res.body.productionReady).toBe(false);
    expect(calls).toMatchObject({ enqueue: 0, safety: 0, audit: 0, coreAudit: 0, pipeline: 0 });
  });

  it("keeps an authorized dry run on the existing read-only path", async () => {
    const res = await postImport(catalogSession, {
      dryRun: true,
      supplierId: "mock",
      raw: { sku: "SYNTH-DRY", title: "Dry" },
    });
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.dryRun).toBe(true);
    expect(res.body.importJobId).toBe("imp_synthetic");
    expect(calls.pipeline).toBe(1);
    expect(calls.pipelineOpts).toMatchObject({ dryRun: true, supplierId: "mock" });
    expect(calls.pipelineRaw).toEqual({ sku: "SYNTH-DRY", title: "Dry" });
    expect(calls.safety).toBe(1);
    expect(calls.safetyAction).toBe("import");
    expect(calls.safetyDryRun).toBe(true);
    expect(calls.audit).toBe(1);
    expect(calls.auditEntry.result).toBe("dry_run");
    expect(calls.coreAudit).toBe(0);
    expect(calls.enqueue).toBe(0);
  });

  it("keeps unauthenticated and unauthorized responses unchanged", async () => {
    const before = { ...calls, pipelineOpts: calls.pipelineOpts };
    const anon = await postImport(null, { dryRun: false, raw: { sku: "SYNTH-1" } });
    expect(anon.statusCode).toBe(401);
    expect(anon.body.errorKey).toBe("admin.auth.required");
    expect(anon.body.errorCode).toBeUndefined();

    const staff = await postImport({
      userId: "staff-1",
      role: "admin",
      email: "admin@example.com",
      name: "Admin",
    }, { dryRun: true, raw: { sku: "SYNTH-1" } });
    expect(staff.statusCode).toBe(403);
    expect(staff.body.errorKey).toBe("admin.auth.forbidden");
    expect(staff.body.errorCode).toBeUndefined();
    expect(calls.pipeline).toBe(before.pipeline);
    expect(calls.safety).toBe(before.safety);
    expect(calls.audit).toBe(before.audit);
    expect(calls.enqueue).toBe(0);
  });
});

afterAll(() => {
  expect(fileMark(commerceDb)).toEqual(dbBefore);
  expect(fileMark(ordersPath)).toEqual(ordersBefore);
  expect(dbBefore).toMatchObject({ ino: 615782, size: 1736704 });
  expect(ordersBefore).toBe(null);
});
