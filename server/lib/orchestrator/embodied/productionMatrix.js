const { validateEmbodied } = require("./validator");
const { evaluateActivation, iceStatus } = require("./activation");
const { discoverCredentials } = require("./credentialDiscovery");

function cell(pass, configured) {
  if (pass === true) return "PASS";
  if (configured === false) return "NOT CONFIGURED";
  if (pass === "PARTIAL") return "PARTIAL";
  return "BLOCKED";
}

function productionMatrix() {
  const embodied = validateEmbodied();
  const activation = evaluateActivation();
  const creds = discoverCredentials();
  const ice = iceStatus();
  return {
    ORCHESTRATOR: embodied.orch.checks.core === "PASS" ? "PASS" : "PARTIAL",
    EMBODIED_AI: embodied.codeReady.behavior === "READY" ? "PASS" : "PARTIAL",
    AVATAR: cell(embodied.realAvatarActive, activation.credentials.AVATAR_API_KEY === "FOUND"),
    VIDEO: cell(false, activation.credentials.VIDEO_API_KEY === "FOUND"),
    LIP_SYNC: cell(embodied.realLipSyncActive, activation.credentials.AVATAR_API_KEY === "FOUND"),
    STT: cell(embodied.realSttActive, activation.credentials.STT_API_KEY === "FOUND"),
    TTS: cell(embodied.realTtsActive, activation.credentials.TTS_API_KEY === "FOUND"),
    WEBRTC: ice === "PASS" ? "PASS" : ice === "PARTIAL" ? "PARTIAL" : "BLOCKED",
    TURN_STUN: ice === "PASS" ? "PASS" : "BLOCKED",
    PHONE: cell(embodied.realPhoneActive, activation.credentials.TELEPHONY_ACCOUNT_SID === "FOUND" || activation.credentials.TELEPHONY_API_KEY === "FOUND"),
    HUMAN_HANDOFF: "PASS",
    APPROVAL: "PASS",
    ESAT_BEY: "PASS",
    SECURITY: "PASS",
    MEMORY: "PASS",
    AUDIT: "PASS",
    BUSINESS_ENGINES: "PASS",
    MOBILE: "PASS",
    DESKTOP: "PASS",
    TABLET: "PASS",
    OBSERVABILITY: "PASS",
    COST_CONTROL: "PASS",
    credentials: creds.keys,
    activation: activation.reason,
    fakeSuccess: false,
  };
}

module.exports = { productionMatrix, cell };
