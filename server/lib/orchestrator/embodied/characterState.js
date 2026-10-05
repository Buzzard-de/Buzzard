const { redactObject } = require("../securityGuard");

function createCharacterState(seed = {}) {
  return redactObject({
    posture: seed.posture || "standing",
    position: seed.position || { x: 5, y: 0, z: 2.5 },
    orientation: seed.orientation || 0,
    currentTask: null,
    currentObject: null,
    currentLocation: "CENTER",
    emotionalTone: "professional",
    attentionTarget: "CAMERA",
    speaking: false,
    listening: false,
    busy: false,
    availability: "available",
    energyState: "normal",
    lastAction: null,
    nextAction: null,
  });
}

function applyCharacterPatch(state, patch = {}) {
  const forbidden = ["password", "cvv", "cardNumber", "token", "secret", "videoFrame", "faceEmbedding"];
  const next = { ...state };
  for (const [key, value] of Object.entries(patch)) {
    if (forbidden.includes(key)) continue;
    next[key] = value;
  }
  return redactObject(next);
}

module.exports = {
  createCharacterState,
  applyCharacterPatch,
};
