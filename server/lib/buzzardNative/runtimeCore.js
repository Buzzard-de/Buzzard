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

const ACTORS = Object.freeze(["sinan_bey", "pusat", "esat_bey", "dogu_bey", ...registeredAgents().filter((id) => !["sinan_bey", "pusat", "esat_bey", "dogu_bey"].includes(id))]);

function createNativeRuntime({ maxJobs = 8 } = {}) {
  const engines = new Map();
  const queue = [];
  const bus = [];
  const audit = [];
  const models = [];
  const context = new Map();
  let jobs = 0;

  function log(kind, payload) {
    const row = { id: `nai_${crypto.randomBytes(4).toString("hex")}`, kind, at: new Date().toISOString(), payload };
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

  function publish({ fromId, toId, topic, body, taskId, classification = "public", clearance = "shared" }) {
    const msg = {
      fromEngine: fromId,
      toEngine: toId,
      fromId,
      toId,
      topic,
      body,
      taskId: taskId || `t_${crypto.randomBytes(3).toString("hex")}`,
      at: new Date().toISOString(),
      clearance,
      classification,
      result: "queued",
    };
    bus.push(msg);
    log("bus.publish", { fromId, toId, topic, taskId: msg.taskId, classification });
    return { ok: true, queued: true, live: false, message: msg };
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
    const task = { id: `nq_${crypto.randomBytes(4).toString("hex")}`, engineId, actorId, payload, status: "queued" };
    queue.push(task);
    log("queue.enqueue", { id: task.id, engineId });
    return { ok: true, task };
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
