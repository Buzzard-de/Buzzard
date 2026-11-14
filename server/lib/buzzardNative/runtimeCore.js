/**
 * Buzzard Native AI Runtime. In-process, no external model host.
 * One engine fault must not stop the others.
 */
const crypto = require("crypto");
const { catalog } = require("./motors");
const { createThinkingEngine } = require("./engines/thinking");
const { createHearingEngine } = require("./engines/hearing");
const { createSpeechEngine } = require("./engines/speech");
const { createVisionEngine } = require("./engines/vision");
const { createMemoryEngine } = require("./engines/memory");
const { createDigitalBodyEngine } = require("./engines/digitalBody");
const { createMotionEngine } = require("./engines/motion");
const { createRealtimeEngine } = require("./engines/realtime");
const { evaluateEgress } = require("../security/egressPolicy");
const { ids: registeredAgents } = require("./core/identityRegistry");
const { redact } = require("../privacyRedact");

const ACTORS = Object.freeze(["sinan_bey", "pusat", "esat_bey", "dogu_bey", ...registeredAgents().filter((id) => !["sinan_bey", "pusat", "esat_bey", "dogu_bey"].includes(id))]);

function createNativeRuntime({ maxJobs = 8 } = {}) {
  const engines = new Map();
  const queue = [];
  const bus = [];
  const audit = [];
  const models = [];
  const context = new Map();
  const seenPublish = new Map();
  let jobs = 0;

  function log(kind, payload) {
    const row = {
      id: `nai_${crypto.randomBytes(4).toString("hex")}`,
      kind,
      at: new Date().toISOString(),
      payload: redact(payload),
      result: payload && payload.result ? payload.result : "UNKNOWN",
    };
    audit.push(row);
    return row;
  }

  function registerDefaults() {
    [
      createThinkingEngine(),
      createHearingEngine(),
      createSpeechEngine(),
      createVisionEngine(),
      createMemoryEngine(),
      createDigitalBodyEngine(),
      createMotionEngine(),
      createRealtimeEngine(),
    ].forEach((e) => engines.set(e.id, e));
  }

  registerDefaults();

  function initializeAll() {
    const results = {};
    for (const [id, e] of engines) {
      try {
        results[id] = e.initialize();
      } catch (err) {
        results[id] = { ok: false, engineId: id, isolated: true, error: String(err.message || err) };
      }
    }
    log("runtime.init", { engines: Object.keys(results) });
    return { ok: true, results, liveVerified: false };
  }

  function health() {
    const per = {};
    for (const [id, e] of engines) per[id] = e.healthCheck();
    return {
      ok: Object.values(per).some((h) => h.ok),
      allOk: Object.values(per).every((h) => h.ok),
      engines: per,
      queue: queue.length,
      jobs,
      models: models.length,
      liveVerified: false,
    };
  }

  function publish(input = {}) {
    const {
      fromId,
      toId,
      topic,
      body,
      taskId,
      classification = "public",
      clearance = "shared",
    } = input;
    const key = input.idempotencyKey || taskId || null;
    if (key && seenPublish.has(key)) {
      return {
        ok: false,
        status: "UNKNOWN",
        code: "DUPLICATE_EVENT",
        duplicate: true,
        queued: false,
        sent: false,
        deliveryConfirmed: false,
        customerNotified: false,
        live: false,
        commercial: false,
        message: null,
      };
    }
    let status = "UNKNOWN";
    let code = "IN_PROCESS_NOT_DELIVERY";
    if (input.timeout === true || input.forceTimeout === true) {
      status = "FAILED";
      code = "TIMEOUT";
    } else if (input.networkError === true) {
      status = "FAILED";
      code = "NETWORK_ERROR";
    } else if (input.mock === true || input.demo === true) {
      status = "BLOCKED_EXTERNAL";
      code = "MOCK_NOT_LIVE";
    } else if (["shipment", "tracking", "delivery", "notification", "email", "sms", "whatsapp", "refund", "order"].includes(String(topic || ""))) {
      status = "BLOCKED_EXTERNAL";
      code = "PROVIDER_NOT_LIVE";
    }
    const msg = {
      fromEngine: fromId,
      toEngine: toId,
      fromId,
      toId,
      topic,
      body: redact(body),
      taskId: taskId || `t_${crypto.randomBytes(3).toString("hex")}`,
      at: new Date().toISOString(),
      clearance,
      classification,
      result: status,
      customerNotified: false,
    };
    bus.push(msg);
    if (key) seenPublish.set(key, code);
    log("bus.publish", {
      fromId,
      toId,
      topic,
      taskId: msg.taskId,
      classification,
      result: "blocked",
      code,
      status,
    });
    return {
      ok: false,
      status,
      code,
      queued: false,
      sent: false,
      deliveryConfirmed: false,
      customerNotified: false,
      live: false,
      mock: input.mock === true || input.demo === true,
      commercial: false,
      callerFlagIgnored: Boolean(input.sent === true || input.delivered === true || input.acknowledged === true || input.live === true),
      message: msg,
    };
  }

  function enqueue({ engineId, actorId, payload }) {
    if (!ACTORS.includes(actorId)) {
      log("permission.denied", { actorId, engineId });
      return { ok: false, code: "UNAUTHORIZED_ACTOR" };
    }
    if (!engines.has(engineId)) return { ok: false, code: "UNKNOWN_ENGINE" };
    if (jobs >= maxJobs) return { ok: false, code: "RESOURCE_LIMIT" };
    if (payload && payload.destinationUrl) {
      const eg = evaluateEgress({ destinationUrl: payload.destinationUrl, payload: payload.egressPayload || {} });
      if (!eg.allowed) {
        log("egress.denied", { actorId, engineId, code: eg.code });
        return { ok: false, code: "EGRESS_DENIED", egress: eg };
      }
    }
    const task = {
      id: `nq_${crypto.randomBytes(4).toString("hex")}`,
      engineId,
      actorId,
      payload: redact(payload),
      status: "queued",
      customerNotified: false,
      sent: false,
      live: false,
    };
    queue.push(task);
    log("queue.enqueue", { id: task.id, engineId, result: "UNKNOWN" });
    return { ok: true, task, customerNotified: false, sent: false, live: false, commercial: false };
  }

  function runNext() {
    const task = queue.shift();
    if (!task) return { ok: false, code: "QUEUE_EMPTY" };
    jobs += 1;
    const engine = engines.get(task.engineId);
    let result;
    try {
      result = engine.execute({ ...task.payload, actorId: task.actorId });
    } catch (err) {
      result = { ok: false, code: "ISOLATED_THROW", error: String(err.message || err), engineId: task.engineId };
    }
    jobs -= 1;
    task.status = result.ok ? "done" : "failed";
    log("queue.run", { id: task.id, engineId: task.engineId, ok: result.ok, code: result.code || null });
    return { ok: Boolean(result.ok), task, result, othersHealthy: health().engines };
  }

  function recover(engineId) {
    const e = engines.get(engineId);
    if (!e) return { ok: false, code: "UNKNOWN_ENGINE" };
    return e.recover();
  }

  function shutdownAll() {
    const results = {};
    for (const [id, e] of engines) results[id] = e.shutdown();
    return { ok: true, results };
  }

  function snapshot() {
    return {
      catalog: catalog(),
      health: health(),
      models,
      busLength: bus.length,
      audit: audit.slice(-20),
      contextKeys: [...context.keys()],
      liveVerified: false,
    };
  }

  return {
    initializeAll,
    health,
    enqueue,
    runNext,
    publish,
    recover,
    shutdownAll,
    snapshot,
    engines,
    log,
    audit,
    bus,
    models,
  };
}

module.exports = { createNativeRuntime, ACTORS };
