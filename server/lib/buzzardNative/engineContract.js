/**
 * Shared engine contract. Unimplemented ops return NOT_IMPLEMENTED, never fake success.
 */
const { STATUS } = require("./motors");

function createEngine({ id, capabilities = [], executeImpl }) {
  let state = "constructed";
  let crashed = false;
  let calls = 0;
  let faults = 0;
  const startedAt = Date.now();

  function envelope(extra) {
    return {
      engineId: id,
      liveVerified: false,
      pretrainedWeightsPresent: false,
      externalApi: false,
      generalPurposeModel: false,
      ...extra,
    };
  }

  return {
    id,
    initialize() {
      if (crashed) return envelope({ ok: false, code: "NEEDS_RECOVER", status: STATUS.BLOCKED });
      state = "ready";
      return envelope({ ok: true, status: STATUS.CODE_READY, state });
    },
    healthCheck() {
      return envelope({ ok: !crashed && state === "ready", crashed, state, status: crashed ? STATUS.BLOCKED : STATUS.CODE_READY });
    },
    execute(input = {}) {
      calls += 1;
      if (state !== "ready") return envelope({ ok: false, code: "NOT_READY" });
      if (crashed) return envelope({ ok: false, code: "ENGINE_CRASHED" });
      try {
        const result = executeImpl(input, { envelope });
        if (result && result.ok === false) return envelope(result);
        return envelope({ ok: true, ...result });
      } catch (err) {
        crashed = true;
        faults += 1;
        state = "fault";
        return envelope({ ok: false, code: "ENGINE_FAULT", error: String(err.message || err), crashed: true });
      }
    },
    getStatus() {
      return envelope({ state, crashed, status: crashed ? STATUS.BLOCKED : STATUS.CODE_READY });
    },
    getCapabilities() {
      return envelope({ capabilities: [...capabilities] });
    },
    getMetrics() {
      return envelope({ calls, faults, uptimeMs: Date.now() - startedAt });
    },
    shutdown() {
      state = "stopped";
      return envelope({ ok: true, state });
    },
    recover() {
      crashed = false;
      state = "ready";
      return envelope({ ok: true, recovered: true, state });
    },
    _forceCrash() {
      crashed = true;
      state = "fault";
    },
  };
}

function notImplemented(op) {
  return { ok: false, code: "NOT_IMPLEMENTED", op, status: "NOT_IMPLEMENTED" };
}

module.exports = { createEngine, notImplemented, STATUS };
