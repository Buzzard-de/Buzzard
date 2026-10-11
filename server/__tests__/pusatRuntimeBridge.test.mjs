import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { createRequire } from "node:module";
import fs from "node:fs";
import path from "node:path";

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

const require = createRequire(import.meta.url);

const distIndex = path.join(process.cwd(), "pusat-ai-runtime/dist/src/index.js");
const distExists = fs.existsSync(distIndex);

describe("pusatRuntimeBridge (Phase B)", () => {
  const envBackup = { ...process.env };

  beforeEach(() => {
    process.env.PUSAT_RUNTIME_ENABLED = "0";
    process.env.BUZZARD_SALES_ENABLED = "0";
    const bridge = require("../lib/pusatRuntimeBridge.js");
    bridge.resetPusatRuntimeCacheForTests();
  });

  afterEach(() => {
    process.env = { ...envBackup };
    const bridge = require("../lib/pusatRuntimeBridge.js");
    bridge.resetPusatRuntimeCacheForTests();
  });

  it("is disabled by default", () => {
    delete process.env.PUSAT_RUNTIME_ENABLED;
    const bridge = require("../lib/pusatRuntimeBridge.js");
    expect(bridge.isPusatRuntimeEnabled()).toBe(false);
  });

  it("returns PUSAT_RUNTIME_DISABLED without changing behavior when flag is off", async () => {
    const bridge = require("../lib/pusatRuntimeBridge.js");
    const result = await bridge.dispatchPusatTask({
      action: "GET_ORDER",
      payload: { orderNumber: "X" },
    });
    expect(result.status).toBe("BLOCKED");
    expect(result.errorCode).toBe("PUSAT_RUNTIME_DISABLED");
  });

  it("does not load Pusat runtime when flag is off", async () => {
    delete process.env.PUSAT_RUNTIME_ENABLED;
    const bridge = require("../lib/pusatRuntimeBridge.js");
    await expect(bridge.getPusatRuntime()).resolves.toBeNull();
  });

  it("bridge sources use dist ESM only and do not reference Python orchestrator bridge", () => {
    const bridgeSrc = fs.readFileSync(path.join(process.cwd(), "server/lib/pusatRuntimeBridge.js"), "utf8");
    const adapterSrc = fs.readFileSync(path.join(process.cwd(), "server/lib/pusatPolicyAdapter.js"), "utf8");
    expect(bridgeSrc).toContain("pusat-ai-runtime/dist/src/index.js");
    expect(bridgeSrc).not.toMatch(/pusat-ai-runtime\/src\//);
    expect(bridgeSrc).not.toMatch(/orchestratorBridge/);
    expect(adapterSrc).not.toMatch(/orchestratorBridge/);
    expect(adapterSrc).not.toMatch(/fetchOrchestrator/);
    expect(adapterSrc).toMatch(/controlCenter\.createApproval\(/);
  });

  it("maps X-Correlation-Id middleware shape via req.correlationId", () => {
    const bridge = require("../lib/pusatRuntimeBridge.js");
    const correlationContext = require("../lib/operations/correlationContext.js");
    const ctx = correlationContext.createContext({
      correlationId: "corr_from_header_sim",
    });
    const req = { correlationId: ctx.correlationId, operationsContext: ctx };
    expect(bridge.resolveCorrelationId({ req })).toBe("corr_from_header_sim");
  });

  it.each(WRITE_OR_COMMERCE_ACTIONS)(
    "blocks commerce/side-effect action %s before Pusat orchestrator",
    async (action) => {
      process.env.PUSAT_RUNTIME_ENABLED = "1";
      const bridge = require("../lib/pusatRuntimeBridge.js");
      const result = await bridge.dispatchPusatTask({
        action,
        correlationId: `corr_block_${action}`,
        permissions: ["ai.read", "ai.execute", "*"],
        payload: { sessionId: "safety-test" },
      });
      expect(result.status).toBe("BLOCKED");
      expect(result.status).not.toBe("SUCCESS");
      expect(["HUMAN_APPROVAL_REQUIRED", "ACTION_NOT_ALLOWED"]).toContain(result.errorCode);
    }
  );

  it("approval path uses controlCenter.createApproval only (no duplicate adapter DB)", async () => {
    process.env.PUSAT_RUNTIME_ENABLED = "1";
    const policyAdapter = require("../lib/pusatPolicyAdapter.js");
    const controlCenter = require("../lib/controlCenter.js");
    const before = controlCenter.listApprovals("PENDING").length;
    const approval = policyAdapter.mapHumanApprovalToControlCenter({
      correlationId: "corr_approval_only",
      action: "REFUND_HIGH_VALUE",
      reason: "safety test",
      sessionId: "sess-1",
    });
    expect(approval?.id).toBeTruthy();
    expect(controlCenter.listApprovals("PENDING").length).toBe(before + 1);
    const adapterSrc = fs.readFileSync(path.join(process.cwd(), "server/lib/pusatPolicyAdapter.js"), "utf8");
    expect(adapterSrc).not.toMatch(/INSERT INTO.*approval/i);
    expect(adapterSrc).not.toMatch(/new.*ApprovalDatabase/);
  });

  it("reuses req.correlationId from Buzzard correlation middleware shape", () => {
    const bridge = require("../lib/pusatRuntimeBridge.js");
    const req = { correlationId: "corr_existing_123" };
    expect(bridge.resolveCorrelationId({ req })).toBe("corr_existing_123");
    bridge.bindRequestCorrelation(req, "corr_existing_123");
    expect(req.correlationId).toBe("corr_existing_123");
  });

  it("blocks non-read-only actions and maps approval class to control center", async () => {
    process.env.PUSAT_RUNTIME_ENABLED = "1";
    const bridge = require("../lib/pusatRuntimeBridge.js");
    const controlCenter = require("../lib/controlCenter.js");
    const before = controlCenter.listApprovals("PENDING").length;

    const result = await bridge.dispatchPusatTask({
      action: "REFUND_HIGH_VALUE",
      payload: { sessionId: "sess-test", amount: 1000 },
      correlationId: "corr_refund_test",
      permissions: ["ai.read"],
    });

    expect(result.status).toBe("BLOCKED");
    expect(result.errorCode).toBe("HUMAN_APPROVAL_REQUIRED");
    const after = controlCenter.listApprovals("PENDING").length;
    expect(after).toBeGreaterThan(before);
  });

  it.skipIf(!distExists)("dispatches read-only GET_ORDER when enabled and dist is built", async () => {
    process.env.PUSAT_RUNTIME_ENABLED = "1";
    const bridge = require("../lib/pusatRuntimeBridge.js");
    const result = await bridge.dispatchPusatTask({
      action: "GET_ORDER",
      targetAi: "order-ai",
      payload: { sessionId: "s1", orderNumber: "NOPE", email: "none@example.com" },
      correlationId: "corr_read_test",
      permissions: ["ai.read", "ai.execute"],
      idempotencyKey: "test-get-order-1",
    });
    expect(["SUCCESS", "BLOCKED"]).toContain(result.status);
    expect(result.correlationId).toBe("corr_read_test");
  });
});
