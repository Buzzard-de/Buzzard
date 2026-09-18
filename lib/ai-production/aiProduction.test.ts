import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  canAiPerformAction,
  redactAiContext,
  getAiProductionDashboard,
  assertAiProductionSafetyInvariants,
  resetAiProductionSafetyCountersForTests,
} from "./index";

const ORIGINAL = { ...process.env };

describe("#352 AI production", () => {
  beforeEach(() => {
    process.env.AI_PRODUCTION_ENABLED = "0";
    resetAiProductionSafetyCountersForTests();
  });
  afterEach(() => {
    process.env = { ...ORIGINAL };
  });

  it("blocks AI from SEND_ORDER", () => {
    const result = canAiPerformAction({ actorId: "ai-worker-1", action: "SEND_ORDER", workerId: "ORDER_AI" });
    expect(result.allowed).toBe(false);
  });

  it("blocks AI approval actions", () => {
    const result = canAiPerformAction({ actorId: "ai-agent", action: "APPROVE_LIVE_VALIDATION" });
    expect(result.allowed).toBe(false);
  });

  it("redacts secrets from AI context", () => {
    const redacted = redactAiContext({ accessToken: "secret", orderId: "123" });
    expect(redacted.accessToken).toBe("[REDACTED]");
    expect(redacted.orderId).toBe("123");
  });

  it("dashboard production DISABLED", () => {
    const dash = getAiProductionDashboard();
    expect(dash.productionEnabled).toBe("DISABLED");
    expect(dash.workers.length).toBe(10);
  });

  it("zero real provider calls", () => {
    expect(assertAiProductionSafetyInvariants().ok).toBe(true);
  });
});
