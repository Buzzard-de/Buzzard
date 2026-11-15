import { createRequire } from "node:module";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";

const require = createRequire(import.meta.url);
const { createDurableTaskQueue } = require("../lib/pusat/durableTaskQueue.js");
const { createTaskQueue } = require("../lib/pusat/taskQueue.js");
const { createOrchestrator } = require("../lib/pusat/orchestrator.js");
const { SEED_IDS } = require("../lib/buzzardNative/core/identityRegistry.js");

function isolatedQueue() {
  const dbPath = path.join(mkdtempSync(path.join(tmpdir(), "buzzard-dispatch-dlq-")), "orch.sqlite");
  return createDurableTaskQueue({ dbPath });
}

describe("Pusat dispatch failure and dead-letter reliability", () => {
  it("retries only the failed task id, then dead-letters it without executing the letter", () => {
    const queue = isolatedQueue();
    try {
      const target = queue.enqueue({
        title: "flaky",
        ownerId: "pusat",
        assigneeId: "sinan_bey",
        maxAttempts: 2,
        idempotencyKey: "flaky-1",
        kind: "STOCK_BUY",
      });
      const other = queue.enqueue({
        title: "untouched",
        ownerId: "pusat",
        assigneeId: "esat_bey",
        dependsOn: ["missing-parent"],
        kind: "THINK",
      });
      const held = queue.enqueue({
        title: "needs-human",
        ownerId: "pusat",
        assigneeId: "nedim_bey",
        needsApproval: true,
        kind: "BANK_TRANSFER",
      });
      expect(SEED_IDS).toContain(target.task.assigneeId);
      expect(queue.fail("missing-task", { reason: "NO_SUCH" }).code).toBe("NOT_FOUND");
      expect(queue.fail(held.task.id, { reason: "SHOULD_NOT_RELEASE" }).code).toBe("BLOCKED_APPROVAL");
      expect(queue.get(held.task.id).state).toBe("BLOCKED_APPROVAL");

      const firstLease = queue.lease({ workerId: "w1" });
      const secondLease = queue.lease({ workerId: "w2" });
      expect(firstLease.task.id).toBe(target.task.id);
      expect(secondLease.ok).toBe(false);
      const firstFail = queue.fail(target.task.id, { reason: "NOT_VERIFIED" });
      expect(firstFail.completed).toBe(false);
      expect(firstFail.retried).toBe(true);
      expect(firstFail.task.state).toBe("QUEUED");
      expect(queue.get(other.task.id).state).toBe("QUEUED");
      expect(queue.get(other.task.id).attempts).toBe(0);

      const replay = queue.lease({ workerId: "w3" });
      expect(replay.task.id).toBe(target.task.id);
      expect(replay.task.attempts).toBe(2);
      const secondFail = queue.fail(target.task.id, { reason: "STILL_NOT_VERIFIED" });
      expect(secondFail.deadLetter).toBe(true);
      expect(secondFail.completed).toBe(false);
      expect(secondFail.task.state).toBe("DEAD_LETTER");
      expect(secondFail.task.completed).toBe(false);
      expect(secondFail.task.payload.failureHistory.map((entry) => entry.reason)).toEqual([
        "NOT_VERIFIED",
        "STILL_NOT_VERIFIED",
      ]);
      expect(secondFail.task.payload.lastError).toBe("STILL_NOT_VERIFIED");
      expect(queue.listDeadLetters()).toEqual([
        expect.objectContaining({ taskId: target.task.id, reason: "STILL_NOT_VERIFIED" }),
      ]);
      const events = queue.listAudit(target.task.id).map((entry) => entry.event);
      expect(events).toContain("RETRY");
      expect(events).toContain("DEAD_LETTER");
      expect(queue.get(other.task.id).payload.failureHistory).toBeUndefined();

      expect(queue.lease({ workerId: "w4" }).code).toBe("EMPTY");
      expect(queue.recoverLeases().recovered).toBe(0);
      expect(queue.recoverCrashed().recovered).toBe(0);
      expect(queue.enqueue({ title: "flaky", idempotencyKey: "flaky-1" }).duplicate).toBe(true);
      expect(queue.enqueue({ title: "flaky", idempotencyKey: "flaky-1" }).task.state).toBe("DEAD_LETTER");
      expect(queue.complete(target.task.id).code).toBe("TERMINAL_STATE");
      expect(queue.get(target.task.id).state).toBe("DEAD_LETTER");
      expect(queue.health().completed).toBe(0);
      expect(queue.health().deadLetter).toBe(1);
      expect(queue.health().live).toBe(false);
    } finally {
      queue.close();
    }
  });

  it("keeps an orchestrator verification failure off the success path", () => {
    const dbPath = path.join(mkdtempSync(path.join(tmpdir(), "buzzard-orch-fail-")), "orch.sqlite");
    const orch = createOrchestrator({ dbPath });
    try {
      const scheduled = orch.schedule({
        title: "unauthorized-buy",
        ownerId: "pusat",
        assigneeId: "sinan_bey",
        kind: "STOCK_BUY",
        maxAttempts: 2,
      });
      const ran = orch.tick({ limit: 5 });
      expect(ran.live).toBe(false);
      expect(ran.executed).toHaveLength(2);
      expect(ran.executed.every((row) => row.taskId === scheduled.task.id)).toBe(true);
      expect(ran.executed.every((row) => row.status === "FAILED")).toBe(true);
      expect(ran.executed.some((row) => row.status === "COMPLETED")).toBe(false);
      const task = orch.queue.get(scheduled.task.id);
      expect(task.state).toBe("DEAD_LETTER");
      expect(task.completed).toBe(false);
      expect(task.payload.failureHistory.map((entry) => entry.reason)).toEqual(["NOT_VERIFIED", "NOT_VERIFIED"]);
      expect(orch.queue.lease({ workerId: "after" }).code).toBe("EMPTY");
      expect(orch.status().completed).toBe(0);
      expect(orch.status().deadLetter).toBe(1);
      expect(orch.status().live).toBe(false);
    } finally {
      orch.close();
    }
  });

  it("does not start an in-memory dead letter or mark it complete", () => {
    const queue = createTaskQueue();
    const target = queue.enqueue({ title: "flaky", ownerId: "pusat", assigneeId: "sinan_bey", maxAttempts: 2 });
    const other = queue.enqueue({ title: "other", ownerId: "pusat", assigneeId: "esat_bey", dependsOn: ["missing-parent"] });
    expect(queue.fail("missing", { reason: "NO_SUCH" }).code).toBe("NOT_FOUND");
    queue.tick();
    expect(queue.fail(target.task.id, { reason: "FIRST" }).retried).toBe(true);
    expect(queue.snapshot().tasks.find((task) => task.id === other.task.id).state).toBe("QUEUED");
    queue.tick();
    const dead = queue.fail(target.task.id, { reason: "SECOND" });
    expect(dead.deadLetter).toBe(true);
    expect(dead.completed).toBe(false);
    expect(dead.task.state).toBe("DEAD_LETTER");
    expect(dead.task.failureHistory.map((entry) => entry.reason)).toEqual(["FIRST", "SECOND"]);
    expect(queue.snapshot().deadLetters).toEqual([
      expect.objectContaining({ id: target.task.id, reason: "SECOND" }),
    ]);
    const started = queue.tick();
    expect(started.started || []).not.toContain(target.task.id);
    expect(queue.recover(target.task.id).executed).toBe(false);
    expect(queue.snapshot().tasks.find((task) => task.id === target.task.id).state).toBe("QUEUED");
    queue.fail(target.task.id, { retry: false, reason: "SECOND" });
    expect(queue.snapshot().tasks.find((task) => task.id === target.task.id).state).toBe("DEAD_LETTER");
    expect(queue.tick().started || []).not.toContain(target.task.id);
    queue.markTests({ id: target.task.id, testsPassed: true, acceptancePassed: true });
    expect(queue.complete(target.task.id).code).toBe("TERMINAL_STATE");
    expect(queue.snapshot().tasks.find((task) => task.id === target.task.id).state).toBe("DEAD_LETTER");
    expect(queue.snapshot().tasks.find((task) => task.id === other.task.id).attempts).toBe(0);
    expect(queue.snapshot().live).toBe(false);
  });
});
