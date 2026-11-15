const { createNativeRuntime } = require("../runtimeCore");
const { matrix } = require("./engineStatus");
const { identities } = require("./identity");
const { backupStatus } = require("./backup");
const { snapshot } = require("./metrics");
const { whyReasoningFails } = require("../thinking/whyReasoningFails");
const { analyzeOfficialVoice } = require("../speech/voiceIdentity");
const { probeHardware } = require("../thinking/hardwareProbe");
const { costHorizon } = require("../thinking/costHorizon");

function nativeAiStatus() {
  const rt = createNativeRuntime();
  const init = rt.initializeAll();
  return {
    runtime: init,
    health: rt.health(),
    engines: matrix(),
    identities: identities(),
    voice: analyzeOfficialVoice({ actorId: "sinan_bey" }),
    reasoningLimits: whyReasoningFails(),
    backup: backupStatus(),
    hardware: probeHardware(),
    cost: costHorizon(),
    metrics: snapshot(),
    liveVerified: false,
    productionReady: false,
    singlePercentComplete: null,
    note: "No blended fake completion percentage.",
  };
}

function engineHealth() {
  const rt = createNativeRuntime();
  rt.initializeAll();
  return rt.health();
}

module.exports = { nativeAiStatus, engineHealth };
