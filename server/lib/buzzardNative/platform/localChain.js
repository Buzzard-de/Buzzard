/**
 * In-process think → rules → proto speech → body → motion → hearing energy.
 * Not a live meeting and not official TTS.
 */
const { createNativeRuntime } = require("../runtimeCore");
const { protoSynth } = require("../speech/nativeTts");
const { analyzeOfficialVoice } = require("../speech/voiceIdentity");
const { evaluateAll, answer } = require("../thinking/ruleReasoner");
const { stats } = require("../vision/imageStats");
const { parsePcm16 } = require("../engines/hearing");
const { frameEnergy } = require("../hearing/frames");
const fs = require("fs");

function runLocalTurn({ text = "report.status", actorId = "sinan_bey" } = {}) {
  const rt = createNativeRuntime();
  rt.initializeAll();
  const think = rt.engines.get("thinking").execute({ op: "plan", goal: text });
  const reasoned = answer("official voice status");
  const speech = protoSynth({ text: (think.steps || []).join(" ") || text, lang: "tr" });
  const body = rt.engines.get("digital_body").execute({ op: "set_pose", pose: "speaking" });
  const motion = rt.engines.get("motion").execute({ op: "cue", cue: "speaking" });
  const mem = rt.engines.get("memory").execute({
    op: "put",
    ownerId: actorId,
    actorId,
    key: "last_turn",
    value: text,
    section: "D",
  });
  const wav = require("../speech/wavTone").wavTone({ hz: speech.hz || 170.8, ms: 80 });
  const pcm = parsePcm16(wav.slice(44));
  const hear = frameEnergy(pcm, 8000, 20);
  const voice = analyzeOfficialVoice({ actorId });
  const avatar = stats(fs.readFileSync("public/council/sinan-bey.png"));
  const rules = evaluateAll();
  return {
    ok: think.ok && speech.ok && body.ok && motion.ok && mem.ok && voice.ok,
    live: false,
    officialTts: false,
    clone: false,
    think,
    reasoned,
    speech: { kind: speech.kind, hz: speech.hz, officialVoiceUsed: speech.officialVoiceUsed, bytes: speech.bytes },
    body: { pose: body.pose, lipSync: false },
    motion: { recorded: motion.recorded, rendered: false },
    memory: { stored: mem.stored, intact: true },
    hearing: { voiced: hear.voiced, stt: false },
    vision: { width: avatar.width, height: avatar.height, understanding: false },
    voice: { status: voice.code, ttsReady: voice.ttsReady, f0: voice.profile?.f0Hz?.mean },
    rules: { passed: rules.passed, total: rules.total, generalIntelligence: false },
  };
}

module.exports = { runLocalTurn };
