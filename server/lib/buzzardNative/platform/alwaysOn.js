const { probeHardware } = require("../thinking/hardwareProbe");

function design() {
  const hw = probeHardware();
  const ramGiB = typeof hw.ramBytes === "number" ? hw.ramBytes / 1024 ** 3 : 0;
  const enoughForLlm = hw.cuda === true && ramGiB >= 24;
  return {
    processMonitor: "CODE_READY",
    autoRestart: "CODE_READY",
    healthCheck: "TESTED",
    logs: "CODE_READY",
    alerts: "NOT_IMPLEMENTED",
    safeUpdate: "NOT_IMPLEMENTED",
    backup: "PARTIAL",
    restore: "PARTIAL",
    powerRecovery: "NOT_IMPLEMENTED",
    resourceTrack: "CODE_READY",
    alwaysOnHost: "NOT_IMPLEMENTED",
    liveVerified: false,
    hardware: hw,
    sufficientForGeneralLlm: enoughForLlm,
    sufficientForRuleRuntime: ramGiB >= 1 && hw.cpuCores >= 1,
    purchase: false,
  };
}

function createSupervisorRuntime() {
  let running = false;
  let restarts = 0;
  let lastHealth = null;
  function health() {
    lastHealth = { ok: true, running, restarts, at: Date.now(), live: false };
    return lastHealth;
  }
  function start() {
    running = true;
    return health();
  }
  function crash() {
    running = false;
    restarts += 1;
    running = true;
    return health();
  }
  function stop() {
    running = false;
    return health();
  }
  return { start, crash, stop, health, status: () => ({ running, restarts, liveVerified: false, alwaysOnHost: false }) };
}

module.exports = { design, createSupervisorRuntime };
