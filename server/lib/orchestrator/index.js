const flags = require("./flags");
const constants = require("./constants");
const { handleRequest, dashboard, executeTool, userFacingError } = require("./core");
const { classifyIntent } = require("./intentEngine");
const { listAgents, routeAgent, AGENTS } = require("./agentRegistry");
const { listTools, getTool } = require("./toolRegistry");
const conversations = require("./conversationManager");
const tasks = require("./taskManager");
const memory = require("./memoryManager");
const approvals = require("./approvalManager");
const voice = require("./voiceSession");
const phone = require("./phoneSession");
const stt = require("./providers/stt");
const tts = require("./providers/tts");
const telephony = require("./providers/telephony");
const { acceptEvent } = require("./webhookSecurity");
const webrtc = require("./providers/webrtc");
const { validateProduction } = require("./productionValidator");

function status() {
  const f = flags.getFlags();
  return {
    name: "buzzard-maximum-orchestrator",
    enabled: f.ORCHESTRATOR_ENABLED,
    flags: f,
    channels: {
      text: f.ORCHESTRATOR_ENABLED,
      voice: f.VOICE_ENABLED,
      phone: f.PHONE_ENABLED,
      webrtc: f.VOICE_WEBRTC_ENABLED,
    },
    providers: {
      ai: require("./providers/ai").health(),
      stt: stt.health(),
      tts: tts.health(),
      telephony: telephony.health(),
      webrtc: webrtc.health(),
    },
    realPhoneCalls: telephony.liveAllowed(),
    realSttActive: stt.configured() && stt.lastLiveSuccess(),
    realTtsActive: tts.configured() && tts.lastLiveSuccess(),
    realPhoneActive: telephony.liveAllowed() && telephony.lastLiveSuccess(),
    production: validateProduction(),
  };
}

module.exports = {
  flags,
  constants,
  handleRequest,
  dashboard,
  executeTool,
  userFacingError,
  classifyIntent,
  listAgents,
  routeAgent,
  AGENTS,
  listTools,
  getTool,
  conversations,
  tasks,
  memory,
  approvals,
  voice,
  phone,
  stt,
  tts,
  telephony,
  webrtc,
  acceptEvent,
  status,
  validateProduction,
};
