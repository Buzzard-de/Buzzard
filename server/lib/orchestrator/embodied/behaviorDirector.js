const { compose } = require("./facialAnimationEngine");
const { selectCamera } = require("./cameraDirector");
const { nextIdle } = require("./microBehaviors");

function direct({
  state,
  sessionId,
  userVideoPriority,
  risk,
  failed,
  listening,
  speaking,
  ttsLive,
  speechText,
  walking,
  writing,
  durationMs,
  audioBytes,
  interrupted,
  cabinet,
} = {}) {
  const face = compose({
    state,
    speechText,
    durationMs,
    audioBytes,
    nativeLipSync: false,
    risk,
    failed,
    listening,
    speaking,
    interrupted,
  });
  const camera = selectCamera(state, { sessionId, userVideoPriority, walking, writing, cabinet });
  const idle = speaking ? null : nextIdle({ sessionId, state, speaking, listening });
  return {
    layer: "HOW_LOOK",
    gaze: face.gaze,
    expression: face.expression,
    camera,
    idle,
    lips: face.visemes,
    face,
    timingMs: speaking ? 400 : listening ? 250 : 600,
  };
}

module.exports = { direct };
