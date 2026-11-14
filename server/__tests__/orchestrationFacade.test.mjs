import { afterEach, describe, expect, it } from "vitest";
import { createRequire } from "node:module";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const require = createRequire(import.meta.url);
const { createOrchestrationFacade } = require("../lib/orchestrationFacade.js");
const phoneAssistant = require("../lib/phoneAssistantService.js");
const { SEED_IDS } = require("../lib/buzzardNative/core/identityRegistry.js");

const dbPath = path.join(process.cwd(), "server/data/buzzard.db");
const ordersPath = path.join(process.cwd(), "server/data/orders.json");
const originalRead = phoneAssistant.getVerifiedOrderStatus;
const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "buzzard-facade-"));
const approvalDbPath = path.join(tempDir, "approvals.sqlite");

function fileMark(file) {
  if (!fs.existsSync(file)) return null;
  const stat = fs.statSync(file);
  return { ino: stat.ino, size: stat.size, mtimeMs: stat.mtimeMs };
}

const dbBefore = fileMark(dbPath);
const ordersBefore = fileMark(ordersPath);

function facade() {
  return createOrchestrationFacade({ enabled: true, approvalDbPath });
}

afterEach(() => {
  phoneAssistant.getVerifiedOrderStatus = originalRead;
});

describe("orchestrationFacade", () => {
  it("stays disabled unless enabled and does not read an order", async () => {
    let calls = 0;
    phoneAssistant.getVerifiedOrderStatus = () => {
      calls += 1;
      return { ok: true };
    };
    const disabled = createOrchestrationFacade({ approvalDbPath: path.join(tempDir, "unused.sqlite") });
    const result = await disabled.dispatch({
      action: "GET_ORDER",
      agentId: "pusat",
      payload: { orderNumber: "B-1001", email: "buyer@example.com" },
    });
    expect(result.status).toBe("DISABLED");
    expect(result.errorCode).toBe("ORCHESTRATION_FACADE_DISABLED");
    expect(result.salesOpen).toBe(false);
    expect(result.productionReady).toBe(false);
    expect(calls).toBe(0);
    expect(fs.existsSync(path.join(tempDir, "unused.sqlite"))).toBe(false);
  });

  it("returns SUCCESS for a synthetic verified order", async () => {
    phoneAssistant.getVerifiedOrderStatus = (input) => ({
      ok: true,
      verified: true,
      orderNumber: input.orderNumber,
      status: "paid",
      statusLabel: "Bezahlt",
      trackingNumber: null,
      trackingCarrier: null,
      message: "Bestellung B-1001: Bezahlt",
      escalate: false,
      paymentStatus: "captured",
    });
    const api = facade();
    const result = await api.dispatch({
      action: "GET_ORDER",
      agentId: "pusat",
      payload: { orderNumber: "B-1001", email: "buyer@example.com", postalCode: "10115", locale: "de" },
    });
    api.close();
    expect(result.status).toBe("SUCCESS");
    expect(result.ok).toBe(true);
    expect(result.result.orderNumber).toBe("B-1001");
    expect(result.result.paymentStatus).toBeUndefined();
    expect(result.coreTaskCreated).toBe(false);
    expect(result.coreApprovalCreated).toBe(false);
    expect(result.orderChanged).toBe(false);
    expect(result.moneyMoved).toBe(false);
  });

  it("returns FAILED / GET_ORDER_FAILED when the read misses", async () => {
    const api = facade();
    const result = await api.dispatch({
      action: "GET_ORDER",
      agentId: "zeynep_hanim",
      payload: { orderNumber: "B-MISSING", email: "nobody@example.com", postalCode: "00000" },
    });
    api.close();
    expect(result.status).toBe("FAILED");
    expect(result.errorCode).toBe("GET_ORDER_FAILED");
    expect(result.errorKey).toBe("ai.phone.orderNotFound");
    expect(result.orderChanged).toBe(false);
    expect(result.coreTaskCreated).toBe(false);
  });

  it("assigns only through the Task Router as Pusat", async () => {
    const api = facade();
    const assigned = await api.dispatch({
      action: "ASSIGN_TASK",
      fromId: "pusat",
      assigneeId: "sinan_bey",
      title: "synthetic assignment",
    });
    const denied = await api.dispatch({
      action: "ASSIGN_TASK",
      fromId: "sinan_bey",
      assigneeId: "esat_bey",
    });
    const unknown = await api.dispatch({
      action: "ASSIGN_TASK",
      assigneeId: "finance_ai",
    });
    const listed = api.router.list();
    api.close();
    expect(assigned.status).toBe("ASSIGNED");
    expect(assigned.agentId).toBe("pusat");
    expect(assigned.assigneeId).toBe("sinan_bey");
    expect(assigned.routerAssigned).toBe(true);
    expect(assigned.coreTaskCreated).toBe(false);
    expect(assigned.permissionIncreased).toBe(false);
    expect(denied.errorCode).toBe("ASSIGN_TASK_DENIED");
    expect(denied.assigned).toBe(false);
    expect(unknown.errorCode).toBe("NOT_NATIVE_SEED");
    expect(listed).toHaveLength(1);
    expect(listed[0].requestedBy).toBe("pusat");
    expect(SEED_IDS).toHaveLength(17);
  });

  it.each([
    ["CANCEL_ORDER", "ORDER_CANCEL"],
    ["CREATE_RETURN", "CUSTOMER_REFUND"],
    ["REFUND_HIGH_VALUE", "CUSTOMER_REFUND"],
    ["CANCEL_HIGH_VALUE_ORDER", "ORDER_CANCEL"],
    ["SUPPLIER_PURCHASE", "PURCHASE_ANYTHING"],
    ["CHANGE_ORDER", "SALES_WRITE"],
    ["MARKETPLACE_ORDER", "SALES_WRITE"],
    ["REAL_PAYMENT_CAPTURE", "LIVE_PAYMENT"],
  ])("records %s as HUMAN_REQUIRED %s without a commercial action", async (action, policyAction) => {
    const api = facade();
    const result = await api.dispatch({
      action,
      agentId: "pusat",
      idempotencyKey: `idem-${action}`,
      payload: { email: "buyer@example.com", risk: "LOW" },
    });
    const pending = result.approvalId ? api.router.list() : [];
    api.close();
    expect(result.status).toBe("WAITING_APPROVAL");
    expect(result.errorCode).toBe("HUMAN_APPROVAL_REQUIRED");
    expect(result.humanRequiredAction).toBe(policyAction);
    expect(result.risk).toBe("CRITICAL");
    expect(result.auto).toBe(false);
    expect(result.autoEligible).toBe(false);
    expect(result.moneyMoved).toBe(false);
    expect(result.purchased).toBe(false);
    expect(result.refunded).toBe(false);
    expect(result.shipmentCreated).toBe(false);
    expect(result.coreApprovalCreated).toBe(false);
    expect(result.coreTaskCreated).toBe(false);
    expect(pending).toHaveLength(0);
    expect(JSON.stringify(result)).not.toContain("buyer@example.com");
  });

  it("returns NOT_IMPLEMENTED for unmapped actions and does not auto-approve CREATE_REPORTS", async () => {
    const unused = path.join(tempDir, "not-created.sqlite");
    const api = createOrchestrationFacade({ enabled: true, approvalDbPath: unused });
    const exchange = await api.dispatch({ action: "CREATE_EXCHANGE", agentId: "pusat", idempotencyKey: "idem-exchange" });
    const reports = await api.dispatch({
      action: "CREATE_REPORTS",
      agentId: "pusat",
      idempotencyKey: "idem-reports",
      payload: { risk: "LOW" },
    });
    api.close();
    expect(exchange.status).toBe("NOT_IMPLEMENTED");
    expect(reports.status).toBe("NOT_IMPLEMENTED");
    expect(reports.auto).toBe(false);
    expect(reports.autoEligible).toBe(false);
    expect(fs.existsSync(unused)).toBe(false);
  });

  it("dedupes a waiting approval and lets only a human decide it", async () => {
    const api = facade();
    const first = await api.dispatch({
      action: "CANCEL_ORDER",
      agentId: "pusat",
      idempotencyKey: "idem-cancel-1",
    });
    const second = await api.dispatch({
      action: "CANCEL_ORDER",
      agentId: "pusat",
      idempotencyKey: "idem-cancel-1",
    });
    const denied = api.decideHumanApproval({ id: first.approvalId, approved: true, actorId: "pusat" });
    const decided = api.decideHumanApproval({ id: first.approvalId, approved: true, actorId: "human" });
    api.close();

    const Database = require("better-sqlite3");
    const db = new Database(approvalDbPath, { readonly: true });
    const taskCount = db.prepare("SELECT COUNT(*) AS n FROM orch_tasks").get().n;
    const approvals = db.prepare("SELECT status, action, requested_by FROM orch_approvals WHERE task_id = ?").all(
      "facade:idem-cancel-1"
    );
    const coreTables = db
      .prepare("SELECT name FROM sqlite_master WHERE name IN ('core_ai_tasks', 'core_approvals')")
      .all();
    db.close();

    expect(first.status).toBe("WAITING_APPROVAL");
    expect(first.approvalCreated).toBe(true);
    expect(second.replay).toBe(true);
    expect(second.approvalCreated).toBe(false);
    expect(denied.ok).toBe(false);
    expect(denied.errorCode).toBe("PERMISSION_DENIED");
    expect(denied.moneyMoved).toBe(false);
    expect(decided.ok).toBe(true);
    expect(decided.status).toBe("APPROVED");
    expect(decided.commercialExecuted).toBe(false);
    expect(decided.purchased).toBe(false);
    expect(decided.refunded).toBe(false);
    expect(decided.shipmentCreated).toBe(false);
    expect(taskCount).toBe(0);
    expect(approvals).toEqual([{ status: "APPROVED", action: "ORDER_CANCEL", requested_by: "pusat" }]);
    expect(coreTables).toEqual([]);
  });

  it("rejects card data and refuses the Buzzard database path", async () => {
    const card = "4111111111111111";
    const api = facade();
    const rejected = await api.dispatch({
      action: "REAL_PAYMENT_CAPTURE",
      agentId: "pusat",
      idempotencyKey: "idem-card-01",
      payload: { card },
    });
    api.close();
    const refused = createOrchestrationFacade({
      enabled: true,
      approvalDbPath: path.join(process.cwd(), "server/data/buzzard.db"),
    });
    const blocked = await refused.dispatch({
      action: "CANCEL_ORDER",
      agentId: "pusat",
      idempotencyKey: "idem-db-path",
    });
    refused.close();
    expect(rejected.errorCode).toBe("CARD_DATA_REJECTED");
    expect(JSON.stringify(rejected)).not.toContain(card);
    expect(blocked.errorCode).toBe("DATA_PATH_REFUSED");
    expect(fileMark(dbPath)).toEqual(dbBefore);
    expect(fileMark(ordersPath)).toEqual(ordersBefore);
  });

  it("does not call the control-center task or approval writers", () => {
    const source = fs.readFileSync(path.join(process.cwd(), "server/lib/orchestrationFacade.js"), "utf8");
    expect(source).not.toMatch(/controlCenter|createAiTask|createApproval\(|updateTaskStatus|enqueue\(/);
    expect(source).not.toMatch(/buyStock|initiateTransfer|refund\(/);
    expect(fileMark(dbPath)).toEqual(dbBefore);
    expect(fileMark(ordersPath)).toEqual(ordersBefore);
  });
});
