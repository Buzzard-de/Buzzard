import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { createRequire } from "node:module";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const require = createRequire(import.meta.url);

const WRITE_OR_COMMERCE_ACTIONS = [
  "CHANGE_ORDER",
  "CANCEL_ORDER",
  "CREATE_RETURN",
  "CREATE_EXCHANGE",
  "REQUEST_SUPPLIER_ACTION",
  "REFUND_HIGH_VALUE",
  "CANCEL_HIGH_VALUE_ORDER",
  "SUPPLIER_PURCHASE",
  "MARKETPLACE_ORDER",
  "REAL_PAYMENT_CAPTURE",
];

const NOT_IMPLEMENTED = [
  "CHECK_AVAILABILITY",
  "GET_PRODUCT",
  "CHECK_VARIANT",
  "IDENTIFY_CUSTOMER",
  "CHECK_RETURN_POLICY",
  "CHECK_PRICE",
  "CHECK_SUPPLIER",
];

function uniqueKey(prefix) {
  return `${prefix}_${crypto.randomBytes(8).toString("hex")}`;
}

function adminReq(overrides = {}) {
  return {
    correlationId: overrides.correlationId || `corr_${crypto.randomBytes(4).toString("hex")}`,
    adminUser: overrides.adminUser === undefined
      ? { email: "admin@test.buzzard", role: "admin" }
      : overrides.adminUser,
  };
}

describe("orchestrationFacade (Phase C MVP)", () => {
  const envBackup = { ...process.env };
  const ordersPath = path.join(process.cwd(), "server/data/orders.json");
  let ordersBackup = null;
  let seededOrder = null;

  beforeEach(() => {
    process.env.PUSAT_RUNTIME_ENABLED = "0";
    process.env.BUZZARD_SALES_ENABLED = "0";
    delete process.env.BUZZARD_ORCHESTRATION_FACADE;
  });

  afterEach(() => {
    process.env = { ...envBackup };
    if (ordersBackup !== null) {
      fs.writeFileSync(ordersPath, ordersBackup, "utf8");
      ordersBackup = null;
      seededOrder = null;
    }
  });

  function seedOrder() {
    ordersBackup = fs.existsSync(ordersPath) ? fs.readFileSync(ordersPath, "utf8") : "[]";
    const existing = (() => {
      try {
        return JSON.parse(ordersBackup || "[]");
      } catch {
        return [];
      }
    })();
    seededOrder = {
      orderNumber: `ORD-FACADE-${crypto.randomBytes(4).toString("hex")}`,
      status: "processing",
      paymentStatus: "paid",
      trackingNumber: null,
      trackingCarrier: null,
      customer: { email: "facade-order@test.buzzard" },
      shippingAddress: { postalCode: "10115" },
    };
    fs.mkdirSync(path.dirname(ordersPath), { recursive: true });
    fs.writeFileSync(ordersPath, JSON.stringify([...existing, seededOrder], null, 2), "utf8");
    return seededOrder;
  }

  it("1. facade disabled by default", async () => {
    delete process.env.BUZZARD_ORCHESTRATION_FACADE;
    const facade = require("../lib/orchestrationFacade.js");
    expect(facade.isOrchestrationFacadeEnabled()).toBe(false);
    const result = await facade.dispatch({
      req: adminReq(),
      action: "GET_ORDER",
      idempotencyKey: uniqueKey("idemp"),
      payload: { orderNumber: "X", email: "a@b.c" },
    });
    expect(result.status).toBe("DISABLED");
    expect(result.errorCode).toBe("ORCHESTRATION_FACADE_DISABLED");
  });

  it("2. unknown action is denied with structured error", async () => {
    process.env.BUZZARD_ORCHESTRATION_FACADE = "1";
    const facade = require("../lib/orchestrationFacade.js");
    const result = await facade.dispatch({
      req: adminReq(),
      action: "LAUNCH_NUCLEAR_OPTION",
      idempotencyKey: uniqueKey("idemp"),
      payload: {},
    });
    expect(result.status).toBe("FAILED");
    expect(result.errorCode).toBe("ACTION_NOT_ALLOWED");
  });

  it("3. unauthorized caller is denied", async () => {
    process.env.BUZZARD_ORCHESTRATION_FACADE = "1";
    const facade = require("../lib/orchestrationFacade.js");
    const missing = await facade.dispatch({
      req: { correlationId: "corr_no_user" },
      action: "GET_ORDER",
      idempotencyKey: uniqueKey("idemp"),
      payload: { orderNumber: "X", email: "a@b.c" },
    });
    expect(missing.errorCode).toBe("NOT_AUTHORIZED");

    const staff = await facade.dispatch({
      req: adminReq({ adminUser: { email: "staff@test.buzzard", role: "staff" } }),
      action: "GET_ORDER",
      idempotencyKey: uniqueKey("idemp"),
      payload: { orderNumber: "X", email: "a@b.c" },
    });
    expect(staff.errorCode).toBe("NOT_AUTHORIZED");
  });

  it("4. GET_ORDER uses the existing phone/json adapter", async () => {
    process.env.BUZZARD_ORCHESTRATION_FACADE = "1";
    const order = seedOrder();
    const facade = require("../lib/orchestrationFacade.js");
    const result = await facade.dispatch({
      req: adminReq(),
      action: "GET_ORDER",
      idempotencyKey: uniqueKey("idemp"),
      payload: { orderNumber: order.orderNumber, email: order.customer.email, postalCode: "10115" },
    });
    expect(result.status).toBe("SUCCESS");
    expect(result.result.ok).toBe(true);
    expect(result.result.orderNumber).toBe(order.orderNumber);
    expect(result.result.status).toBe("processing");
    expect(result.taskId).toMatch(/^task_/);
  });

  it("5. GET_ORDER does not invent an order", async () => {
    process.env.BUZZARD_ORCHESTRATION_FACADE = "1";
    const facade = require("../lib/orchestrationFacade.js");
    const result = await facade.dispatch({
      req: adminReq(),
      action: "GET_ORDER",
      idempotencyKey: uniqueKey("idemp"),
      payload: { orderNumber: "NO-SUCH-ORDER-FACADE", email: "nobody@test.buzzard" },
    });
    expect(result.status).toBe("FAILED");
    expect(result.errorCode).toBe("GET_ORDER_FAILED");
    expect(result.result.ok).toBe(false);
    expect(result.result.orderNumber).toBeUndefined();
  });

  it("6. unmapped read actions return structured NOT_IMPLEMENTED", async () => {
    process.env.BUZZARD_ORCHESTRATION_FACADE = "1";
    const facade = require("../lib/orchestrationFacade.js");
    const { db } = require("../lib/db.js");
    for (const action of NOT_IMPLEMENTED) {
      const before = db.prepare("SELECT COUNT(*) n FROM core_ai_tasks").get().n;
      const result = await facade.dispatch({
        req: adminReq(),
        action,
        idempotencyKey: uniqueKey("idemp"),
        payload: { sku: "FAKE" },
      });
      const after = db.prepare("SELECT COUNT(*) n FROM core_ai_tasks").get().n;
      expect(result.status).toBe("NOT_IMPLEMENTED");
      expect(result.errorCode).toBe("NOT_IMPLEMENTED");
      expect(result.result.ok).toBeUndefined();
      expect(after).toBe(before);
    }
  });

  it("7. duplicate idempotency key does not create a second task", async () => {
    process.env.BUZZARD_ORCHESTRATION_FACADE = "1";
    const order = seedOrder();
    const facade = require("../lib/orchestrationFacade.js");
    const { db } = require("../lib/db.js");
    const key = uniqueKey("idemp");
    const first = await facade.dispatch({
      req: adminReq(),
      action: "GET_ORDER",
      idempotencyKey: key,
      payload: { orderNumber: order.orderNumber, email: order.customer.email },
    });
    const second = await facade.dispatch({
      req: adminReq(),
      action: "GET_ORDER",
      idempotencyKey: key,
      payload: { orderNumber: order.orderNumber, email: order.customer.email },
    });
    expect(second.status).toBe("REPLAY");
    expect(second.replay).toBe(true);
    expect(second.taskId).toBe(first.taskId);
    const rows = db
      .prepare(`SELECT COUNT(*) n FROM core_ai_tasks WHERE json_extract(payload_json, '$.idempotencyKey') = ?`)
      .get(key);
    expect(rows.n).toBe(1);
  });

  it("8. approval-class action writes only core_approvals", async () => {
    process.env.BUZZARD_ORCHESTRATION_FACADE = "1";
    const facade = require("../lib/orchestrationFacade.js");
    const { db } = require("../lib/db.js");
    const key = uniqueKey("idemp");
    const result = await facade.dispatch({
      req: adminReq(),
      action: "REFUND_HIGH_VALUE",
      idempotencyKey: key,
      payload: { amount: 999 },
    });
    expect(result.status).toBe("WAITING_APPROVAL");
    expect(result.errorCode).toBe("HUMAN_APPROVAL_REQUIRED");
    expect(result.approvalId).toMatch(/^appr_/);
    const approval = db.prepare("SELECT * FROM core_approvals WHERE id = ?").get(result.approvalId);
    expect(approval).toBeTruthy();
    expect(approval.task_id).toBe(result.taskId);

    const replay = await facade.dispatch({
      req: adminReq(),
      action: "REFUND_HIGH_VALUE",
      idempotencyKey: key,
      payload: { amount: 999 },
    });
    expect(replay.status).toBe("REPLAY");
    expect(replay.approvalId).toBe(result.approvalId);
    const count = db
      .prepare("SELECT COUNT(*) n FROM core_approvals WHERE task_id = ?")
      .get(result.taskId);
    expect(count.n).toBe(1);
  });

  it("9. task creation uses core_ai_tasks via controlCenter", async () => {
    process.env.BUZZARD_ORCHESTRATION_FACADE = "1";
    const facade = require("../lib/orchestrationFacade.js");
    const { db } = require("../lib/db.js");
    const key = uniqueKey("idemp");
    const result = await facade.dispatch({
      req: adminReq(),
      action: "GET_ORDER",
      idempotencyKey: key,
      payload: { orderNumber: "NO-SUCH-ORDER-FACADE", email: "nobody@test.buzzard" },
    });
    const row = db.prepare("SELECT * FROM core_ai_tasks WHERE id = ?").get(result.taskId);
    expect(row).toBeTruthy();
    expect(row.title).toBe("orchestration:GET_ORDER");
    const payload = JSON.parse(row.payload_json);
    expect(payload.idempotencyKey).toBe(key);
    expect(payload.action).toBe("GET_ORDER");
    expect(payload.correlationId).toBeTruthy();
  });

  it("10. audit writes core_system_events", async () => {
    process.env.BUZZARD_ORCHESTRATION_FACADE = "1";
    const facade = require("../lib/orchestrationFacade.js");
    const { db } = require("../lib/db.js");
    const key = uniqueKey("idemp");
    const corr = `corr_audit_${crypto.randomBytes(3).toString("hex")}`;
    await facade.dispatch({
      req: adminReq({ correlationId: corr }),
      action: "GET_PRODUCT",
      idempotencyKey: key,
      payload: {},
    });
    const event = db
      .prepare(
        `SELECT * FROM core_system_events
         WHERE event_type IN ('orchestration.dispatch','orchestration.blocked','orchestration.replay')
           AND json_extract(metadata_json, '$.correlationId') = ?
         ORDER BY created_at DESC`
      )
      .get(corr);
    expect(event).toBeTruthy();
    const meta = JSON.parse(event.metadata_json);
    expect(meta.action).toBe("GET_PRODUCT");
    expect(meta.idempotencyKey).toBe(key);
  });

  it("11. correlation id is reused from req and stored on the task", async () => {
    process.env.BUZZARD_ORCHESTRATION_FACADE = "1";
    const facade = require("../lib/orchestrationFacade.js");
    const { db } = require("../lib/db.js");
    const corr = `corr_keep_${crypto.randomBytes(4).toString("hex")}`;
    const result = await facade.dispatch({
      req: adminReq({ correlationId: corr }),
      action: "GET_ORDER",
      idempotencyKey: uniqueKey("idemp"),
      payload: { orderNumber: "NO-SUCH-ORDER-FACADE", email: "nobody@test.buzzard" },
    });
    expect(result.correlationId).toBe(corr);
    const row = db.prepare("SELECT payload_json FROM core_ai_tasks WHERE id = ?").get(result.taskId);
    expect(JSON.parse(row.payload_json).correlationId).toBe(corr);
  });

  it("12. facade cannot bypass Buzzard RBAC", async () => {
    process.env.BUZZARD_ORCHESTRATION_FACADE = "1";
    const facade = require("../lib/orchestrationFacade.js");
    const { can } = require("../lib/rbac.js");
    expect(can("staff", "ai.assign")).toBe(false);
    const result = await facade.dispatch({
      req: adminReq({ adminUser: { email: "staff@test.buzzard", role: "read_only" } }),
      action: "GET_ORDER",
      idempotencyKey: uniqueKey("idemp"),
      payload: { orderNumber: "X", email: "a@b.c" },
    });
    expect(result.errorCode).toBe("NOT_AUTHORIZED");
  });

  it("13. facade source does not create a second approval store", () => {
    const src = fs.readFileSync(path.join(process.cwd(), "server/lib/orchestrationFacade.js"), "utf8");
    expect(src).toMatch(/controlCenter\.createApproval/);
    expect(src).not.toMatch(/CREATE TABLE/);
    expect(src).not.toMatch(/pusat\.db/);
    expect(src).not.toMatch(/INSERT INTO core_approvals/);
  });

  it("14. facade source does not create a second task store", () => {
    const src = fs.readFileSync(path.join(process.cwd(), "server/lib/orchestrationFacade.js"), "utf8");
    expect(src).toMatch(/controlCenter\.createAiTask/);
    expect(src).not.toMatch(/INSERT INTO core_ai_tasks/);
    expect(src).not.toMatch(/new Database/);
    expect(src).not.toMatch(/require\(["'].*pusatRuntimeBridge["']\)/);
    expect(src).not.toMatch(/fetchOrchestrator/);
  });

  it("15. facade cannot directly mutate Commerce", () => {
    const src = fs.readFileSync(path.join(process.cwd(), "server/lib/orchestrationFacade.js"), "utf8");
    expect(src).not.toMatch(/orderManagement/);
    expect(src).not.toMatch(/createOrderFromCheckout/);
    expect(src).not.toMatch(/createOrderFromCart/);
    expect(src).not.toMatch(/marketplaceHub/);
    expect(src).not.toMatch(/paymentService/);
    expect(src).not.toMatch(/paymentsFinance/);
  });

  it("16. feature flag default is OFF", () => {
    delete process.env.BUZZARD_ORCHESTRATION_FACADE;
    const facade = require("../lib/orchestrationFacade.js");
    expect(facade.isOrchestrationFacadeEnabled()).toBe(false);
    expect(facade.isPusatRuntimeEnabled()).toBe(false);
  });

  it("17. missing flag behaves as OFF", async () => {
    delete process.env.BUZZARD_ORCHESTRATION_FACADE;
    delete process.env.PUSAT_RUNTIME_ENABLED;
    const facade = require("../lib/orchestrationFacade.js");
    const result = await facade.dispatch({
      req: adminReq(),
      action: "GET_ORDER",
      idempotencyKey: uniqueKey("idemp"),
      payload: { orderNumber: "X", email: "a@b.c" },
    });
    expect(result.status).toBe("DISABLED");
    expect(facade.isPusatRuntimeEnabled()).toBe(false);
  });

  it("18. write actions do not execute payment/refund/order side effects", async () => {
    process.env.BUZZARD_ORCHESTRATION_FACADE = "1";
    const facade = require("../lib/orchestrationFacade.js");
    const { db } = require("../lib/db.js");
    const ordersBefore = db.prepare("SELECT COUNT(*) n FROM orders").get().n;
    for (const action of WRITE_OR_COMMERCE_ACTIONS) {
      const result = await facade.dispatch({
        req: adminReq(),
        action,
        idempotencyKey: uniqueKey("idemp"),
        payload: { execute: true },
      });
      expect(result.status).toBe("WAITING_APPROVAL");
      expect(result.result.sideEffectExecuted).toBe(false);
    }
    const ordersAfter = db.prepare("SELECT COUNT(*) n FROM orders").get().n;
    expect(ordersAfter).toBe(ordersBefore);
  });

  it("19. disabled facade creates no task or approval rows", async () => {
    delete process.env.BUZZARD_ORCHESTRATION_FACADE;
    const facade = require("../lib/orchestrationFacade.js");
    const { db } = require("../lib/db.js");
    const tasksBefore = db.prepare("SELECT COUNT(*) n FROM core_ai_tasks").get().n;
    const approvalsBefore = db.prepare("SELECT COUNT(*) n FROM core_approvals").get().n;
    await facade.dispatch({
      req: adminReq(),
      action: "GET_ORDER",
      idempotencyKey: uniqueKey("idemp"),
      payload: { orderNumber: "X", email: "a@b.c" },
    });
    expect(db.prepare("SELECT COUNT(*) n FROM core_ai_tasks").get().n).toBe(tasksBefore);
    expect(db.prepare("SELECT COUNT(*) n FROM core_approvals").get().n).toBe(approvalsBefore);
  });

  it("20. Python/Pusat delegate is rejected and Pusat runtime stays unused", async () => {
    process.env.BUZZARD_ORCHESTRATION_FACADE = "1";
    process.env.PUSAT_RUNTIME_ENABLED = "0";
    const facade = require("../lib/orchestrationFacade.js");
    const python = await facade.dispatch({
      req: adminReq(),
      action: "GET_ORDER",
      idempotencyKey: uniqueKey("idemp"),
      payload: { orderNumber: "X", email: "a@b.c" },
      delegate: "python",
    });
    expect(python.errorCode).toBe("DELEGATE_NOT_ALLOWED");
    const pusat = await facade.dispatch({
      req: adminReq(),
      action: "GET_ORDER",
      idempotencyKey: uniqueKey("idemp"),
      payload: { orderNumber: "X", email: "a@b.c" },
      delegate: "pusat",
    });
    expect(pusat.errorCode).toBe("DELEGATE_NOT_ALLOWED");
    expect(facade.isPusatRuntimeEnabled()).toBe(false);
    const bridge = require("../lib/pusatRuntimeBridge.js");
    expect(bridge.isPusatRuntimeEnabled()).toBe(false);
  });
});
