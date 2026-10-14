import { describe, it, expect, beforeAll } from "vitest";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

describe("Pusat task orchestration holds for approval (item 39)", () => {
  let pusat;
  let db;

  beforeAll(() => {
    pusat = require("../lib/pusat");
    db = require("../lib/db").db;
    pusat.initialize(db);
  });

  it("does not remint approval after reject and does not execute", async () => {
    const submitted = pusat.submitTask({
      title: "Critical reject hold",
      agentCode: "order_assistant",
      priority: "CRITICAL",
      payload: { action: "order.create", orderId: "HOLD-1" },
      createdBy: "test@pusat",
      enqueue: false,
    });
    const waiting = await pusat.executeTask(submitted.task.id);
    expect(waiting.status).toBe("WAITING_APPROVAL");
    const pending = pusat.approval.latestForTask(submitted.task.id);
    expect(pending.status).toBe("PENDING");

    const rejected = pusat.approval.decide(pending.id, "reject", "reviewer@test");
    expect(rejected.approval.status).toBe("REJECTED");

    const again = await pusat.executeTask(submitted.task.id);
    expect(again.status).toBe("CANCELLED");
    expect(again.result.executed).toBe(false);
    expect(again.result.reminted).toBe(false);
    expect(again.result.approvalStatus).toBe("REJECTED");
    const latest = pusat.approval.latestForTask(submitted.task.id);
    expect(latest.status).toBe("REJECTED");
    expect(latest.id).toBe(pending.id);
  });

  it("does not remint approval after cancel", async () => {
    const submitted = pusat.submitTask({
      title: "Critical cancel hold",
      agentCode: "order_assistant",
      priority: "CRITICAL",
      payload: { action: "order.create", orderId: "HOLD-2" },
      createdBy: "test@pusat",
      enqueue: false,
    });
    await pusat.executeTask(submitted.task.id);
    const pending = pusat.approval.latestForTask(submitted.task.id);
    pusat.approval.cancel(pending.id, "reviewer@test", "withdrawn");
    const again = await pusat.executeTask(submitted.task.id);
    expect(again.status).toBe("CANCELLED");
    expect(again.result.reminted).toBe(false);
    expect(pusat.approval.latestForTask(submitted.task.id).status).toBe("CANCELLED");
  });
});

describe("Guardian employee identity fail-closed (item 49)", () => {
  it("denies execution when employee identity is missing", () => {
    const pusat = require("../lib/pusat");
    const denied = pusat.guardian.evaluate({
      agentId: "price_ai",
      action: "price.recommend",
      payload: { sku: "X" },
    });
    expect(denied.allowed).toBe(false);
    expect(denied.code).toBe("PUSAT_GUARDIAN_BLOCKED");
    expect(denied.message).toMatch(/employee identity/i);
  });
});

describe("LLM provider honesty (item 47/55)", () => {
  it("reports stub effective provider and never live", async () => {
    const { getProviderHonesty, PROVIDERS } = require("../lib/aiProviders");
    const honesty = getProviderHonesty();
    expect(honesty.live).toBe(false);
    expect(honesty.stub).toBe(true);
    expect(honesty.effective).toBe(PROVIDERS.STUB);

    const pusat = require("../lib/pusat");
    const health = await pusat.getHealth();
    expect(health.provider.live).toBe(false);
    expect(health.provider.stub).toBe(true);
    expect(health.provider.requested).toBeTruthy();
  });
});

describe("Recommendation-only execute wrapper (item 54)", () => {
  it("stamps commercialSideEffects false on every executeAgent result", () => {
    const pusat = require("../lib/pusat");
    pusat.initialize(require("../lib/db").db);
    const priced = pusat.agents.executeAgent("price_assistant", { supplierCost: 10, salePrice: 20 });
    expect(priced.recommendationOnly).toBe(true);
    expect(priced.commercialSideEffects).toBe(false);
    expect(priced.liveMutations).toBe(false);
    const missing = pusat.agents.executeAgent("not_a_real_agent", {});
    expect(missing.ok).toBe(false);
    expect(missing.commercialSideEffects).toBe(false);
  });
});
