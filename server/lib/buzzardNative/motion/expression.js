const EXPRESSIONS = Object.freeze(["neutral", "listening", "thinking", "speaking", "idle_blink"]);
const { schedule } = require("./visemeSchedule");
const { protoSynth } = require("../speech/nativeTts");

function setExpression(name) {
  if (!EXPRESSIONS.includes(name)) return { ok: false, code: "UNKNOWN_EXPRESSION", body3d: false };
  return { ok: true, expression: name, body3d: false, mesh: false };
}

function idleTick(ms = 16) {
  return { ok: true, at: ms, motion: "micro_idle", rendered: false, fpsTarget: 60 };
}

function speechSync(text, lang = "tr") {
  const t0 = process.hrtime.bigint();
  const speech = protoSynth({ text, lang });
  const vis = schedule(speech.phonemes || [], 40);
  const genMs = Number(process.hrtime.bigint() - t0) / 1e6;
  const wavMs = Math.max(1, ((speech.bytes || 44) - 44) / 8);
  return {
    ok: true,
    expression: "speaking",
    visemes: vis.events.length,
    wavMs,
    timelineMs: vis.events.length * 40,
    genMs,
    lipSyncPass: false,
    pixelAligned: false,
    body3d: false,
    note: "timeline_duration_vs_wav_bytes_not_video_lip_sync",
  };
}

module.exports = { setExpression, idleTick, speechSync, EXPRESSIONS };
