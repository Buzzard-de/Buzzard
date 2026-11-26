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
const { modelGate, consultReasoning } = require("../buzzardNative/thinking/modelGate");
const aslan = require("../buzzardNative/core/aslanBey");

const LIFECYCLE = Object.freeze([
  "RECEIVED",
  "CLASSIFIED",
  "QUEUED",
  "ASSIGNED",
  "RUNNING",
  "WAITING_FOR_DEPENDENCY",
  "WAITING_FOR_HUMAN_APPROVAL",
  "RETRYING",
  "VERIFYING",
  "COMPLETED",
  "FAILED",
  "CANCELLED",
]);

const CLASSIFIERS = Object.freeze([
  { re: /sat[ıi]n al|purchase stock/i, code: "HUMAN_GATE_REQUIRED" },
  { re: /sat[ıi][şs].{0,12}(aç|ac)|sales unlock|enable sales/i, code: "SALES_LOCKED" },
  { re: /yay[ıi]n|publish/i, domain: "publish", priority: "P0" },
  { re: /fiyat|price|preis|k[âa]r/i, domain: "price", priority: "P1" },
  { re: /stok|envanter|lager/i, domain: "stock", priority: "P1" },
  { re: /güvenlik|security|sicherheit|adli/i, domain: "security", priority: "P0" },
  { re: /vergi|steuer|\btax\b/i, domain: "tax", priority: "P1" },
  { re: /gümrük|yapt[ıi]r[ıi]m|sanction|customs/i, domain: "customs", priority: "P1" },
  { re: /ara[şs]t[ıi]r|research|kategori/i, domain: "research", priority: "P2" },
  { re: /marka|brand/i, domain: "brand", priority: "P2" },
  { re: /kampanya|influencer/i, domain: "campaign", priority: "P2" },
  { re: /\bseo\b/i, domain: "seo", priority: "P2" },
  { re: /mü[şs]teri|customer/i, domain: "customer", priority: "P1" },
  { re: /sat[ıi][şs] analiz|sales report/i, domain: "sales", priority: "P2" },
  { re: /telefon|ça[ğg]r[ıi]|phone/i, domain: "phone", priority: "P1" },
  { re: /kod|mimar|software|yaz[ıi]l[ıi]m/i, domain: "software", priority: "P1" },
]);

function withPhase(payload, phase) {
  const phases = Array.isArray(payload.phases) ? payload.phases.slice() : [];
  if (phases[phases.length - 1] !== phase) phases.push(phase);
  return { ...payload, lifecycle: phase, phases };
}

function classifyRequest(text) {
  const hit = CLASSIFIERS.find((row) => row.re.test(String(text || "")));
  if (!hit) return { ok: false, code: "UNCLASSIFIED" };
  if (hit.code) return { ok: false, code: hit.code };
  return { ok: true, domain: hit.domain, priority: hit.priority };
}

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
    const queued = queue.enqueue(spec);
    if (!queued.ok || !queued.task || queued.duplicate) return queued;
    const stamped = queue.setPayload(queued.task.id, withPhase({
      ...queued.task.payload,
      domain: spec.domain || null,
      receivedAt: new Date().toISOString(),
      phases: ["RECEIVED", "CLASSIFIED", "QUEUED", "ASSIGNED"],
    }, "ASSIGNED"));
    return { ...queued, task: stamped.task };
  }

  function lifecycleOf(task) {
    if (!task) return null;
    if (task.payload?.lifecycle === "CANCELLED" || task.state === "REJECTED") return "CANCELLED";
    if (task.state === "DEAD_LETTER" || task.state === "FAILED") return "FAILED";
    if (task.state === "BLOCKED_APPROVAL") return "WAITING_FOR_HUMAN_APPROVAL";
    if (task.state === "COMPLETED") return "COMPLETED";
    if (task.state === "RUNNING") return "RUNNING";
    const waiting = (task.dependsOn || []).some((depId) => queue.get(depId)?.state !== "COMPLETED");
    if (task.state === "QUEUED" && waiting) return "WAITING_FOR_DEPENDENCY";
    if (task.state === "QUEUED" && task.payload?.lifecycle === "RETRYING") return "RETRYING";
    if (task.state === "QUEUED") return "QUEUED";
    return task.payload?.lifecycle || task.state;
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
    const stamped = withPhase({ ...payload, result, executedAt: new Date().toISOString() }, "VERIFYING");
    queue.setPayload(task.id, stamped);
    if (!result.ok && result.code === "HUMAN_GATE_REQUIRED" && !payload.humanApproved) {
      const inputHash = result.result?.inputHash || null;
      const approvalPayload = { taskId: task.id, kind };
      let gatePayload = stamped;
      if (inputHash) {
        const bound = { actorId: task.assigneeId, action: input.action || kind, input };
        if (approvalInputHash(bound) !== inputHash) {
          queue.fail(task.id, { reason: "INPUT_HASH_MISMATCH" });
          return { taskId: task.id, status: "FAILED", code: "INPUT_HASH_MISMATCH" };
        }
        gatePayload = { ...stamped, gateInputHash: inputHash, gateBound: bound };
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
      queue.setPayload(task.id, withPhase(gatePayload, "WAITING_FOR_HUMAN_APPROVAL"));
      queue.block(task.id, { reason: "HUMAN_GATE_REQUIRED" });
      return { taskId: task.id, status: "GATED", result, verification: { code: "NOT_VERIFIED" } };
    }
    const verification = verifyDispatch({ kind, result });
    if (!verification.testsPassed || !verification.acceptancePassed) {
      const phase = verification.code === "HUMAN_GATE_REQUIRED" ? "WAITING_FOR_HUMAN_APPROVAL" : "RETRYING";
      queue.setPayload(task.id, withPhase({ ...stamped, verification, error: verification.code }, phase));
      if (verification.code === "HUMAN_GATE_REQUIRED") {
        queue.block(task.id, { reason: verification.code });
        return { taskId: task.id, status: "GATED", result, verification };
      }
      const failed = queue.fail(task.id, { reason: verification.code || "NOT_VERIFIED" });
      if (failed.task?.state === "DEAD_LETTER") {
        queue.setPayload(task.id, withPhase({ ...stamped, verification, error: verification.code }, "FAILED"));
      }
      return { taskId: task.id, status: "FAILED", result, verification };
    }
    queue.setPayload(task.id, withPhase({ ...stamped, verification, finishedAt: new Date().toISOString() }, "COMPLETED"));
    queue.markTests(task.id, {
      testsPassed: verification.testsPassed,
      acceptancePassed: verification.acceptancePassed,
    });
    const done = queue.complete(task.id);
    return { taskId: task.id, status: done.ok ? "COMPLETED" : done.code, result, verification };
  }

  function tick({ workerId = "pusat-worker", limit = 8 } = {}) {
    const bounded = Math.max(0, Math.min(32, Number(limit) || 0));
    queue.registerWorker({ workerId, identity: workerId });
    queue.heartbeat({ workerId });
    queue.recoverCrashed();
    queue.recoverStale();
    const executed = [];
    for (let i = 0; i < bounded; i += 1) {
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

  function handleRequest({ text = "", requester = "suleyman_bey", idempotencyKey = null, voice = false, artifact = null, maxAttempts = 3 } = {}) {
    if (!["suleyman_bey", "pusat"].includes(requester)) {
      return { ok: false, code: "PERMISSION_DENIED", salesEnabled: isSalesEnabled(), live: false };
    }
    if (/genel muhakeme|serbest yorum|open reasoning/i.test(String(text || ""))) {
      const reasoning = consultReasoning();
      const queuedReason = schedule({
        title: "general-reasoning",
        assigneeId: "pusat",
        ownerId: "pusat",
        kind: "REPORT",
        input: {},
        maxAttempts: 0,
        domain: "coordination",
      });
      if (queuedReason.ok && queuedReason.task && !queuedReason.duplicate) {
        queue.fail(queuedReason.task.id, { reason: reasoning.code });
        queue.setPayload(queuedReason.task.id, withPhase({
          ...(queuedReason.task.payload || {}),
          error: reasoning.code,
          answer: null,
          llmCompleted: false,
          basis: "RULE_BASED",
        }, "FAILED"));
      }
      return {
        ok: false,
        code: reasoning.code,
        answer: null,
        llmCompleted: false,
        basis: "RULE_BASED",
        model: reasoning.health,
        taskId: queuedReason.task?.id || null,
        lifecycle: lifecycleOf(queue.get(queuedReason.task?.id)),
        salesEnabled: isSalesEnabled(),
        live: false,
        saas: false,
        pusatDidSpecialistWork: false,
      };
    }
    const classified = classifyRequest(text);
    if (!classified.ok) {
      return { ...classified, purchased: false, salesEnabled: isSalesEnabled(), live: false, pusatDidSpecialistWork: false };
    }
    const attempts = Math.max(1, Math.min(5, Number(maxAttempts) || 1));
    const selected = STAFF_DOMAIN[classified.domain];
    const queued = [];
    for (const id of selected) {
      const duty = STAFF_DUTY[id];
      const kind = classified.domain === "publish" ? "APPROVAL_REQUEST" : duty.kind;
      queued.push(schedule({
        title: `auto-${classified.domain}-${id}`,
        assigneeId: id,
        ownerId: "pusat",
        priority: classified.priority,
        domain: classified.domain,
        kind,
        input: kind === "APPROVAL_REQUEST" ? { action: "BRAND_LIVE_PUBLISH" } : duty.input,
        maxAttempts: attempts,
        idempotencyKey: idempotencyKey ? `${idempotencyKey}:${id}` : null,
      }));
    }
    const fresh = queued.filter((row) => row.ok && !row.duplicate);
    const ran = fresh.length ? tick({ limit: Math.min(32, fresh.length * attempts) }) : { executed: [] };
    const specialists = (ran.executed || []).map((row) => ({
      taskId: row.taskId,
      status: row.status,
      agentId: row.result?.agentId || null,
      kind: row.result?.kind || null,
      verification: row.verification?.code || row.code || null,
      basis: "specialistDispatch",
      execution: "RULE_BASED",
      llmCompleted: false,
      confidence: row.verification?.testsPassed ? "rule_verified" : "unverified",
      error: row.status === "COMPLETED" ? null : row.verification?.code || row.code || null,
      lifecycle: lifecycleOf(queue.get(row.taskId)),
    }));
    let research = null;
    if (classified.domain === "research") {
      research = aslan.coordinate({ topic: "categories", question: String(text).slice(0, 180), sources: [] });
    }
    let next = null;
    if (research && research.report?.verification !== "SOURCED") {
      const follow = schedule({
        title: `auto-research-follow-${selected[0]}`,
        assigneeId: "dogu_bey",
        ownerId: "pusat",
        priority: classified.priority,
        domain: "research",
        kind: "RESEARCH_REQUEST",
        input: STAFF_DUTY.dogu_bey.input,
        maxAttempts: 1,
        idempotencyKey: idempotencyKey ? `${idempotencyKey}:follow` : null,
      });
      const followed = follow.ok && !follow.duplicate ? tick({ limit: 1 }) : { executed: [] };
      const row = followed.executed?.[0] || null;
      next = {
        taskId: row?.taskId || follow.task?.id || null,
        agentId: "dogu_bey",
        status: row?.status || null,
        verified: false,
        reason: "UNVERIFIED",
        lifecycle: lifecycleOf(queue.get(row?.taskId || follow.task?.id)),
      };
    }
    let defense = null;
    if (artifact) {
      const exam = aslan.examine({ artifacts: [artifact] });
      defense = exam.ok ? aslan.handToDefense(exam) : exam;
    }
    const spoken = [];
    if (voice) {
      const { createTtsEngine } = require("../voice/buzzardVoice");
      const { canUse } = require("../buzzardNative/core/capabilityRegistry");
      const tts = createTtsEngine();
      for (const row of specialists) {
        if (!row.taskId) continue;
        if (!canUse(row.agentId, "speech")) {
          spoken.push({ taskId: row.taskId, agentId: row.agentId, audio: false, written: true, speechGranted: false });
          continue;
        }
        const clip = tts.speak({ agentId: row.agentId, text: "rapor", lang: "tr" });
        spoken.push({
          taskId: row.taskId,
          agentId: row.agentId,
          audio: clip.ok === true,
          bytes: clip.bytes || 0,
          written: true,
          officialVoiceUsed: clip.officialVoiceUsed === true,
          network: false,
          placedOnCarrier: false,
        });
      }
    }
    const report = {
      ok: specialists.length === selected.length && specialists.every((row) => row.status === "COMPLETED" || row.status === "GATED"),
      to: "suleyman_bey",
      from: "pusat",
      requester,
      domain: classified.domain,
      priority: classified.priority,
      duplicate: queued.some((row) => row.duplicate),
      specialists,
      research,
      next,
      defense,
      spoken,
      pusatDidSpecialistWork: specialists.some((row) => row.agentId === "pusat" && classified.domain !== "coordination"),
      model: modelGate(),
      salesEnabled: isSalesEnabled(),
      live: false,
      network: false,
      saas: false,
    };
    const memory = createMultiMemory();
    const note = memory.put({
      actorId: "pusat",
      ownerId: "pusat",
      type: "shared_knowledge",
      key: `auto-${classified.domain}`,
      value: { domain: classified.domain, taskIds: specialists.map((row) => row.taskId), at: new Date().toISOString() },
    });
    return { ...report, memory: { ok: note.ok === true, store: memory } };
  }

  function cancel(taskId) {
    const task = queue.get(taskId);
    if (!task) return { ok: false, code: "NOT_FOUND" };
    if (task.state === "COMPLETED") return { ok: false, code: "ALREADY_COMPLETED" };
    queue.setPayload(taskId, withPhase(task.payload || {}, "CANCELLED"));
    const rejected = queue.rejectTerminal(taskId, "CANCELLED");
    return { ...rejected, lifecycle: lifecycleOf(queue.get(taskId)) };
  }

  function dailyReport() {
    const tasks = queue.list().map((task) => ({
      id: task.id,
      assigneeId: task.assigneeId,
      lifecycle: lifecycleOf(task),
      attempts: task.attempts,
      maxAttempts: task.maxAttempts,
      error: task.payload?.error || null,
      startedAt: task.payload?.executedAt || null,
      finishedAt: task.payload?.finishedAt || null,
    }));
    const count = (name) => tasks.filter((row) => row.lifecycle === name).length;
    return {
      ok: true,
      to: "suleyman_bey",
      from: "pusat",
      completed: count("COMPLETED"),
      queued: count("QUEUED") + count("RETRYING") + count("WAITING_FOR_DEPENDENCY"),
      failed: count("FAILED"),
      waitingApproval: count("WAITING_FOR_HUMAN_APPROVAL"),
      cancelled: count("CANCELLED"),
      tasks,
      model: modelGate(),
      salesEnabled: isSalesEnabled(),
      live: false,
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
    handleRequest,
    cancel,
    dailyReport,
    lifecycleOf,
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

module.exports = { createOrchestrator, STAFF_DUTY, STAFF_DOMAIN, LIFECYCLE, classifyRequest };
