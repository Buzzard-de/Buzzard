import { describe, expect, it } from "vitest";
import { createPusatRuntime } from "../src/index.js";

describe("Pusat AI runtime", () => {
  it("creates a country persona and live voice session", () => {
    const p = createPusatRuntime();
    const s = p.voice.start("TR");
    expect(s.personaId).toBe("tr-asli");
    expect(s.status).toBe("ACTIVE");
  });

  it("runs independent AI tasks in parallel", async () => {
    const p = createPusatRuntime();
    const s = p.voice.start("PL", "pl-PL");
    const results = await p.orchestrator.parallel([
      {
        correlationId: s.correlationId,
        sourceAi: "voice-ai",
        targetAi: "order-ai",
        action: "GET_ORDER",
        payload: { sessionId: s.sessionId, orderId: "ORDER-1" },
        idempotencyKey: "order:ORDER-1:get",
        authorizationScope: ["action:GET_ORDER"],
        timeoutMs: 2000
      },
      {
        correlationId: s.correlationId,
        sourceAi: "voice-ai",
        targetAi: "inventory-ai",
        action: "CHECK_AVAILABILITY",
        payload: { sessionId: s.sessionId, sku: "SKU-1" },
        idempotencyKey: "stock:SKU-1:check",
        authorizationScope: ["action:CHECK_AVAILABILITY"],
        timeoutMs: 2000
      }
    ]);
    expect(results).toHaveLength(2);
    expect(results.every(x => x.status === "SUCCESS")).toBe(true);
  });

  it("prevents duplicate side effects through idempotency", async () => {
    const p = createPusatRuntime();
    const s = p.voice.start("DE");
    const input = {
      correlationId: s.correlationId,
      sourceAi: "voice-ai",
      targetAi: "order-ai",
      action: "GET_ORDER",
      payload: { sessionId: s.sessionId, orderId: "ORDER-2" },
      idempotencyKey: "same-key",
      authorizationScope: ["action:GET_ORDER"],
      timeoutMs: 2000
    };
    const a = await p.orchestrator.dispatch(input);
    const b = await p.orchestrator.dispatch(input);
    expect(a.taskId).toBe(b.taskId);
    expect(p.store.audit.some(x => x.action === "IDEMPOTENCY_HIT")).toBe(true);
  });

  it("blocks critical operations for human approval", async () => {
    const p = createPusatRuntime();
    const s = p.voice.start("FR");
    const result = await p.orchestrator.dispatch({
      correlationId: s.correlationId,
      sourceAi: "returns-ai",
      targetAi: "returns-ai",
      action: "REFUND_HIGH_VALUE",
      payload: { sessionId: s.sessionId, amount: 1000 },
      idempotencyKey: "refund:1000:1",
      authorizationScope: ["action:REFUND_HIGH_VALUE"],
      timeoutMs: 2000
    });
    expect(result.status).toBe("BLOCKED");
    expect(result.errorCode).toBe("HUMAN_APPROVAL_REQUIRED");
  });
});