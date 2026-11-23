import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";
import { afterAll, describe, expect, it } from "vitest";

const dbPath = path.join(os.tmpdir(), `buzzard-phase3-${process.pid}.sqlite`);
const storePath = path.join(os.tmpdir(), `buzzard-products-${process.pid}.json`);
process.env.BUZZARD_DB_PATH = dbPath;
process.env.BUZZARD_SALES_ENABLED = "0";
delete process.env.BUZZARD_PRODUCT_STORE_PATH;
process.env.BUZZARD_AGENT_RATE_MAX = "1";

const require = createRequire(import.meta.url);
const { consumeAgentWindow, resetAgentWindows } = require("../lib/security/agentRateWindow");
const { executeReadOnly } = require("../lib/pusat/runtime");
const { authorizeCreate, authorizeUpdate, authorizeDelete } = require("../lib/pim/productAuthorization");
const { assertNoDualWrite } = require("../lib/productSot");
const productService = require("../lib/productService");
const store = require("../lib/pim/productJsonStore");
const { InterCarsAdapter } = require("../lib/adapters/interCarsAdapter");
const { phase3Identity } = require("../lib/commerce/phase3Identity");
const orderService = require("../lib/commerce/orderService");
const { db } = require("../lib/db");
const controlCenter = require("../lib/controlCenter");
const { assertBound } = require("../lib/approvalBinding");
const admission = require("../lib/controlCenterJobAdmission");
const software = require("../lib/software");
const { inventory } = require("../lib/externalIntegrations");
const health = require("../plugins/productionHealthPlugin");

afterAll(() => {
  delete process.env.BUZZARD_AGENT_RATE_MAX;
  delete process.env.BUZZARD_PRODUCT_STORE_PATH;
  resetAgentWindows();
});

describe("third-pass local gaps", () => {
  it("limits each agent and keeps the software facade from deciding", () => {
    resetAgentWindows();
    expect(consumeAgentWindow("pricing_ai").allowed).toBe(true);
    expect(consumeAgentWindow("pricing_ai").code).toBe("AGENT_RATE_LIMITED");
    resetAgentWindows();
    const first = executeReadOnly("READ_STATUS", {}, { actorId: "stock_ai" });
    expect(first.code).not.toBe("AGENT_RATE_LIMITED");
    const second = executeReadOnly("READ_STATUS", {}, { actorId: "stock_ai" });
    expect(second.code).toBe("AGENT_RATE_LIMITED");
    expect(second.live).toBe(false);
    const report = software.status();
    expect(report.orchestrator).toBe(false);
    expect(report.decides).toBe(false);
    expect(report.salesEnabled).toBe(false);
    expect(report.productionReady).toBe(false);
    expect(report.product.active).toBe(false);
  });

  it("takes the product actor from the session and refuses two write targets", () => {
    expect(authorizeCreate(null).code).toBe("ACTOR_REQUIRED");
    const created = authorizeCreate({ email: "operator@example.test" });
    expect(created.actorId).toBe("operator@example.test");
    expect(created.source).toBe("session");
    expect(authorizeUpdate({ userId: "user-1" }).action).toBe("update");
    expect(authorizeDelete({ id: "user-2" }).action).toBe("delete");
    expect(() => assertNoDualWrite(["D", "legacy"])).toThrow(/DUAL_WRITE_FORBIDDEN/);
    expect(() => productService.createProduct({ sku: "X" }, { legacyTarget: "legacy" })).toThrow(/DUAL_WRITE_FORBIDDEN/);
    expect(assertNoDualWrite(["D"]).target).toBe("D");
  });

  it("uses an optional product JSON path and blocks a live Inter Cars order", () => {
    process.env.BUZZARD_PRODUCT_STORE_PATH = path.join(
      path.resolve(__dirname, "../data"),
      "protected-products.json"
    );
    expect(store.writeProduct({ sku: "NO", title: "No" }).code).toBe("PRODUCT_STORE_PATH_PROTECTED");
    process.env.BUZZARD_PRODUCT_STORE_PATH = storePath;
    expect(store.writeProduct({ sku: "REG-1", title: "Regal" }).written).toBe(true);
    expect(store.readStore().products[0].active).toBe(0);
    delete process.env.BUZZARD_PRODUCT_STORE_PATH;
    expect(store.readStore().enabled).toBe(false);
    fs.rmSync(storePath, { force: true });
    const cars = new InterCarsAdapter();
    expect(cars.fetchCatalog().live).toBe(false);
    expect(cars.placeOrder().code).toBe("ACTOR_REQUIRED");
    expect(cars.placeOrder({ actorId: "supplier-test" }).code).toBe("LIVE_ORDER_FORBIDDEN");
    expect(cars.placeOrder({ actorId: "supplier-test" }).orderCreated).toBe(false);
  });

  it("keeps access skip internal and stamps a non-payable phase 3 identity", () => {
    db.prepare("INSERT INTO commerce_orders(id, customer_id, order_type) VALUES (?, ?, 'DRY_RUN')").run("ord-phase3", "cust-1");
    const blocked = orderService.getOrder("ord-phase3", { req: { body: { skipAccessCheck: true }, query: {} } });
    expect(blocked.status).toBe(403);
    expect(blocked.error).toBe("SKIP_ACCESS_FORBIDDEN");
    const internal = orderService.getOrder("ord-phase3", { skipAccessCheck: true, internal: true });
    expect(internal.phase3.payable).toBe(false);
    expect(internal.phase3.qr.payable).toBe(false);
    expect(internal.phase3.qr.paymentUrl).toBeNull();
    expect(internal.phase3.live).toBe(false);
    expect(internal.phase3.identity).toBe(phase3Identity("ord-phase3").identity);
    expect(phase3Identity("").ok).toBe(false);
  });

  it("records financial impact and rejects a rebound approval", () => {
    const approval = controlCenter.createApproval({
      reason: "dry approval",
      resourceType: "catalog",
      riskLevel: "HIGH",
      metadata: { financialImpact: { amount: 50 }, inputHash: "client" },
    }, { trustMetadata: true });
    expect(approval.metadata.financialImpact.realMoneyMovement).toBe(false);
    expect(approval.metadata.financialImpact.amount).toBeNull();
    expect(assertBound(approval).ok).toBe(true);
    expect(assertBound({ ...approval, reason: "changed" }).code).toBe("INPUT_HASH_MISMATCH");
    const released = admission.releaseApprovedControlCenterJob({
      approval: {
        id: approval.id,
        status: "APPROVED",
        taskId: null,
        resourceType: "background_job",
        resourceId: "job-1",
        reason: "changed",
        riskLevel: "HIGH",
        metadata: {
          origin: "control_center",
          inputHash: approval.metadata.inputHash,
          spec: { source: "control_center", jobType: "CATEGORY_READINESS", payload: {} },
        },
      },
      actor: "operator@example.test",
      deps: { enqueueJob() { throw new Error("must not enqueue"); } },
    });
    expect(released.code).toBe("INPUT_HASH_MISMATCH");
  });

  it("reports software health and provider diagnostics without the network", () => {
    const routes = {};
    health.register({ get(route, handler) { routes[route] = handler; } });
    const res = { json(body) { this.body = body; } };
    routes["/api/health/software"]({}, res);
    expect(res.body.diagnosticOnly).toBe(true);
    expect(res.body.salesEnabled).toBe(false);
    expect(res.body.orchestrator).toBe(false);
    expect(inventory().live).toBe(false);
    expect(inventory().integrations.every((row) => row.live === false)).toBe(true);
    const script = path.resolve(__dirname, "../../scripts/provider-diagnostics.mjs");
    const run = spawnSync(process.execPath, [script], {
      cwd: path.resolve(__dirname, "../.."),
      env: { ...process.env, BUZZARD_SALES_ENABLED: "0" },
      encoding: "utf8",
    });
    expect(run.status).toBe(0);
    const report = JSON.parse(run.stdout);
    expect(report.salesEnabled).toBe(false);
    expect(report.network).toBe(false);
    expect(report.live).toBe(false);
  });
});
