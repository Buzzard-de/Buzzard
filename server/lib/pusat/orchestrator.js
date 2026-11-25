/**
 * Pusat execution loop over the durable queue. Isolated SQLite. Not a hosted factory.
 */
const { createDurableTaskQueue } = require("./durableTaskQueue");
const { dispatch, AGENT_KINDS } = require("../buzzardNative/core/specialistDispatch");
const { verifyDispatch } = require("./dispatchVerify");
const { ids } = require("../buzzardNative/core/identityRegistry");
const { approvalInputHash } = require("../buzzardNative/core/specialists/brandDraft");
const { createMultiMemory } = require("../buzzardNative/core/multiMemory");
const { isSalesEnabled } = require("../salesMode");

const STAFF_DUTY = Object.freeze({
  pusat: { kind: "ASSIGN_TASK", input: {} },
  sinan_bey: { kind: "ANALYZE_CODE", input: {} },
  esat_bey: { kind: "SECURITY_STATUS", input: {} },
  dogu_bey: { kind: "RESEARCH_REQUEST", input: { topic: "categories", question: "local_only" } },
  nedim_bey: { kind: "TAX_SPLIT", input: { netProfit: 10, taxEstimate: 1, country: "DE" } },
  tuncay_bey: { kind: "SANCTIONS_SCREEN", input: {} },
  amelia: { kind: "BRAND_DRAFT", input: { product: "catalog" } },
  adrian: { kind: "BRAND_DRAFT", input: { product: "catalog" } },
  mira: { kind: "CAMPAIGN_ANALYZE", input: { rows: [] } },
  leon: { kind: "CAMPAIGN_ANALYZE", input: { rows: [] } },
  stock_ai: { kind: "STOCK_READ", input: { feeds: [] } },
  category_ai: { kind: "CATEGORY_READ", input: {} },
  pricing_ai: {
    kind: "PRICE_CALCULATE",
    input: { supplierCost: 10, shipping: 2, marketplaceCommission: 1, vat: 2, returnReserve: 0.5, paymentFees: 0.4, category: "other" },
  },
  seo_ai: { kind: "SEO_DRAFT", input: { titleFacts: ["Bremsscheibe"], lang: "de" } },
  banu_hanim: { kind: "CUSTOMER_REPLY", input: { intent: "order_status", verifiedFacts: { orderId: "dry", answer: "not sent" } } },
  sales_analysis_ai: { kind: "SALES_REPORT", input: { rows: [{ units: 1, revenue: 10, returns: 0, net: 1 }] } },
  zeynep_hanim: { kind: "PHONE_SESSION", input: {} },
});

const STAFF_DOMAIN = Object.freeze({
  all: Object.keys(STAFF_DUTY),
  software: ["sinan_bey"],
  security: ["esat_bey"],
  research: ["dogu_bey"],
  tax: ["nedim_bey"],
  customs: ["tuncay_bey"],
  brand: ["amelia", "adrian"],
  campaign: ["mira", "leon"],
  stock: ["stock_ai"],
  category: ["category_ai"],
  price: ["pricing_ai"],
  seo: ["seo_ai"],
  customer: ["banu_hanim"],
  sales: ["sales_analysis_ai"],
  phone: ["zeynep_hanim"],
  coordination: ["pusat"],
  publish: ["amelia"],
});

function createOrchestrator({ dbPath } = {}) {
  const queue = createDurableTaskQueue({ dbPath });

  function schedule(spec) {
    return queue.enqueue(spec);
  }

  function executeTask(task) {
    const payload = task.payload || {};
    const kind = payload.kind || "THINK";
    const input = { ...(payload.input || {}), humanApproved: Boolean(payload.humanApproved) };
    const boundApproval = queue
      .listApprovals()
      .find((row) => row.task_id === task.id && row.payload?.inputHash);
    if (boundApproval) {
      const current = approvalInputHash({
        actorId: task.assigneeId,
        action: input.action || kind,
        input,
      });
      if (current !== boundApproval.payload.inputHash) {
        queue.fail(task.id, { reason: "INPUT_HASH_MISMATCH" });
        return { taskId: task.id, status: "FAILED", code: "INPUT_HASH_MISMATCH" };
      }
    }
    const result = dispatch({ agentId: task.assigneeId, kind, input });
    const stamped = { ...payload, result, executedAt: new Date().toISOString() };
    queue.setPayload(task.id, stamped);
    if (!result.ok && result.code === "HUMAN_GATE_REQUIRED" && !payload.humanApproved) {
      const inputHash = result.result?.inputHash || null;
      const approvalPayload = { taskId: task.id, kind };
      if (inputHash) {
        const bound = { actorId: task.assigneeId, action: input.action || kind, input };
        if (approvalInputHash(bound) !== inputHash) {
          queue.fail(task.id, { reason: "INPUT_HASH_MISMATCH" });
          return { taskId: task.id, status: "FAILED", code: "INPUT_HASH_MISMATCH" };
        }
        queue.setPayload(task.id, { ...stamped, gateInputHash: inputHash, gateBound: bound });
        approvalPayload.inputHash = inputHash;
        approvalPayload.bound = bound;
      }
      queue.submitApproval({
        taskId: task.id,
        action: kind,
        requestedBy: task.assigneeId,
        reason: result.code,
        risk: "HIGH",
        payload: approvalPayload,
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

  function routeStaff({ domain = "all", input = null, maxAttempts = 3 } = {}) {
    const roster = ids();
    if (roster.length !== 17 || roster.some((id) => !STAFF_DUTY[id] || !AGENT_KINDS[id])) {
      return { ok: false, code: "ROSTER_INCOMPLETE", live: false, salesEnabled: isSalesEnabled() };
    }
    const selected = STAFF_DOMAIN[domain];
    if (!selected) return { ok: false, code: "UNKNOWN_DOMAIN", live: false, salesEnabled: isSalesEnabled() };
    const memory = createMultiMemory();
    for (const id of selected) {
      const duty = STAFF_DUTY[id];
      const kind = domain === "publish" ? "APPROVAL_REQUEST" : duty.kind;
      schedule({
        title: `staff-${domain}-${id}`,
        assigneeId: id,
        ownerId: "pusat",
        kind,
        input: input || (kind === "APPROVAL_REQUEST" ? { action: "BRAND_LIVE_PUBLISH" } : duty.input),
        maxAttempts,
      });
    }
    const ran = tick({ limit: Math.max(selected.length, maxAttempts) });
    const reports = ran.executed.map((row) => ({
      taskId: row.taskId,
      status: row.status,
      agentId: row.result?.agentId || null,
      kind: row.result?.kind || null,
      code: row.result?.code || row.code || null,
    }));
    const note = memory.put({
      actorId: "pusat",
      ownerId: "pusat",
      type: "shared_knowledge",
      key: `staff-${domain}`,
      value: { domain, reports, at: new Date().toISOString() },
    });
    return {
      ok: reports.length === selected.length && reports.every((row) => row.status === "COMPLETED" || row.status === "GATED"),
      domain,
      members: selected.length,
      reports,
      merged: { count: reports.length, completed: reports.filter((row) => row.status === "COMPLETED").length, gated: reports.filter((row) => row.status === "GATED").length },
      memory: { ok: note.ok === true, version: note.version || null, store: memory },
      audit: queue.health(),
      salesEnabled: isSalesEnabled(),
      live: false,
      network: false,
      llmCouncil: false,
    };
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
    routeStaff,
    executeTask,
    status,
    queue,
    approvals: {
      submit: (row) => queue.submitApproval(row),
      decide: (row) => {
        const item = queue.getApproval(row.id);
        const task = item ? queue.get(item.task_id) : null;
        const gateHash = task?.payload?.gateInputHash;
        const approvalHash = item?.payload?.inputHash;
        if (gateHash || approvalHash) {
          const actual = approvalInputHash(task?.payload?.gateBound || {});
          if (!gateHash || approvalHash !== gateHash || actual !== gateHash) {
            return { ok: false, code: "INPUT_HASH_MISMATCH" };
          }
        }
        return queue.decideApproval(row);
      },
      pending: () => queue.listApprovals({ status: "WAITING_APPROVAL" }),
      list: () => queue.listApprovals(),
    },
    close,
    live: false,
  };
}

module.exports = { createOrchestrator, STAFF_DUTY, STAFF_DOMAIN };
