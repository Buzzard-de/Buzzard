const { EMBODIED_STATE } = require("./constants");

const TARGETS = Object.freeze(["USER", "CAMERA", "SCREEN", "DOCUMENT", "OBJECT", "DOOR", "PHONE"]);

function gazeForState(state, extras = {}) {
  if (extras.target && TARGETS.includes(extras.target)) return extras.target;
  switch (state) {
    case EMBODIED_STATE.SPEAKING:
    case EMBODIED_STATE.LISTENING:
    case EMBODIED_STATE.WAITING:
      return "USER";
    case EMBODIED_STATE.READING:
    case EMBODIED_STATE.GETTING_DOCUMENT:
      return extras.objectType === "DOCUMENT" ? "DOCUMENT" : "OBJECT";
    case EMBODIED_STATE.USING_COMPUTER:
    case EMBODIED_STATE.WRITING:
      return "SCREEN";
    case EMBODIED_STATE.USING_PHONE:
      return "PHONE";
    case EMBODIED_STATE.WALKING:
    case EMBODIED_STATE.SEARCHING:
      return extras.targetId === "door" ? "DOOR" : "OBJECT";
    case EMBODIED_STATE.THINKING:
      return extras.lookAtScreen ? "SCREEN" : "USER";
    default:
      return "CAMERA";
  }
}

module.exports = { TARGETS, gazeForState };
