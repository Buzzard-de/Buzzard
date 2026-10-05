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
const openaiRealtime = require("./providers/openaiRealtime");
const twilioIce = require("./providers/twilioIce");
const { validateProduction } = require("./productionValidator");
const embodied = require("./embodied");

function status() {
  const f = flags.getFlags();
  const production = validateProduction();
  return {
    name: "buzzard-maximum-orchestrator",
    enabled: f.ORCHESTRATOR_ENABLED,
    flags: f,
    channels: {
      text: f.ORCHESTRATOR_ENABLED,
      voice: f.VOICE_ENABLED,
      phone: f.PHONE_ENABLED,
      webrtc: f.VOICE_WEBRTC_ENABLED || f.WEBRTC_ENABLED,
      video: f.VIDEO_ENABLED,
      avatar: f.AVATAR_ENABLED,
      embodied: f.EMBODIED_AI_ENABLED,
    },
    providers: {
      ai: require("./providers/ai").health(),
      stt: stt.health(),
      tts: tts.health(),
      telephony: telephony.health(),
      webrtc: webrtc.health(),
      openaiRealtime: openaiRealtime.health(),
      twilioIce: twilioIce.inspect().status,
      avatar: embodied.avatarProvider.health(),
    },
    realPhoneCalls: telephony.liveAllowed(),
    inspect: require("./providers/health").inspectAll(),
    production,
    realSttActive: Boolean(production.realSttActive),
    realTtsActive: Boolean(production.realTtsActive),
    realPhoneActive: Boolean(production.realPhoneActive),
    realAvatarActive: false,
    realTimeVideoActive: false,
    embodied: embodied.validator.validateEmbodied(),
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
  openaiRealtime,
  twilioIce,
  acceptEvent,
  status,
  validateProduction,
  embodied,
};
