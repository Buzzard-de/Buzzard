import { createRequire } from "node:module";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";

const require = createRequire(import.meta.url);
const { getAgent } = require("../lib/buzzardNative/core/identityRegistry");
const { AGENT_KINDS, dispatch } = require("../lib/buzzardNative/core/specialistDispatch");
const { createDurable } = require("../lib/pusat/durable");
const { createDurableTaskQueue } = require("../lib/pusat/durableTaskQueue");
const { createApprovalCenter } = require("../lib/pusat/humanApproval");
const { executeReadOnly, health } = require("../lib/pusat/runtime");
const { aiCanExecute } = require("../lib/rbac");
const { quotePrice, applyPriceChange } = require("../lib/commerce/pricingIntegration");

const requireDb = createRequire(path.join(__dirname, "../package.json"));
const Database = requireDb("better-sqlite3");

const dirs = [];
afterEach(() => {
  while (dirs.length) rmSync(dirs.pop(), { recursive: true, force: true });
});

function tempDir() {
  const dir = mkdtempSync(path.join(tmpdir(), "buzzard-item36-"));
  dirs.push(dir);
  return dir;
}

describe("items 36-55 pusat controls", () => {
  it("registers named specialists and their tools", () => {
    const pricing = getAgent("pricing_ai");
    expect(pricing?.agent_id).toBe("pricing_ai");
    expect(AGENT_KINDS.pricing_ai).toContain("PRICE_CALCULATE");
    expect(AGENT_KINDS.stock_ai).toContain("STOCK_BUY");
    expect(Object.keys(AGENT_KINDS).length).toBeGreaterThanOrEqual(17);
    const thought = dispatch({ agentId: "pricing_ai", kind: "THINK", input: { note: "dry" } });
    expect(thought.llmCompleted).toBe(false);
    expect(thought.live).toBe(false);
  });

  it("keeps personal memory inside the owner", () => {
    const db = new Database(path.join(tempDir(), "memory.sqlite"));
    const store = createDurable(db);
    store.putMemory({ ownerId: "pricing_ai", key: "note", value: { n: 1 } });
    expect(store.getMemory({ ownerId: "pricing_ai", requesterId: "stock_ai" }).code).toBe("PERSONAL_MEMORY_DENIED");
    expect(store.getMemory({ ownerId: "pricing_ai", requesterId: "pricing_ai" }).ok).toBe(true);
    db.close();
  });

  it("holds a task for approval, rejects an AI decider, then dead-letters after the last attempt", () => {
    const queue = createDurableTaskQueue({ dbPath: path.join(tempDir(), "queue.sqlite") });
    const held = queue.enqueue({ title: "hold", needsApproval: true, maxAttempts: 1 });
    expect(held.task.state).toBe("BLOCKED_APPROVAL");
    expect(queue.complete(held.task.id).code).toBe("BLOCKED_APPROVAL");

    const approval = queue.submitApproval({
      taskId: held.task.id,
      action: "PRICE_CALCULATE",
      requestedBy: "pricing_ai",
      risk: "HIGH",
    });
    expect(queue.decideApproval({ id: approval.item.id, approved: true, actorId: "pricing_ai" }).code).toBe(
      "PERMISSION_DENIED"
    );

    const work = queue.enqueue({ title: "retry", maxAttempts: 1 });
    const leased = queue.lease({ workerId: "worker-a" });
    expect(leased.task.id).toBe(work.task.id);
    expect(queue.fail(work.task.id, { reason: "boom" }).task.state).toBe("DEAD_LETTER");
    const retry = queue.enqueue({ title: "twice", maxAttempts: 2 });
    expect(queue.lease({ workerId: "worker-b" }).task.id).toBe(retry.task.id);
    expect(queue.fail(retry.task.id, { reason: "once" }).task.state).toBe("QUEUED");
    expect(queue.lease({ workerId: "worker-b" }).task.id).toBe(retry.task.id);
    expect(queue.fail(retry.task.id, { reason: "twice" }).task.state).toBe("DEAD_LETTER");
    expect(queue.registerWorker({ workerId: "worker-c", identity: "sinan_bey" }).ok).toBe(true);
    expect(queue.heartbeat({ workerId: "worker-c" }).ok).toBe(true);
    expect(queue.health().workers.live).toBe(false);
    expect(queue.decideApproval({ id: approval.item.id, approved: true, actorId: "human" }).ok).toBe(true);
    queue.close();
  });

  it("does not retry a payment write and keeps pricing as a recommendation", () => {
    const previous = process.env.PUSAT_RUNTIME_ENABLED;
    process.env.PUSAT_RUNTIME_ENABLED = "1";
    try {
      const denied = executeReadOnly("CAPTURE_PAYMENT", { amount: 1 }, { actorId: "pricing_ai" });
      expect(denied.code).toBe("PERMISSION_DENIED");
      expect(health().live).toBe(false);
      expect(health().deniedWrites).toContain("CAPTURE_PAYMENT");
    } finally {
      if (previous === undefined) delete process.env.PUSAT_RUNTIME_ENABLED;
      else process.env.PUSAT_RUNTIME_ENABLED = previous;
    }
    const quote = quotePrice({ supplierCost: 10 });
    expect(quote.recommendationOnly).toBe(true);
    expect(applyPriceChange({ productId: "none", amount: 1, actorType: "AI", approved: true, permission: true, actorId: "pricing-test" }).code).toBe(
      "AI_PRICE_WRITE_DENIED"
    );
  });

  it("limits an agent to its permission list and auto-approves only a low-risk submit", () => {
    expect(aiCanExecute(["ai.read"], "ai.execute")).toBe(false);
    const center = createApprovalCenter({ dbPath: path.join(tempDir(), "approvals.sqlite") });
    const low = center.submit({ action: "READ", requestedBy: "pricing_ai", risk: "LOW" });
    expect(low.item.auto).toBe(true);
    expect(low.item.decidedBy).toBe("policy:low-risk");
    const high = center.submit({ action: "CAPTURE_PAYMENT", requestedBy: "pricing_ai", risk: "HIGH" });
    expect(high.item.status).toBe("WAITING_APPROVAL");
    center.close();
  });
});
