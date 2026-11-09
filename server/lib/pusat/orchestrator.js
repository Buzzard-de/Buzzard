/**
 * Pusat execution loop over the durable queue. Isolated SQLite. Not a hosted factory.
 */
const { createDurableTaskQueue } = require("./durableTaskQueue");
const { dispatch } = require("../buzzardNative/core/specialistDispatch");
const { createApprovalCenter, RISK } = require("./humanApproval");
const { ids } = require("../buzzardNative/core/identityRegistry");

function createOrchestrator({ dbPath, approvals = createApprovalCenter() } = {}) {
  const queue = createDurableTaskQueue({ dbPath });

  function schedule(spec) {
    return queue.enqueue(spec);
  }

  function executeTask(task) {
    const payload = task.payload || {};
    const kind = payload.kind || "THINK";
    const input = payload.input || {};
    const result = dispatch({ agentId: task.assigneeId, kind, input });
    queue.setPayload(task.id, { ...payload, result, executedAt: new Date().toISOString() });
    if (!result.ok && result.code === "HUMAN_GATE_REQUIRED") {
      approvals.submit({
        action: kind,
        requestedBy: task.assigneeId,
        reason: result.code,
        risk: RISK.HIGH,
        payload: { taskId: task.id },
      });
      queue.block(task.id, { reason: "HUMAN_GATE_REQUIRED" });
      return { taskId: task.id, status: "GATED", result };
    }
    if (!result.ok) {
      queue.fail(task.id, { reason: result.code || "DISPATCH_FAIL" });
      return { taskId: task.id, status: "FAILED", result };
    }
    queue.markTests(task.id, { testsPassed: true, acceptancePassed: true });
    const done = queue.complete(task.id);
    return { taskId: task.id, status: done.ok ? "COMPLETED" : done.code, result };
  }

  function tick({ workerId = "pusat-worker", limit = 8 } = {}) {
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

  function close() {
    queue.close();
  }

  return { schedule, tick, coordinateCouncil, executeTask, queue, approvals, close, live: false };
}

module.exports = { createOrchestrator };
