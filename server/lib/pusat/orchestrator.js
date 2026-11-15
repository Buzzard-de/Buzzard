/**
 * Pusat execution loop over the durable queue. Isolated SQLite. Not a hosted factory.
 */
const { createDurableTaskQueue } = require("./durableTaskQueue");
const { dispatch } = require("../buzzardNative/core/specialistDispatch");
const { verifyDispatch } = require("./dispatchVerify");
const { ids } = require("../buzzardNative/core/identityRegistry");

function createOrchestrator({ dbPath } = {}) {
  const queue = createDurableTaskQueue({ dbPath });

  function schedule(spec) {
    return queue.enqueue(spec);
  }

  function executeTask(task) {
    const payload = task.payload || {};
    const kind = payload.kind || "THINK";
    const input = { ...(payload.input || {}), humanApproved: Boolean(payload.humanApproved) };
    const result = dispatch({ agentId: task.assigneeId, kind, input });
    queue.setPayload(task.id, { ...payload, result, executedAt: new Date().toISOString() });
    if (!result.ok && result.code === "HUMAN_GATE_REQUIRED" && !payload.humanApproved) {
      queue.submitApproval({
        taskId: task.id,
        action: kind,
        requestedBy: task.assigneeId,
        reason: result.code,
        risk: "HIGH",
        payload: { taskId: task.id, kind },
      });
      queue.block(task.id, { reason: "HUMAN_GATE_REQUIRED" });
      return { taskId: task.id, status: "GATED", result, verification: { code: "NOT_VERIFIED" } };
    }
    const verification = verifyDispatch({ kind, result });
    queue.setPayload(task.id, { ...payload, result, verification, executedAt: new Date().toISOString() });
    if (!verification.testsPassed || !verification.acceptancePassed) {
      if (verification.code === "HUMAN_GATE_REQUIRED") {
        queue.block(task.id, { reason: verification.code });
        return { taskId: task.id, status: "GATED", result, verification };
      }
      queue.fail(task.id, { reason: verification.code || "NOT_VERIFIED" });
      return { taskId: task.id, status: "FAILED", result, verification };
    }
    queue.markTests(task.id, {
      testsPassed: verification.testsPassed,
      acceptancePassed: verification.acceptancePassed,
    });
    const done = queue.complete(task.id);
    return { taskId: task.id, status: done.ok ? "COMPLETED" : done.code, result, verification };
  }

  function tick({ workerId = "pusat-worker", limit = 8 } = {}) {
    queue.registerWorker({ workerId, identity: workerId });
    queue.heartbeat({ workerId });
    queue.recoverCrashed();
    queue.recoverStale();
    const executed = [];
    for (let i = 0; i < limit; i += 1) {
      const leased = queue.lease({ workerId });
      if (!leased.ok) break;
      executed.push(executeTask(leased.task));
    }
    return { ok: true, executed, health: queue.health(), live: false, llmCouncil: false };
  }

  function coordinateCouncil({ kind = "THINK" } = {}) {
    const created = ids().map((id) => schedule({ title: `coord-${id}`, assigneeId: id, kind, ownerId: "pusat" }));
    const ran = tick({ limit: 17 });
    return { created: created.length, ran: ran.executed, health: queue.health(), live: false, llmCouncil: false };
  }

  function status() {
    return {
      ...queue.health(),
      executor: "specialistDispatch",
      llmCouncil: false,
      durableIsolatedSqlite: true,
      inMemory: false,
      live: false,
      hostedFactory: false,
      pendingApprovals: queue.listApprovals({ status: "WAITING_APPROVAL" }).length,
    };
  }

  function close() {
    queue.close();
  }

  return {
    schedule,
    tick,
    coordinateCouncil,
    executeTask,
    status,
    queue,
    approvals: {
      submit: (row) => queue.submitApproval(row),
      decide: (row) => queue.decideApproval(row),
      pending: () => queue.listApprovals({ status: "WAITING_APPROVAL" }),
      list: () => queue.listApprovals(),
    },
    close,
    live: false,
  };
}

module.exports = { createOrchestrator };
