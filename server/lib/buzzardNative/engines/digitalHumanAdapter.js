/**
 * Provider slots for the shared digital body.
 * A missing provider is reported. Nothing here synthesizes speech, video, or motion.
 */
const { createDigitalBodyEngine } = require("./digitalBody");
const { PROFILES } = require("./digitalBodySession");

const PROVIDERS = Object.freeze({
  speech_out: null,
  speech_in: null,
  tts: null,
  lip_sync: null,
  face: null,
  arms: null,
  full_body: null,
  walk_sit: null,
  objects: null,
  wardrobe: null,
});

function profile(name) {
  return PROFILES[name] || null;
}

function run(capability, name) {
  const who = profile(name);
  if (!who) return { ok: false, code: "PROFILE_UNKNOWN", capability, ran: false, rendered: false };
  const provider = PROVIDERS[capability];
  if (!provider) {
    return {
      ok: false,
      code: "PROVIDER_ABSENT",
      capability,
      agentId: who.agentId,
      engine: "digital_body",
      ran: false,
      rendered: false,
      fake: false,
    };
  }
  return provider(who);
}

function open(name) {
  const who = profile(name);
  if (!who) return { ok: false, code: "PROFILE_UNKNOWN" };
  const engine = createDigitalBodyEngine(who);
  engine.initialize();
  const state = engine.execute({ op: "state" });
  return {
    ok: true,
    engine: state.sharedEngine,
    agentId: state.agentId,
    avatar: state.avatar,
    voiceId: state.voiceId,
    rendered: false,
    providers: Object.fromEntries(Object.keys(PROVIDERS).map((key) => [key, PROVIDERS[key] ? "PRESENT" : "ABSENT"])),
  };
}

module.exports = { PROFILES, PROVIDERS, profile, run, open };
