/**
 * One shared body engine, separate profiles.
 * A capability is ready only when this process actually runs it.
 */
const { createDigitalBodyEngine } = require("./digitalBody");

const CAPABILITIES = Object.freeze([
  "speech_out",
  "speech_in",
  "tts",
  "lip_sync",
  "expression",
  "arm_gesture",
  "full_body_animation",
  "stand_and_walk",
  "sit_and_stand",
  "object_interaction",
  "wardrobe",
  "separate_profile",
]);

function audit(profile = {}) {
  const engine = createDigitalBodyEngine(profile);
  engine.initialize();
  const state = engine.execute({ op: "state" });
  const expression = engine.execute({ op: "expression", expression: profile.expression || "neutral" });
  const lip = engine.execute({ op: "lip_sync" });
  const animation = engine.execute({ op: "animate" });
  const rows = {
    speech_out: { status: "NOT_IMPLEMENTED", ran: false },
    speech_in: { status: "NOT_IMPLEMENTED", ran: false },
    tts: { status: state.ttsReady === true ? "CODE_READY" : "NOT_IMPLEMENTED", ran: false },
    lip_sync: { status: lip.ok === false ? "NOT_IMPLEMENTED" : "CODE_READY", ran: lip.ok === true },
    expression: { status: expression.ok === true && expression.body3d === false ? "CODE_READY" : "NOT_IMPLEMENTED", ran: expression.ok === true },
    arm_gesture: { status: "NOT_IMPLEMENTED", ran: false },
    full_body_animation: { status: animation.ok === false ? "NOT_IMPLEMENTED" : "CODE_READY", ran: animation.ok === true },
    stand_and_walk: { status: "NOT_IMPLEMENTED", ran: false },
    sit_and_stand: { status: "NOT_IMPLEMENTED", ran: false },
    object_interaction: { status: "NOT_IMPLEMENTED", ran: false },
    wardrobe: { status: "NOT_IMPLEMENTED", ran: false },
    separate_profile: {
      status: state.sharedEngine === "digital_body" && state.agentId ? "CODE_READY" : "NOT_IMPLEMENTED",
      ran: true,
      agentId: state.agentId,
      avatar: state.avatar,
      voiceId: state.voiceId,
    },
  };
  return {
    engine: "digital_body",
    shared: true,
    profile: { agentId: state.agentId, avatar: state.avatar, voiceId: state.voiceId },
    capabilities: rows,
    ready: CAPABILITIES.filter((name) => rows[name].status === "CODE_READY"),
    missing: CAPABILITIES.filter((name) => rows[name].status !== "CODE_READY"),
  };
}

module.exports = { CAPABILITIES, audit };
