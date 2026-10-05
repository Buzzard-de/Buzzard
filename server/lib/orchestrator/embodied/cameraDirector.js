const { CAMERAS, EMBODIED_STATE } = require("./constants");

const COOLDOWN_MS = 2500;
const lastBySession = new Map();

function selectCamera(state, { sessionId, userVideoPriority, walking, writing, closeup, cabinet, screen } = {}) {
  if (userVideoPriority) return "FRONT";
  let chosen = "FRONT";
  if (cabinet || state === EMBODIED_STATE.GETTING_DOCUMENT) chosen = walking ? "FOLLOW" : "CABINET";
  else if (walking || state === EMBODIED_STATE.WALKING) chosen = "FOLLOW";
  else if (writing || state === EMBODIED_STATE.WRITING) chosen = closeup ? "CLOSE" : "DESK";
  else if (screen || state === EMBODIED_STATE.USING_COMPUTER) chosen = "SCREEN";
  else if (state === EMBODIED_STATE.SEARCHING) chosen = "OVERHEAD";
  else if (state === EMBODIED_STATE.SPEAKING || state === EMBODIED_STATE.LISTENING) chosen = "MEDIUM";
  const prev = lastBySession.get(sessionId);
  if (prev && prev.camera === chosen && Date.now() - prev.at < COOLDOWN_MS) {
    return prev.camera;
  }
  lastBySession.set(sessionId, { camera: chosen, at: Date.now() });
  return CAMERAS.includes(chosen) ? chosen : "FRONT";
}

function cameraPose(name) {
  const poses = {
    FRONT: { x: 5, y: 1.6, z: -1.2, lookAt: { x: 5, y: 1.2, z: 2 } },
    MEDIUM: { x: 5, y: 1.5, z: -0.4, lookAt: { x: 5, y: 1.2, z: 2 } },
    CLOSE: { x: 5.1, y: 1.35, z: 1.4, lookAt: { x: 5, y: 1.2, z: 2.1 } },
    CLOSEUP: { x: 5.2, y: 1.3, z: 1.6, lookAt: { x: 5, y: 1.2, z: 2.1 } },
    BACK: { x: 5, y: 1.8, z: 11, lookAt: { x: 5, y: 1, z: 6 } },
    LEFT: { x: -1.2, y: 1.7, z: 5, lookAt: { x: 5, y: 1, z: 5 } },
    RIGHT: { x: 11.2, y: 1.7, z: 5, lookAt: { x: 5, y: 1, z: 5 } },
    OVERHEAD: { x: 5, y: 8, z: 5, lookAt: { x: 5, y: 0, z: 5 } },
    FOLLOW: { x: 5, y: 1.8, z: 4, lookAt: { x: 5, y: 1.2, z: 6 } },
    DESK: { x: 5, y: 1.4, z: 0.1, lookAt: { x: 5, y: 0.9, z: 1.4 } },
    CABINET: { x: 3.4, y: 1.5, z: 6.6, lookAt: { x: 3.5, y: 1, z: 8.6 } },
    SCREEN: { x: 4.2, y: 1.5, z: 1.8, lookAt: { x: 5, y: 1.2, z: 0.7 } },
  };
  return poses[name] || poses.FRONT;
}

module.exports = { selectCamera, cameraPose, CAMERAS };
