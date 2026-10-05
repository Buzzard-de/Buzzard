const { gazeForState } = require("./gaze");
const { expressionFor } = require("./expression");
const { selectCamera } = require("./cameraDirector");
const { nextIdle } = require("./microBehaviors");
const { syncWithAudio } = require("./lipSync");

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
} = {}) {
  const gaze = gazeForState(state, { lookAtScreen: state === "THINKING" && !speaking });
  const expression = expressionFor(state, { risk, failed, listening });
  const camera = selectCamera(state, { sessionId, userVideoPriority, walking, writing });
  const idle = speaking ? null : nextIdle({ sessionId, state, speaking, listening });
  const lips = speaking ? syncWithAudio({ text: speechText, audioPresent: Boolean(ttsLive), ttsLive }) : { viseme: "sil" };
  return {
    layer: "HOW_LOOK",
    gaze,
    expression,
    camera,
    idle,
    lips,
    timingMs: speaking ? 400 : listening ? 250 : 600,
  };
}

module.exports = { direct };
