const { EXPRESSIONS } = require("./constants");
const { expressionFor } = require("./expression");
const { gazeForState } = require("./gaze");
const viseme = require("./visemeEngine");

function blinkSchedule(durationMs, seed = 1) {
  const out = [];
  let t = 1800 + (seed % 400);
  while (t < durationMs) {
    out.push({ atMs: t, durationMs: 80 });
    t += 2800 + (seed % 700);
  }
  return out;
}

function compose({
  state,
  speechText,
  durationMs,
  audioBytes,
  sampleRate,
  nativeLipSync,
  risk,
  failed,
  listening,
  speaking,
  interrupted,
} = {}) {
  if (interrupted) {
    return {
      expression: "listening",
      gaze: "USER",
      visemes: viseme.silence(),
      blinks: [],
      brow: 0.1,
      head: 0,
      micro: "none",
      exaggerated: false,
    };
  }
  const lips = speaking
    ? viseme.buildTimeline({ text: speechText, durationMs, audioBytes, sampleRate, nativeLipSync })
    : viseme.silence();
  return {
    expression: expressionFor(state, { risk, failed, listening }),
    gaze: gazeForState(state, { lookAtScreen: state === "THINKING" && !speaking }),
    visemes: lips,
    blinks: blinkSchedule(lips.durationMs || 1200, (speechText || "").length),
    brow: state === "THINKING" ? 0.25 : 0.1,
    head: speaking ? 0.08 : 0.03,
    micro: listening ? "nod" : "none",
    exaggerated: false,
    catalog: EXPRESSIONS,
  };
}

module.exports = { compose, blinkSchedule };
